import { isValidDart } from "./rules";
import { dartScore, isDart } from "./scoring";
import { currentPlayer, openVisit, scoreOf, winnerOf } from "./selectors";
import {
  MAX_DARTS_PER_VISIT,
  type ApplyError,
  type Dart,
  type LegState,
  type Result,
  type UndoError,
  type Visit,
} from "./types";

const OVERTHROWN: Dart = { field: 0, type: "overthrown" };

const withLastVisit = (state: LegState, visit: Visit): LegState => ({
  ...state,
  visits: [...state.visits.slice(0, -1), visit],
});

/**
 * Port of ClassicGame.addDartThrow. Invalid → bust: the visit is filled with overthrown
 * and closed; via visitScore the visit's points automatically drop to 0.
 */
export function applyDart(state: LegState, dart: Dart): Result<LegState, ApplyError> {
  if (!isDart(dart)) return { ok: false, reason: "invalid-dart" };
  if (winnerOf(state) !== null) return { ok: false, reason: "leg-finished" };

  const player = currentPlayer(state);
  const open = openVisit(state);
  const visit: Visit = open ?? { playerId: player, darts: [], isBust: false };
  const base = open ? state : { ...state, visits: [...state.visits, visit] };

  // Rest before this dart: rest after all closed visits minus the open darts.
  const openPoints = visit.darts.reduce((s, d) => s + dartScore(d), 0);
  const scoreBeforeDart = scoreOf(base, player) + (open ? openPoints : 0) - openPoints;

  if (!isValidDart(scoreBeforeDart, state.rules, dart)) {
    const fill = Array.from({ length: MAX_DARTS_PER_VISIT - visit.darts.length }, () => OVERTHROWN);
    return { ok: true, value: withLastVisit(base, { ...visit, darts: [...visit.darts, ...fill], isBust: true }) };
  }

  return { ok: true, value: withLastVisit(base, { ...visit, darts: [...visit.darts, dart] }) };
}

/**
 * Port of removeDartThrow / removeWinningDart. Bust: all overthrown slots and the flag at once.
 * Empty visits disappear, so the turn automatically moves back to the previous player.
 */
export function undoDart(state: LegState): Result<LegState, UndoError> {
  const last = state.visits.at(-1);
  if (!last) return { ok: false, reason: "nothing-to-undo" };

  const darts = last.isBust ? last.darts.filter((d) => d.type !== "overthrown") : last.darts.slice(0, -1);

  if (darts.length === 0) {
    return { ok: true, value: { ...state, visits: state.visits.slice(0, -1) } };
  }
  return { ok: true, value: withLastVisit(state, { ...last, darts, isBust: false }) };
}
