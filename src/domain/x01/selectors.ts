import { visitScore } from "./scoring";
import { MAX_DARTS_PER_VISIT, type LegState, type PlayerId, type Visit } from "./types";

export function scoreOf(state: LegState, playerId: PlayerId): number {
  return state.visits
    .filter((v) => v.playerId === playerId)
    .reduce((rest, v) => rest - visitScore(v), state.rules.startScore);
}

/** Rest before a given visit (for checkout detection and display). */
function scoreBefore(state: LegState, index: number): number {
  const v = state.visits[index];
  return state.visits
    .slice(0, index)
    .filter((x) => x.playerId === v.playerId)
    .reduce((rest, x) => rest - visitScore(x), state.rules.startScore);
}

export function isCheckoutVisit(state: LegState, index: number): boolean {
  const v = state.visits[index];
  return !v.isBust && scoreBefore(state, index) - visitScore(v) === 0;
}

/** A visit is open as long as it is neither full, busted nor finished. */
export function isOpenVisit(state: LegState, index: number): boolean {
  const v = state.visits[index];
  return !v.isBust && v.darts.length < MAX_DARTS_PER_VISIT && !isCheckoutVisit(state, index);
}

export function openVisit(state: LegState): Visit | null {
  const i = state.visits.length - 1;
  return i >= 0 && isOpenVisit(state, i) ? state.visits[i] : null;
}

export function winnerOf(state: LegState): PlayerId | null {
  const i = state.visits.length - 1;
  return i >= 0 && isCheckoutVisit(state, i) ? state.visits[i].playerId : null;
}

function nextPlayer(state: LegState, after: PlayerId): PlayerId {
  const i = state.players.indexOf(after);
  return state.players[(i + 1) % state.players.length];
}

/** Port of the player switch logic: open visit → its player, otherwise the next one after the last. */
export function currentPlayer(state: LegState): PlayerId {
  const last = state.visits.at(-1);
  if (!last) return state.players[state.starter];
  if (isOpenVisit(state, state.visits.length - 1) || winnerOf(state) === last.playerId) return last.playerId;
  return nextPlayer(state, last.playerId);
}

/** Current visit of the player on turn (empty if their turn has just started). */
export function currentVisit(state: LegState): Visit {
  return openVisit(state) ?? { playerId: currentPlayer(state), darts: [], isBust: false };
}

/** Last visit of a player, for the dart slots in the panel (port of getPlayerLastDartThrow). */
export function lastVisitOf(state: LegState, playerId: PlayerId): Visit {
  if (currentPlayer(state) === playerId) return currentVisit(state);
  const own = state.visits.filter((v) => v.playerId === playerId);
  return own.at(-1) ?? { playerId, darts: [], isBust: false };
}

/** Port of getPlayerDarts: all darts including overthrown slots and the open visit. */
export function dartsThrown(state: LegState, playerId: PlayerId): number {
  return state.visits
    .filter((v) => v.playerId === playerId)
    .reduce((n, v) => n + v.darts.length, 0);
}

/**
 * Port of Game.getPlayerAverage: points of the closed, non-bust visits
 * divided by the number of all closed visits (busts count in the denominator).
 */
export function threeDartAverage(state: LegState, playerId: PlayerId): number {
  const closed = state.visits
    .map((v, i) => ({ v, i }))
    .filter(({ v, i }) => v.playerId === playerId && !isOpenVisit(state, i));
  if (closed.length === 0) return 0;
  const points = closed.reduce((sum, { v }) => sum + visitScore(v), 0);
  return points / closed.length;
}

/** Players sorted by rest ascending (victory screen, port of getPlayersSortedScore). */
export function playersByRest(state: LegState): PlayerId[] {
  return [...state.players].sort((a, b) => scoreOf(state, a) - scoreOf(state, b));
}
