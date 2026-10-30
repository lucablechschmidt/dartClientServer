import { z } from "zod";
import type { LoadedMatch, OpenMatch, RecentMatch } from "@/db/repository";
import type { Session } from "@/domain/player";
import {
  applyMatchDart,
  decideWinner as decideMatchWinner,
  canCancel,
  canEnter,
  canPlayOut,
  canUndo,
  currentLeg,
  isDart,
  isEditable,
  isLegFinished,
  isOpen,
  legNumbers,
  MATCH_OPEN_MS,
  matchStatus,
  maySetStarter,
  matchWinner,
  nextVisitPosition,
  openVisit,
  matchStandings,
  MODE_IDS,
  placeNumbers,
  projectBoard,
  resign,
  setLegStarter,
  startPlayOut,
  undoMatchVisit,
  walkWinners,
  winnerOf,
  type Actor,
  type Dart,
  type InputMode,
  type MatchAccess,
  type MatchFormat,
  type MatchState,
  type ModeId,
  type PlayerId,
  type Rules,
  type ScoreboardView,
} from "@/domain/game";
import type { Deps } from "./deps";
import { isTournamentMatchLocked } from "./tournament-plan";

export const rulesSchema = z.object({
  /** X01 start, Elimination target, SplitScore start (40); Cricket does not use it (0). */
  startScore: z.number().int().min(0).max(1001),
  inRule: z.enum(["single", "double", "triple"]),
  outRule: z.enum(["single", "double", "triple"]),
});

export const formatSchema = z.object({
  legsToWinSet: z.number().int().min(1).max(9).default(1),
  setsToWinMatch: z.number().int().min(1).max(9).default(1),
});

export const newMatchSchema = z.object({
  /** M7: X01, Cricket, Elimination or SplitScore. */
  mode: z.enum(MODE_IDS).default("x01"),
  playerIds: z.array(z.string().min(1)).min(1).max(8),
  rules: rulesSchema,
  /** Sets and legs; E7: forced to 1/1 with 3+ players. */
  format: formatSchema.default({ legsToWinSet: 1, setsToWinMatch: 1 }),
  starterIndex: z.number().int().min(0).default(0),
  inputMode: z.enum(["single", "per-player"]).default("single"),
  /** Player of the session that starts the match (E13). */
  hostPlayerId: z.string().min(1).nullable().default(null),
  /** M9: started from a tournament fixture. */
  isTournament: z.boolean().default(false),
});
export type NewMatchInput = z.input<typeof newMatchSchema>;

export type MatchView = {
  id: string;
  status: LoadedMatch["status"];
  rules: Rules;
  format: MatchFormat;
  /** Raw state and names so the client can apply darts locally (optimistic UI). */
  state: MatchState;
  names: Record<PlayerId, string>;
  /** The current leg, projected. */
  board: ScoreboardView;
  inputMode: InputMode;
  hostPlayerId: PlayerId | null;
  /** M9: tournament fixtures offer declaring the winner after a leg. */
  isTournament: boolean;
  /** E13: basis for permissions and the actor, so the client recomputes them itself after every local dart. */
  match: MatchAccess;
  actor: Actor | null;
  /** What this device (the session) may do at load time; the server checks on every action itself. */
  access: { isOpen: boolean; canEnter: boolean; canUndo: boolean; canCancel: boolean };
};

export type ActionError =
  | "not-found"
  | "leg-finished"
  | "invalid-dart"
  | "nothing-to-undo"
  | "out-of-sync"
  | "forbidden"
  | "match-closed"
  | "leg-started"
  | "no-play-out"
  | "not-between-legs"
  | "tournament-moved-on";
export type ActionResult = { ok: true; view: MatchView } | { ok: false; reason: ActionError };

export const dartSchema = z
  .object({ field: z.number().int().min(0).max(25), type: z.enum(["single", "double", "triple"]) })
  .refine((d) => isDart(d), { message: "not a valid dart" });
