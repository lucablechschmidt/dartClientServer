import { dartScore } from "./scoring";
import { MAX_DARTS_PER_VISIT, type Dart, type LegState, type PlayerId, type Result, type UndoError, type Visit } from "./types";

/** Helpers for the modes that are added in M7 (Cricket, Elimination, SplitScore); X01 keeps its own. */

/** The next seat after `after`. */
export function nextSeat(players: PlayerId[], after: PlayerId): PlayerId {
  return players[(players.indexOf(after) + 1) % players.length];
}

/**
 * Player on turn when a visit closes after three darts (or a bust) and the leg ends on `finished`:
 * no visit yet → starter; open last visit → its player; finished → whoever threw last.
 */
export function playerOnTurn(state: LegState, lastIsOpen: boolean, finished: boolean): PlayerId {
  const last = state.visits.at(-1);
  if (!last) return state.players[state.starter];
  if (lastIsOpen || finished) return last.playerId;
  return nextSeat(state.players, last.playerId);
}

/** Adds a dart to the open visit, or starts a visit for `player`; `bust` closes the visit after it. */
export function withDart(state: LegState, open: Visit | null, player: PlayerId, dart: Dart, bust = false): LegState {
  const visit = open ?? { playerId: player, darts: [], isBust: false };
  const next = { ...visit, darts: [...visit.darts, dart], isBust: bust };
  return { ...state, visits: open ? [...state.visits.slice(0, -1), next] : [...state.visits, next] };
}

/** Takes back the last dart; an emptied visit disappears, so the turn goes back to its player. */
export function popDart(state: LegState): Result<LegState, UndoError> {
  const last = state.visits.at(-1);
  if (!last) return { ok: false, reason: "nothing-to-undo" };
  const darts = last.darts.slice(0, -1);
  const visits = darts.length === 0 ? state.visits.slice(0, -1) : [...state.visits.slice(0, -1), { ...last, darts, isBust: false }];
  return { ok: true, value: { ...state, visits } };
}

/**
 * The darts of an open visit as they can be thrown again (re-sent to the server, re-applied after
 * a reload). An open visit holds overthrown darts only in SplitScore (off the target, M7), where
 * they mean exactly what a miss means; the mode stores them as overthrown again.
 */
export const rethrowable = (visit: Visit): Dart[] => visit.darts.map((d) => (d.type === "overthrown" ? { field: 0, type: "single" } : d));

/** Full visit or bust: the visit takes no more darts. */
export const isClosedByDarts = (visit: Visit): boolean => visit.isBust || visit.darts.length >= MAX_DARTS_PER_VISIT;

/** The last visit if it still takes darts (not full, not busted, the leg not finished). */
export function lastOpenVisit(state: LegState, finished: boolean): Visit | null {
  const last = state.visits.at(-1);
  return last && !isClosedByDarts(last) && !finished ? last : null;
}

const emptyVisit = (playerId: PlayerId): Visit => ({ playerId, darts: [], isBust: false });

/** The visit a panel shows: the open one of the player on turn, otherwise the player's last one. */
export function shownVisit(state: LegState, player: PlayerId, active: PlayerId, open: Visit | null): Visit {
  if (player === active) return open ?? emptyVisit(player);
  return state.visits.filter((v) => v.playerId === player).at(-1) ?? emptyVisit(player);
}

/** All darts a player has thrown, overthrown slots included (legacy getPlayerDarts). */
export const dartsOf = (state: LegState, player: PlayerId): number =>
  state.visits.filter((v) => v.playerId === player).reduce((n, v) => n + v.darts.length, 0);

/** Points scored per closed visit of a player (overthrown darts score 0); 0 before the first one. */
export function pointsPerVisit(state: LegState, player: PlayerId, open: Visit | null): number {
  const closed = state.visits.filter((v) => v.playerId === player && v !== open);
  const points = closed.reduce((sum, v) => sum + v.darts.reduce((n, d) => n + dartScore(d), 0), 0);
  return closed.length === 0 ? 0 : points / closed.length;
}
