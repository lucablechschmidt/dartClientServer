import { z } from "zod";
import type { MatchStatus } from "@/db/repository";
import type { RoundFormat, StoredTournament } from "@/db/tournament-repository";
import type { Session } from "@/domain/player";
import { matchResult, type InputMode, type MatchFormat, type PlayerId, type Rules } from "@/domain/game";
import {
  draw,
  resolve,
  standings,
  TOURNAMENT_FORMATS,
  tournamentWinner,
  type FixtureResult,
  type ResolvedFixture,
  type StandingRow,
  type TournamentFormat,
} from "@/domain/tournament";
import type { Deps } from "./deps";
import { createMatch, rulesSchema } from "./match-service";
import { formatOf, planOf } from "./tournament-plan";

const formatSchema = z.object({ legsToWinSet: z.number().int().min(1).max(9), setsToWinMatch: z.number().int().min(1).max(9) });

export const newTournamentSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    format: z.enum(TOURNAMENT_FORMATS),
    playerIds: z.array(z.string().min(1)).min(2).max(32),
    groups: z.number().int().min(1).max(4).default(1),
    advance: z.union([z.literal(1), z.literal(2), z.literal(4)]).default(2),
    rules: rulesSchema,
    inputMode: z.enum(["single", "per-player"]).default("single"),
    /** Group phase (and a plain round robin). */
    groupFormat: formatSchema.default({ legsToWinSet: 1, setsToWinMatch: 1 }),
    /** One per knockout round, first round first; missing rounds take the last one. */
    knockoutFormats: z.array(formatSchema).default([]),
  })
  .refine((t) => t.format !== "groups-knockout" || t.playerIds.length >= t.groups * 2, { message: "every group needs two players" })
  .refine((t) => t.format !== "groups-knockout" || Math.floor(t.playerIds.length / t.groups) >= t.advance, {
    message: "more qualifiers than players in a group",
  })
  .refine((t) => t.format !== "groups-knockout" || t.groups * t.advance >= 2, { message: "the knockout needs two qualifiers" });
export type NewTournamentInput = z.input<typeof newTournamentSchema>;

export type TournamentError = "not-found" | "forbidden" | "already-started" | "not-ready";