export const thrownDartsSchema = z.array(dartSchema).min(1).max(3);

const accessOf = (m: Pick<LoadedMatch, "status" | "startedAt" | "inputMode" | "hostPlayerId" | "players">): MatchAccess => ({
  status: m.status,
  startedAt: m.startedAt,
  inputMode: m.inputMode,
  hostPlayerId: m.hostPlayerId,
  players: m.players.map((p) => ({ id: p.id, hasLogin: p.hasLogin })),
});
const actorOf = (s: Session) => ({ id: s.playerId, isAdmin: s.isAdmin });

function toView(m: LoadedMatch, session: Session | null, now: number): MatchView {
  const names = Object.fromEntries(m.players.map((p) => [p.id, p.name]));
  const match = accessOf(m);
  const actor = session ? actorOf(session) : null;
  return {
    id: m.id,
    status: m.status,
    rules: m.rules,
    format: m.format,
    state: m.state,
    names,
    board: projectBoard(currentLeg(m.state), names),
    inputMode: m.inputMode,
    hostPlayerId: m.hostPlayerId,
    isTournament: m.isTournament,
    match,
    actor,
    access: {
      isOpen: isEditable(match, now),
      canEnter: actor ? canEnter(m.state, match, actor, now) : false,
      canUndo: actor ? canUndo(m.state, match, actor, now) : false,
      canCancel: actor ? canCancel(match, actor, now) : false,
    },
  };
}

/** E7: sets and legs only for X01 with 2 players; the other modes are one leg (M7). */
const formatFor = (mode: ModeId, players: number, format: MatchFormat): MatchFormat =>
  mode !== "x01" || players > 2 ? { legsToWinSet: 1, setsToWinMatch: 1 } : format;

/** Final places once the match is over (ties share a place); null while it runs. */
function finalPlacements(state: MatchState): Record<PlayerId, number | null> {
  if (!matchWinner(state)) return Object.fromEntries(state.players.map((p) => [p, null]));
  return placeNumbers(matchStandings(state));
}

/** Index of the first visit that differs, so only the changed tail of a leg is rewritten. */
function firstDiff(a: MatchState["legs"][number]["visits"], b: MatchState["legs"][number]["visits"]): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return i;
  return n;
}

/**
 * Writes the difference between the stored match and `next` (one transaction): legs created or
 * deleted, changed visits, starter and play-out of a leg, leg winners, match status and places.
 * Returns the match as now stored. All derived columns are projections of the domain state.
 */
function persist(deps: Deps, m: LoadedMatch, next: MatchState): LoadedMatch {
  const now = deps.now();
  const numbers = legNumbers(next);
  const legs = [...m.legs];
  const status = matchStatus(next) === "finished" ? "finished" : "running";
  deps.transaction(() => {
    for (const gone of legs.splice(next.legs.length)) deps.matches.deleteLeg(gone.id);
    next.legs.forEach((leg, i) => {
      if (i >= legs.length) {
        const created = { id: deps.newId(), ...numbers[i], winnerPlayerId: null };
        deps.matches.createLeg({
          id: created.id,
          matchId: m.id,
          setNo: created.setNo,
          legNo: created.legNo,
          starterPlayerId: next.players[leg.starter],
        });
        legs.push(created);
      }
      const old = m.state.legs.at(i); // a leg that is new in `next` has no stored counterpart
      if (old && old.starter !== leg.starter) deps.matches.setLegStarter(legs[i].id, next.players[leg.starter]);
      if ((old?.playOut ?? false) !== leg.playOut) deps.matches.setPlayOut(legs[i].id, leg.playOut);
      const oldVisits = old?.visits ?? [];
      const from = firstDiff(oldVisits, leg.visits);
      if (from < oldVisits.length || from < leg.visits.length) deps.matches.syncVisits(legs[i].id, leg.visits, from, deps.newId, now);
      const winner = isLegFinished(leg) ? winnerOf(leg) : null;
      if (winner !== legs[i].winnerPlayerId) {
        if (winner) deps.matches.finishLeg(legs[i].id, winner, now);
        else deps.matches.reopenLeg(legs[i].id);
        legs[i] = { ...legs[i], winnerPlayerId: winner };
      }
    });
    if (next.decidedWinner !== m.state.decidedWinner) deps.matches.setDecidedWinner(m.id, next.decidedWinner);
    if (status !== m.status) {
      deps.matches.setMatchStatus(m.id, status, now);
      deps.matches.setPlacements(m.id, finalPlacements(next));
    }
  });
  return { ...m, legs, state: next, status, finishedAt: status === "finished" ? now : null };
}

