import { groupStandings, slotsOf, type PlayerPanelData } from "../game/board";
import type { GameMode } from "../game/mode";
import { isDart } from "../game/scoring";
import { MAX_DARTS_PER_VISIT, type Dart, type LegState, type PlayerId } from "../game/types";
import { dartsOf, isClosedByDarts, lastOpenVisit, playerOnTurn, pointsPerVisit, popDart, shownVisit, withDart } from "../game/visits";
import { hitsTarget, rounds, targetOfVisit, TARGETS } from "./rounds";

const OVERTHROWN: Dart = { field: 0, type: "overthrown" };

const finished = (state: LegState) => {
  const last = state.visits.at(-1);
  return state.visits.length === TARGETS.length * state.players.length && last !== undefined && isClosedByDarts(last);
};
const openVisit = (state: LegState) => lastOpenVisit(state, finished(state));
const currentPlayer = (state: LegState) => playerOnTurn(state, openVisit(state) !== null, finished(state));

/** By points; equal points share a place (M7 plan §9.4). */
function standings(state: LegState): PlayerId[][] {
  const { points } = rounds(state);
  return groupStandings(state.players, (a, b) => points[b] - points[a]);
}

/** SplitScore (legacy SplitScoreGame, M7): hit the round's target or lose half of your points. */
export const splitscore: GameMode = {
  applyDart(state, dart) {
    if (!isDart(dart)) return { ok: false, reason: "invalid-dart" };
    if (finished(state)) return { ok: false, reason: "leg-finished" };
    const open = openVisit(state);
    const target = targetOfVisit(state, open ? state.visits.length - 1 : state.visits.length)!;
    // A dart off the target is as good as missing the board: stored overthrown (legacy addSingleFaultyDartScore).
    return { ok: true, value: withDart(state, open, currentPlayer(state), hitsTarget(dart, target) ? dart : OVERTHROWN) };
  },
  undoDart: popDart,
  isOpenVisit: (state, index) => index === state.visits.length - 1 && openVisit(state) !== null,
  currentPlayer,
  isLegFinished: finished,
  standings,
  board(state, names) {
    const r = rounds(state);
    const done = finished(state);
    const active = currentPlayer(state);
    const open = openVisit(state);
    const ranking = standings(state);
    const players = state.players.map((id): PlayerPanelData => ({
      id,
      name: names[id] ?? id,
      score: r.points[id],
      darts: dartsOf(state, id),
      average: pointsPerVisit(state, id, open),
      isActive: id === active,
      isWinner: done && ranking[0].includes(id),
      slots: slotsOf(shownVisit(state, id, active, open), id === active, done),
      isBust: false,
      placement: null,
      isOut: false,
    }));
    return {
      mode: "splitscore",
      players,
      activePlayerId: active,
      winnerId: done ? ranking[0][0] : null,
      dartsLeft: done ? 0 : MAX_DARTS_PER_VISIT - (open?.darts.length ?? 0),
      hint: r.target && !done ? { kind: "target", target: r.target } : null,
      canUndo: state.visits.length > 0,
      ranking: ranking.flat(),
      total: Object.values(r.points).reduce((sum, p) => sum + p, 0),
    };
  },
};
