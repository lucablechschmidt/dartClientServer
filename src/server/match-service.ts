import { z } from "zod";
import type { LoadedMatch, OpenMatch } from "@/db/repository";
import type { Session } from "@/domain/player";
import {
  applyDart,
  canCancel,
  canEnter,
  canUndo,
  isDart,
  isEditable,
  isLegFinished,
  isOpen,
  MATCH_OPEN_MS,
  openVisit,
  projectScoreboard,
  winnerOf,
  type Actor,
  type Dart,
  type InputMode,
  type LegState,
  type MatchAccess,
  type PlayerId,
  type Rules,
  type ScoreboardView,
} from "@/domain/x01";
import type { Deps } from "./deps";

export const rulesSchema = z.object({
  startScore: z.number().int().min(2).max(1001),
  inRule: z.enum(["single", "double", "triple"]),
  outRule: z.enum(["single", "double", "triple"]),
});

export const newMatchSchema = z.object({
  playerIds: z.array(z.string().min(1)).min(1).max(8),
  rules: rulesSchema,
  starterIndex: z.number().int().min(0).default(0),
  inputMode: z.enum(["single", "per-player"]).default("single"),
  /** Player of the session that starts the match (E13). */
  hostPlayerId: z.string().min(1).nullable().default(null),
});
export type NewMatchInput = z.input<typeof newMatchSchema>;

export type MatchView = {
  id: string;
  status: LoadedMatch["status"];
  rules: Rules;
  legId: string;
  /** Raw state and names so the client can apply darts locally (optimistic UI). */
  state: LegState;
  names: Record<PlayerId, string>;
  board: ScoreboardView;
  inputMode: InputMode;
  hostPlayerId: PlayerId | null;
  /** E13: basis for permissions and the actor, so the client recomputes them itself after every local dart. */
  match: MatchAccess;
  actor: Actor | null;
  /** What this device (the session) may do at load time; the server checks on every action itself. */
  access: { isOpen: boolean; canEnter: boolean; canUndo: boolean; canCancel: boolean };
};

export type ActionError = "not-found" | "leg-finished" | "invalid-dart" | "nothing-to-undo" | "out-of-sync" | "forbidden" | "match-closed";
export type ActionResult = { ok: true; view: MatchView } | { ok: false; reason: ActionError };

export const dartSchema = z
  .object({ field: z.number().int().min(0).max(25), type: z.enum(["single", "double", "triple"]) })
  .refine((d) => isDart(d), { message: "not a valid dart" });
export const thrownDartsSchema = z.array(dartSchema).min(1).max(3);

const accessOf = (m: LoadedMatch): MatchAccess => ({
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
    legId: m.leg.id,
    state: m.state,
    names,
    board: projectScoreboard(m.state, names),
    inputMode: m.inputMode,
    hostPlayerId: m.hostPlayerId,
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
    legId: deps.newId(),
    rules: input.rules,
    playerIds: input.playerIds,
    starterIndex: input.starterIndex % input.playerIds.length,
    inputMode: input.inputMode,
    hostPlayerId: input.hostPlayerId,
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
 * `seq` is the expected position; the server replays the darts through the rules itself and
 * accepts only if exactly one completed visit results.
 */
export function commitVisit(deps: Deps, session: Session, matchId: string, seq: number, rawDarts: Dart[]): ActionResult {
  const parsed = thrownDartsSchema.safeParse(rawDarts);
  if (!parsed.success) return { ok: false, reason: "invalid-dart" };
  const m = deps.matches.loadMatch(matchId);
  if (!m) return { ok: false, reason: "not-found" };
  if (isLegFinished(m.state)) return { ok: false, reason: "leg-finished" };
  const denied = gate(m, session, deps.now(), canEnter);
  if (denied) return { ok: false, reason: denied };
  if (m.state.visits.length !== seq || openVisit(m.state)) return { ok: false, reason: "out-of-sync" };

  let next = m.state;
  for (const dart of parsed.data) {
    if (openVisit(next) === null && next !== m.state) return { ok: false, reason: "out-of-sync" }; // visit was already closed
    const r = applyDart(next, dart);
    if (!r.ok) return { ok: false, reason: r.reason };
    next = r.value;
  }
  if (next.visits.length !== seq + 1 || openVisit(next)) return { ok: false, reason: "out-of-sync" };

  const now = deps.now();
  const winner = isLegFinished(next) ? winnerOf(next) : null;
  deps.transaction(() => {
    deps.matches.syncVisits(m.leg.id, next.visits, seq, deps.newId, now);
    if (winner) {
      deps.matches.finishLeg(m.leg.id, winner, now);
      deps.matches.setMatchStatus(matchId, "finished", now);
    }
  });
  deps.events.publish(matchId);
  return { ok: true, view: toView({ ...m, state: next, status: winner ? "finished" : m.status, leg: { ...m.leg, winnerPlayerId: winner } }, session, now) };
}

/** Removes the last stored visit completely (the client reopens it locally). */
export function undoVisit(deps: Deps, session: Session, matchId: string): ActionResult {
  const m = deps.matches.loadMatch(matchId);
  if (!m) return { ok: false, reason: "not-found" };
  const match = accessOf(m);
  const now = deps.now();
  if (!isEditable(match, now)) return { ok: false, reason: "match-closed" };
  if (m.state.visits.length === 0) return { ok: false, reason: "nothing-to-undo" };
  if (!canUndo(m.state, match, actorOf(session), now)) return { ok: false, reason: "forbidden" };

  const hadWinner = isLegFinished(m.state);
  const next: LegState = { ...m.state, visits: m.state.visits.slice(0, -1) };
  deps.transaction(() => {
    deps.matches.syncVisits(m.leg.id, next.visits, next.visits.length, deps.newId, now);
    if (hadWinner) {
      deps.matches.reopenLeg(m.leg.id);
      deps.matches.setMatchStatus(matchId, "running", now);
    }
  });
  deps.events.publish(matchId);
  return { ok: true, view: toView({ ...m, state: next, status: "running", leg: { ...m.leg, winnerPlayerId: null } }, session, now) };
}

/** "Restart Game" from legacy: same players, same rules, the starter moves on by one seat. */
export function restartMatch(deps: Deps, matchId: string): string | null {
  const m = deps.matches.loadMatch(matchId);
  if (!m) return null;
  return createMatch(deps, {
    playerIds: m.players.map((p) => p.id),
    rules: m.rules,
    starterIndex: (m.state.starter + 1) % m.players.length,
    inputMode: m.inputMode,
    hostPlayerId: m.hostPlayerId,
  });
}
