import { groupStandings, slotsOf, type PlayerPanelData } from "../game/board";
import type { GameMode } from "../game/mode";
import { isDart } from "../game/scoring";
import { MAX_DARTS_PER_VISIT, type Dart, type LegState, type PlayerId } from "../game/types";
import { dartsOf, lastOpenVisit, playerOnTurn, pointsPerVisit, popDart, shownVisit, withDart } from "../game/visits";
import { isValidDart, nextElimination, scores } from "./scores";

const OVERTHROWN: Dart = { field: 0, type: "overthrown" };

const finished = (state: LegState) => scores(state).winner !== null;
const openVisit = (state: LegState) => lastOpenVisit(state, finished(state));
const currentPlayer = (state: LegState) => playerOnTurn(state, openVisit(state) !== null, finished(state));

/** Winner first, then by points; equal points share a place. */
function standings(state: LegState): PlayerId[][] {
  const s = scores(state);
  return groupStandings(state.players, (a, b) => s.points[b] - s.points[a], s.winner);
}

/** Elimination (legacy EliminationGame, M7): count up to the target, landing on someone sends him back to 0. */
export const elimination: GameMode = {
  applyDart(state, dart) {
    if (!isDart(dart)) return { ok: false, reason: "invalid-dart" };
    if (finished(state)) return { ok: false, reason: "leg-finished" };
    const player = currentPlayer(state);
    const open = openVisit(state);
    const valid = isValidDart(state, scores(state).points[player], dart);
    return { ok: true, value: valid ? withDart(state, open, player, dart) : withDart(state, open, player, OVERTHROWN, true) };
  },
  undoDart: popDart,
  isOpenVisit: (state, index) => index === state.visits.length - 1 && openVisit(state) !== null,
  currentPlayer,
  isLegFinished: finished,
  standings,
  board(state, names) {
    const s = scores(state);
    const done = s.winner !== null;
    const active = currentPlayer(state);
    const open = openVisit(state);
    const players = state.players.map((id): PlayerPanelData => {
      const visit = shownVisit(state, id, active, open);
      return {
        id,
        name: names[id] ?? id,
        score: s.points[id],
        darts: dartsOf(state, id),
        average: pointsPerVisit(state, id, open),
        isActive: id === active,
        isWinner: id === s.winner,
        slots: slotsOf(visit, id === active, done),
        isBust: visit.isBust,
        placement: null,
        isOut: false,
      };
    });
    const next = done ? null : nextElimination(s, active);
    return {
      mode: "elimination",
      players,
      activePlayerId: active,
      winnerId: s.winner,
      dartsLeft: done ? 0 : MAX_DARTS_PER_VISIT - (open?.darts.length ?? 0),
      hint: next === null ? null : { kind: "elimination", points: next },
      canUndo: state.visits.length > 0,
      ranking: standings(state).flat(),
    };
  },
};