/** Checks openness and permission for an input; null = allowed. */
function gate(m: LoadedMatch, session: Session, now: number, check: typeof canEnter): ActionError | null {
  const match = accessOf(m);
  if (!isOpen(match, now)) return "match-closed";
  return check(m.state, match, actorOf(session), now) ? null : "forbidden";
}

export function createMatch(deps: Deps, raw: NewMatchInput): string {
  const input = newMatchSchema.parse(raw);
  const id = deps.newId();
  deps.matches.createMatch({
    id,
    mode: input.mode,
    legId: deps.newId(),
    rules: input.rules,
    playerIds: input.playerIds,
    starterIndex: input.starterIndex % input.playerIds.length,
    format: formatFor(input.mode, input.playerIds.length, input.format),
    inputMode: input.inputMode,
    hostPlayerId: input.hostPlayerId,
    isTournament: input.isTournament,
    startedAt: deps.now(),
  });
  return id;
}

export function loadMatchView(deps: Deps, matchId: string, session: Session | null = null): MatchView | null {
  const m = deps.matches.loadMatch(matchId);
  return m ? toView(m, session, deps.now()) : null;
}

/** Game overview (M4): running matches younger than 24 h. */
export function listOpenMatches(deps: Deps): OpenMatch[] {
  return deps.matches.listOpenMatches(deps.now() - MATCH_OPEN_MS);
}

/** Result of a closed match for the history (M5), without texts; `P` is a player id or, for the view, a name. */
export type RecentResult<P = PlayerId> =
  | { kind: "abandoned" }
  /** 3+ players: places in order (ties share a place). */
  | { kind: "places"; order: { player: P; place: number }[] }
  /** 2 players with more than one leg or set: winner and the score from his side. */
  | { kind: "score"; winner: P; unit: "legs" | "sets"; score: [number, number] }
  | { kind: "winner"; winner: P };

export type RecentMatchView = { id: string; mode: ModeId; names: string[]; endedAt: number; result: RecentResult };

export function recentResult(m: RecentMatch): RecentResult {
  if (m.status !== "finished") return { kind: "abandoned" };
  const ids = m.players.map((p) => p.id);
  const placed = ids
    .flatMap((player) => {
      const place = m.placements[player];
      return place == null ? [] : [{ player, place }];
    })
    .sort((a, b) => a.place - b.place);
  if (ids.length > 2) return { kind: "places", order: placed };
  const { score } = walkWinners(ids, m.format, m.legWinners);
  const winnerId = placed.at(0)?.player ?? ids.find((id) => score.sets[id] >= m.format.setsToWinMatch) ?? ids[0];
  if (ids.length < 2 || (m.format.legsToWinSet === 1 && m.format.setsToWinMatch === 1)) return { kind: "winner", winner: winnerId };
  const unit = m.format.setsToWinMatch > 1 ? "sets" : "legs";
  const other = ids.find((id) => id !== winnerId);
  if (!other) return { kind: "winner", winner: winnerId };
  return { kind: "score", winner: winnerId, unit, score: [score[unit][winnerId], score[unit][other]] };
}

