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

/** Players who have checked out, in the order they did (one pass with running rests). */
export function checkoutOrder(state: LegState): PlayerId[] {
  const rest = new Map<PlayerId, number>();
  const out: PlayerId[] = [];
  for (const v of state.visits) {
    const after = (rest.get(v.playerId) ?? state.rules.startScore) - visitScore(v);
    rest.set(v.playerId, after);
    if (!v.isBust && after === 0) out.push(v.playerId);
  }
  return out;
}

/** All places are decided: everyone but one has checked out (E7); with 1–2 players the first checkout. */
export function placementsFixed(state: LegState): boolean {
  return checkoutOrder(state).length >= Math.max(1, state.players.length - 1);
}

/** Leg over: places fixed and nobody plays out, or everyone has checked out. */
export function isLegFinished(state: LegState): boolean {
  const out = checkoutOrder(state).length;
  return out === state.players.length || (placementsFixed(state) && !state.playOut);
}

/** Places so far: checkout order, plus the remaining player in last place once the places are fixed. */
export function placements(state: LegState): PlayerId[] {
  const out = checkoutOrder(state);
  if (!placementsFixed(state)) return out;
  return [...out, ...state.players.filter((p) => !out.includes(p))];
}

/** Winner of the leg = first checkout (with 2 players identical to the end of the leg). */
export function winnerOf(state: LegState): PlayerId | null {
  return checkoutOrder(state)[0] ?? null;
}

/** Next player in seat order after `after` who has not checked out yet. */
function nextPlayer(state: LegState, after: PlayerId): PlayerId {
  const out = checkoutOrder(state);
  const i = state.players.indexOf(after);
  for (let step = 1; step <= state.players.length; step++) {
    const p = state.players[(i + step) % state.players.length];
    if (!out.includes(p)) return p;
  }
  return after;
}

/**
 * Port of the player switch logic: open visit → its player; finished leg → whoever threw last;
 * otherwise the next player still in the leg.
 */
export function currentPlayer(state: LegState): PlayerId {
  const last = state.visits.at(-1);
  if (!last) return state.players[state.starter];
  if (isOpenVisit(state, state.visits.length - 1) || isLegFinished(state)) return last.playerId;
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
