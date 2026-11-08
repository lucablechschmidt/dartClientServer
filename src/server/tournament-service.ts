import { z } from "zod";
import type { LoadedMatch, MatchStatus } from "@/db/repository";
import type { RoundFormat, StoredTournament, TournamentSeeding } from "@/db/tournament-repository";
import type { Session } from "@/domain/player";
import { matchResult, type InputMode, type MatchFormat, type PlayerId, type Rules } from "@/domain/game";
import {
  draw,
  drawVariants,
  randomIntFrom,
  redraw,
  resolve,
  standings,
  TOURNAMENT_FORMATS,
  tournamentWinner,
  withWalkovers,
  type FixtureResult,
  type ResolvedFixture,
  type StandingRow,
  type TournamentFormat,
} from "@/domain/tournament";
import type { Deps } from "./deps";
import { shownName } from "./player-names";
import { createMatch, MAX_TO_WIN, rulesSchema } from "./match-service";
import { drawInputOf, formatOf, planOf } from "./tournament-plan";

const formatSchema = z.object({
  legsToWinSet: z.number().int().min(1).max(MAX_TO_WIN),
  setsToWinMatch: z.number().int().min(1).max(MAX_TO_WIN),
});

export const newTournamentSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    format: z.enum(TOURNAMENT_FORMATS),
    playerIds: z.array(z.string().min(1)).min(2).max(32),
    groups: z.number().int().min(1).max(4).default(1),
    advance: z.union([z.literal(1), z.literal(2), z.literal(4)]).default(2),
    rules: rulesSchema,
    inputMode: z.enum(["single", "per-player"]).default("single"),
    /** M8: drawn, or the order the players were tapped. */
    seeding: z.enum(["random", "fixed"]).default("random"),
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

/** Uniform random integer in [0, n) from the injected random bytes (crypto on the server, seeded in tests). */
const randomInt = (deps: Deps) => randomIntFrom(deps.random);

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
    seeding: input.seeding,
    createdBy: session.playerId,
    createdAt: deps.now(),
    seeds: input.seeding === "fixed" ? input.playerIds : draw(input.playerIds, randomInt(deps)),
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
  /** Decided without a game: a player was deleted. */
  walkover: boolean;
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
  seeding: TournamentSeeding;
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

/** The tournament's games by fixture, cancelled ones left out; `loaded` when the caller already has them (R-01). */
function linkedMatches(deps: Deps, t: StoredTournament, loaded = loadLinked(deps, [t])) {
  return new Map(
    t.links.flatMap((l) => {
      const m = loaded.get(l.matchId);
      return m && m.status !== "abandoned" ? [[l.fixtureId, m] as const] : [];
    }),
  );
}

/** Every game of the given tournaments in one batch. */
function loadLinked(deps: Deps, ts: StoredTournament[]): Map<string, LoadedMatch> {
  const ids = ts.flatMap((t) => t.links.map((l) => l.matchId));
  return new Map(deps.matches.loadMatches(ids).map((m) => [m.id, m]));
}

/** Results of the finished games plus the walkovers against deleted players (m9-plan §1). */
function resultsOf(t: StoredTournament, matches: ReturnType<typeof linkedMatches>): FixtureResult[] {
  const played = [...matches].flatMap(([fixtureId, m]) => {
    if (m.status !== "finished") return [];
    const r = matchResult(m.state);
    return r.winner ? [{ fixtureId, winner: r.winner, legs: r.legs, averages: r.averages }] : [];
  });
  const withdrawn = new Set(t.seeds.filter((p) => p.deletedAt !== null).map((p) => p.id));
  return withWalkovers(planOf(t), played, withdrawn);
}

export function loadTournamentView(deps: Deps, session: Session, id: string): TournamentView | null {
  const t = deps.tournaments.loadTournament(id);
  if (!t) return null;
  const plan = planOf(t);
  const matches = linkedMatches(deps, t);
  const results = resultsOf(t, matches);
  const fixtures = resolve(plan, results).map((f): TournamentFixture => {
    const m = matches.get(f.id);
    const r = results.find((x) => x.fixtureId === f.id);
    return {
      ...f,
      matchId: m?.id ?? null,
      matchStatus: m?.status ?? null,
      legs: r && f.a && f.b ? [r.legs[f.a] ?? 0, r.legs[f.b] ?? 0] : null,
      walkover: r?.walkover ?? false,
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
    seeding: t.seeding,
    createdAt: t.createdAt,
    players: t.seeds.map((p) => ({ id: p.id, name: shownName(p) })),
    fixtures,
    groups: groupNumbers.map((group) => ({ group, rows: standings(plan, results, group) })),
    winner: tournamentWinner(plan, results),
    // Only when another draw is possible: not for a round robin, a single group or a knockout of two.
    canRedraw: t.seeding === "random" && mayManage(t, session) && matches.size === 0 && hasOtherDraw(t),
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
  const all = deps.tournaments.listTournaments();
  const loaded = loadLinked(deps, all);
  return all.map((t) => {
    const winnerId = tournamentWinner(planOf(t), resultsOf(t, linkedMatches(deps, t, loaded)));
    const winner = t.seeds.find((p) => p.id === winnerId);
    return {
      id: t.id,
      name: t.name,
      format: t.format,
      players: t.seeds.map(shownName),
      createdAt: t.createdAt,
      winner: winner ? shownName(winner) : null,
    };
  });
}

/** More than one possible draw (the button "Neu auslosen" is shown only then). */
const hasOtherDraw = (t: StoredTournament) =>
  (drawVariants(
    drawInputOf(t),
    t.seeds.map((p) => p.id),
  )?.length ?? Infinity) > 1;

/**
 * A new draw of the seed list, by the creator or an admin, only before the first game started: the
 * knockout gets a new bracket, groups + knockout new groups (both follow from the seed order). The new
 * draw always differs: with two or three variants the next one, otherwise random (domain `redraw`).
 */
export function redrawTournament(deps: Deps, session: Session, id: string): { ok: true } | { ok: false; reason: TournamentError } {
  const t = deps.tournaments.loadTournament(id);
  if (!t) return { ok: false, reason: "not-found" };
  // A fixed list is the creator's order; with only one possible draw there is nothing to draw.
  if (!mayManage(t, session) || t.seeding === "fixed") return { ok: false, reason: "forbidden" };
  if (linkedMatches(deps, t).size > 0) return { ok: false, reason: "already-started" };
  const next = redraw(
    drawInputOf(t),
    t.seeds.map((p) => p.id),
    randomInt(deps),
  );
  if (!next) return { ok: false, reason: "forbidden" };
  deps.tournaments.setSeeds(id, next);
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
  const fixture = resolve(planOf(t), resultsOf(t, matches)).find((f) => f.id === fixtureId);
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