function withNames(r: RecentResult, name: (id: PlayerId) => string): RecentResult {
  if (r.kind === "places") return { ...r, order: r.order.map((p) => ({ player: name(p.player), place: p.place })) };
  if (r.kind === "score" || r.kind === "winner") return { ...r, winner: name(r.winner) };
  return r;
}

/** History in the game overview (M5): the last 20 closed matches. */
export function listRecentMatches(deps: Deps, limit = 20): RecentMatchView[] {
  return deps.matches.listRecentMatches(deps.now() - MATCH_OPEN_MS, limit).map((m) => {
    const name = (id: PlayerId) => m.players.find((p) => p.id === id)?.name ?? "";
    return {
      id: m.id,
      mode: m.mode,
      names: m.players.map((p) => p.name),
      endedAt: m.finishedAt ?? m.startedAt,
      result: withNames(recentResult(m), name),
    };
  });
}

/** Cancel by host or admin (E13). The visits stay stored. */
export function cancelMatch(deps: Deps, session: Session, matchId: string): { ok: true } | { ok: false; reason: ActionError } {
  const m = deps.matches.loadMatch(matchId);
  if (!m) return { ok: false, reason: "not-found" };
  const now = deps.now();
  if (!canCancel(accessOf(m), actorOf(session), now)) return { ok: false, reason: isOpen(accessOf(m), now) ? "forbidden" : "match-closed" };
  deps.matches.setMatchStatus(matchId, "abandoned", now);
  deps.events.publish(matchId);
  return { ok: true };
}

/**
 * Accepts a completed visit from the client: the darts actually thrown
 * (so for a bust also the dart that caused the bust, which is not stored).
 * Darts are counted locally on the phone; only the finished visit goes over the network.
 * `legIndex` and `seq` are the expected position (M5: the first visit of the next leg has
 * legIndex = number of legs, seq 0); the server replays the darts through the rules itself and
 * accepts only if exactly one completed visit results.
 */
export function commitVisit(deps: Deps, session: Session, matchId: string, legIndex: number, seq: number, rawDarts: Dart[]): ActionResult {
  const parsed = thrownDartsSchema.safeParse(rawDarts);
  if (!parsed.success) return { ok: false, reason: "invalid-dart" };
  const m = deps.matches.loadMatch(matchId);
  if (!m) return { ok: false, reason: "not-found" };
  const progress = matchStatus(m.state);
  if (progress === "finished") return { ok: false, reason: "leg-finished" };
  const denied = gate(m, session, deps.now(), canEnter);
  if (denied) return { ok: false, reason: denied };
  const expected = nextVisitPosition(m.state);
  if (legIndex !== expected.legIndex || seq !== expected.seq || openVisit(currentLeg(m.state))) return { ok: false, reason: "out-of-sync" };

  let next = m.state;
  for (const [i, dart] of parsed.data.entries()) {
    if (i > 0 && openVisit(currentLeg(next)) === null) return { ok: false, reason: "out-of-sync" }; // visit was already closed
    const r = applyMatchDart(next, dart);
    if (!r.ok) return { ok: false, reason: r.reason };
    next = r.value;
  }
  if (next.legs.length !== legIndex + 1 || currentLeg(next).visits.length !== seq + 1 || openVisit(currentLeg(next)))
    return { ok: false, reason: "out-of-sync" };

  const stored = persist(deps, m, next);
  deps.events.publish(matchId);
  return { ok: true, view: toView(stored, session, deps.now()) };
}