/** Random integer in [0, n) from the injected random bytes, for the draw (deterministic in tests). */
const randomInt = (deps: Deps) => (n: number) => {
  const b = deps.random(4);
  return (((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0) % n;
};

const mayManage = (t: StoredTournament, session: Session) => session.isAdmin || t.createdBy === session.playerId;

/** Any logged-in player may create a tournament; the seed list is drawn (m9-plan §9, until M8 brings Elo). */
export function createTournament(deps: Deps, session: Session, raw: NewTournamentInput): string {
  const input = newTournamentSchema.parse(raw);
  const id = deps.newId();
  const formats: RoundFormat[] = [
    { phase: "group", round: 0, ...input.groupFormat },
    ...input.knockoutFormats.map((f, i) => ({ phase: "knockout" as const, round: i + 1, ...f })),
  ];
  deps.tournaments.createTournament({
    id,
    name: input.name,
    format: input.format,
    groupCount: input.format === "groups-knockout" ? input.groups : 1,
    advancePerGroup: input.advance,
    rules: input.rules,
    inputMode: input.inputMode,
    createdBy: session.playerId,
    createdAt: deps.now(),
    seeds: draw(input.playerIds, randomInt(deps)),
    roundFormats: formats,
  });
  return id;
}

export type TournamentFixture = ResolvedFixture & {
  matchId: string | null;
  /** Status of the linked match; a cancelled one counts as not played. */
  matchStatus: MatchStatus | null;
  /** Legs won by a and b once the fixture has a result. */
  legs: [number, number] | null;
  format: MatchFormat;
};

export type TournamentView = {
  id: string;
  name: string;
  format: TournamentFormat;
  groupCount: number;
  advancePerGroup: number;
  rules: Rules;
  inputMode: InputMode;
  createdAt: number;
  /** In seed order. */
  players: { id: PlayerId; name: string }[];
  fixtures: TournamentFixture[];
  /** Tables of the group phase (a round robin is group 1). */
  groups: { group: number; rows: StandingRow[] }[];
  winner: PlayerId | null;
  canRedraw: boolean;
  canDelete: boolean;
};

function linkedMatches(deps: Deps, t: StoredTournament) {
  return new Map(
    t.links.flatMap((l) => {
      const m = deps.matches.loadMatch(l.matchId);
      return m && m.status !== "abandoned" ? [[l.fixtureId, m] as const] : [];
    }),
  );
}

function resultsOf(matches: ReturnType<typeof linkedMatches>): FixtureResult[] {
  return [...matches].flatMap(([fixtureId, m]) => {
    if (m.status !== "finished") return [];
    const r = matchResult(m.state);
    return r.winner ? [{ fixtureId, winner: r.winner, legs: r.legs, averages: r.averages }] : [];
  });
}

export function loadTournamentView(deps: Deps, session: Session, id: string): TournamentView | null {
  const t = deps.tournaments.loadTournament(id);
  if (!t) return null;
  const plan = planOf(t);
  const matches = linkedMatches(deps, t);
  const results = resultsOf(matches);
  const fixtures = resolve(plan, results).map((f): TournamentFixture => {
    const m = matches.get(f.id);
    const r = results.find((x) => x.fixtureId === f.id);
    return {
      ...f,
      matchId: m?.id ?? null,
      matchStatus: m?.status ?? null,
      legs: r && f.a && f.b ? [r.legs[f.a] ?? 0, r.legs[f.b] ?? 0] : null,
      format: formatOf(t.roundFormats, f),
    };
  });
  const groupNumbers = [...new Set(plan.fixtures.filter((f) => f.phase === "group").map((f) => f.group ?? 1))];
  return {
    id: t.id,
    name: t.name,
    format: t.format,
    groupCount: t.groupCount,
    advancePerGroup: t.advancePerGroup,
    rules: t.rules,
    inputMode: t.inputMode,
    createdAt: t.createdAt,
    players: t.seeds.map((p) => ({ id: p.id, name: p.name })),
    fixtures,
    groups: groupNumbers.map((group) => ({ group, rows: standings(plan, results, group) })),
    winner: tournamentWinner(plan, results),
    canRedraw: mayManage(t, session) && matches.size === 0,
    canDelete: mayManage(t, session),
  };
}

export type TournamentSummary = {
  id: string;
  name: string;
  format: TournamentFormat;
  players: string[];
  createdAt: number;
  winner: string | null;
};

/** The tournament list, newest first, with the winner's name once decided. */
export function listTournaments(deps: Deps): TournamentSummary[] {
  return deps.tournaments.listTournaments().map((t) => {
    const winner = tournamentWinner(planOf(t), resultsOf(linkedMatches(deps, t)));
    return {
      id: t.id,
      name: t.name,
      format: t.format,
      players: t.seeds.map((p) => p.name),
      createdAt: t.createdAt,
      winner: t.seeds.find((p) => p.id === winner)?.name ?? null,
    };
  });
}

/** A new draw of the seed list, by the creator or an admin, only before the first game started. */
export function redrawTournament(deps: Deps, session: Session, id: string): { ok: true } | { ok: false; reason: TournamentError } {
  const t = deps.tournaments.loadTournament(id);
  if (!t) return { ok: false, reason: "not-found" };
  if (!mayManage(t, session)) return { ok: false, reason: "forbidden" };
  if (linkedMatches(deps, t).size > 0) return { ok: false, reason: "already-started" };
  deps.tournaments.setSeeds(
    id,
    draw(
      t.seeds.map((p) => p.id),
      randomInt(deps),
    ),
  );
  return { ok: true };
}

/**
 * "Spielen": the match of a fixture whose players are known. A running or finished match is reused;
 * otherwise (none yet, or the last one was cancelled) a new X01 match with the tournament's rules and
 * the fixture's best of is created and linked. Any logged-in player may start one.
 */
export function startFixture(
  deps: Deps,
  session: Session,
  id: string,
  fixtureId: string,
): { ok: true; matchId: string } | { ok: false; reason: TournamentError } {
  const t = deps.tournaments.loadTournament(id);
  if (!t) return { ok: false, reason: "not-found" };
  const matches = linkedMatches(deps, t);
  const existing = matches.get(fixtureId);
  if (existing) return { ok: true, matchId: existing.id };
  const fixture = resolve(planOf(t), resultsOf(matches)).find((f) => f.id === fixtureId);
  if (!fixture) return { ok: false, reason: "not-found" };
  const { a, b } = fixture;
  if (fixture.status !== "ready" || !a || !b) return { ok: false, reason: "not-ready" };
  return deps.transaction(() => {
    const matchId = createMatch(deps, {
      mode: "x01",
      playerIds: [a, b],
      rules: t.rules,
      format: formatOf(t.roundFormats, fixture),
      inputMode: t.inputMode,
      hostPlayerId: session.playerId,
      isTournament: true,
    });
    deps.tournaments.linkMatch(id, fixtureId, matchId);
    return { ok: true as const, matchId };
  });
}

/** Deleting keeps the matches as ordinary matches; creator or admin only. */
export function deleteTournament(deps: Deps, session: Session, id: string): { ok: true } | { ok: false; reason: TournamentError } {
  const t = deps.tournaments.loadTournament(id);
  if (!t) return { ok: false, reason: "not-found" };
  if (!mayManage(t, session)) return { ok: false, reason: "forbidden" };
  deps.tournaments.deleteTournament(id);
  return { ok: true };
}

/** The tournament a match belongs to, for the way back from the victory screen. */
export const tournamentOfMatch = (deps: Deps, matchId: string): string | null =>
  deps.tournaments.fixtureOfMatch(matchId)?.tournamentId ?? null;
