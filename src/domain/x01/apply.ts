import { isValidDart } from "./rules";
import { dartScore, isDart } from "../game/scoring";
import { currentPlayer, isLegFinished, openVisit, remainingPlayer, scoreOf } from "./selectors";
import {
  MAX_DARTS_PER_VISIT,
  type ApplyError,
  type Dart,
  type LegState,
  type PlayOutError,
  type Result,
  type UndoError,
  type Visit,
} from "../game/types";

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
  if (isLegFinished(state)) return { ok: false, reason: "leg-finished" };

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
 * A play-out choice or a resign counts as a step of its own (playOutUndo).
 */
export function undoDart(state: LegState): Result<LegState, UndoError> {
  const toggled = playOutUndo(state);
  if (toggled) return { ok: true, value: toggled };
  const last = state.visits.at(-1);
  if (!last) return { ok: false, reason: "nothing-to-undo" };

  const darts = last.isBust ? last.darts.filter((d) => d.type !== "overthrown") : last.darts.slice(0, -1);

  if (darts.length === 0) {
    return { ok: true, value: { ...state, visits: state.visits.slice(0, -1) } };
  }
  return { ok: true, value: withLastVisit(state, { ...last, darts, isBust: false }) };
}

/**
 * If the next undo step is a play-out decision rather than a dart, the state after undoing it:
 * after a resign (he threw, play-out off) play-out comes back; after choosing play-out without a
 * dart of his yet, the choice is taken back (victory screen again). The server uses this too.
 */
export function playOutUndo(state: LegState): LegState | null {
  const remaining = remainingPlayer(state);
  const last = state.visits.at(-1);
  if (!remaining || !last) return null;
  const heThrew = last.playerId === remaining;
  if (heThrew && !state.playOut) return { ...state, playOut: true };
  if (!heThrew && state.playOut) return { ...state, playOut: false };
  return null;
}

/** "{Name} spielt zu Ende" (M5 plan §9.2): only with 3+ players, places fixed, last player not out yet. */
export function startPlayOut(state: LegState): Result<LegState, PlayOutError> {
  if (!remainingPlayer(state) || state.playOut) return { ok: false, reason: "no-play-out" };
  return { ok: true, value: { ...state, playOut: true } };
}

/** The last player gives up while playing out: an open visit is dropped, his place stays. */
export function resign(state: LegState): Result<LegState, PlayOutError> {
  if (!remainingPlayer(state) || !state.playOut) return { ok: false, reason: "no-play-out" };
  const visits = openVisit(state) ? state.visits.slice(0, -1) : state.visits;
  return { ok: true, value: { ...state, visits, playOut: false } };
}