/** Removes the last stored step (a visit, or a play-out decision); the client reopens it locally. */
export function undoVisit(deps: Deps, session: Session, matchId: string): ActionResult {
  const m = deps.matches.loadMatch(matchId);
  if (!m) return { ok: false, reason: "not-found" };
  const match = accessOf(m);
  const now = deps.now();
  if (!isEditable(match, now)) return { ok: false, reason: "match-closed" };
  const r = undoMatchVisit(m.state);
  if (!r.ok) return { ok: false, reason: r.reason };
  if (!canUndo(m.state, match, actorOf(session), now)) return { ok: false, reason: "forbidden" };
  // M9: a finished tournament match stays decided once the game that depends on it has started.
  if (m.isTournament && m.status === "finished" && isTournamentMatchLocked(deps, matchId))
    return { ok: false, reason: "tournament-moved-on" };
  const stored = persist(deps, m, r.value);
  deps.events.publish(matchId);
  return { ok: true, view: toView(stored, session, now) };
}

/** M5 plan §9.2: the last player plays to his checkout (true) or gives up (false). */
export function setPlayOut(deps: Deps, session: Session, matchId: string, playOut: boolean): ActionResult {
  const m = deps.matches.loadMatch(matchId);
  if (!m) return { ok: false, reason: "not-found" };
  const match = accessOf(m);
  const now = deps.now();
  if (!isEditable(match, now)) return { ok: false, reason: "match-closed" };
  if (!canPlayOut(m.state, match, actorOf(session), now)) return { ok: false, reason: "forbidden" };
  const leg = currentLeg(m.state);
  const r = playOut ? startPlayOut(leg) : resign(leg);
  if (!r.ok) return { ok: false, reason: r.reason };
  const stored = persist(deps, m, { ...m.state, legs: [...m.state.legs.slice(0, -1), r.value] });
  deps.events.publish(matchId);
  return { ok: true, view: toView(stored, session, now) };
}

/**
 * M9: declare the winner of a tournament fixture after a leg when time runs short (free choice).
 * Host or admin, like choosing the starter; undo on the victory screen takes it back.
 */
export function decideWinner(deps: Deps, session: Session, matchId: string, playerId: PlayerId): ActionResult {
  const m = deps.matches.loadMatch(matchId);
  if (!m?.isTournament) return { ok: false, reason: "not-found" };
  const match = accessOf(m);
  const now = deps.now();
  if (!isOpen(match, now)) return { ok: false, reason: "match-closed" };
  if (!maySetStarter(match, actorOf(session))) return { ok: false, reason: "forbidden" };
  const r = decideMatchWinner(m.state, playerId);
  if (!r.ok) return { ok: false, reason: r.reason === "unknown-player" ? "not-found" : r.reason };
  const stored = persist(deps, m, r.value);
  deps.events.publish(matchId);
  return { ok: true, view: toView(stored, session, now) };
}

/** ToStart: host or admin choose who throws first, before the first dart of a leg. */
export function setStarter(deps: Deps, session: Session, matchId: string, playerId: PlayerId): ActionResult {
  const m = deps.matches.loadMatch(matchId);
  if (!m) return { ok: false, reason: "not-found" };
  const match = accessOf(m);
  const now = deps.now();
  if (!isOpen(match, now)) return { ok: false, reason: "match-closed" };
  if (!maySetStarter(match, actorOf(session))) return { ok: false, reason: "forbidden" };
  const r = setLegStarter(m.state, playerId);
  if (!r.ok) return { ok: false, reason: r.reason === "unknown-player" ? "not-found" : r.reason };
  const stored = persist(deps, m, r.value);
  deps.events.publish(matchId);
  return { ok: true, view: toView(stored, session, now) };
}

/** "Restart Game" from legacy: same players, rules and format, the starter moves on by one seat. */
export function restartMatch(deps: Deps, matchId: string): string | null {
  const m = deps.matches.loadMatch(matchId);
  if (!m) return null;
  return createMatch(deps, {
    mode: m.mode,
    playerIds: m.players.map((p) => p.id),
    rules: m.rules,
    format: m.format,
    starterIndex: (m.state.legs[0].starter + 1) % m.players.length,
    inputMode: m.inputMode,
    hostPlayerId: m.hostPlayerId,
  });
}
