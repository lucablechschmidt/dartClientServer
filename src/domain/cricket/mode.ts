import { groupStandings, slotsOf, type PlayerPanelData } from "../game/board";
import type { GameMode } from "../game/mode";
import { isDart } from "../game/scoring";
import { MAX_DARTS_PER_VISIT, type LegState, type PlayerId } from "../game/types";
import { dartsOf, lastOpenVisit, playerOnTurn, popDart, shownVisit, withDart } from "../game/visits";
import { closedFields, CRICKET_FIELDS, isClosedForAll, tally } from "./tally";

const finished = (state: LegState) => tally(state).winner !== null;
const openVisit = (state: LegState) => lastOpenVisit(state, finished(state));
const currentPlayer = (state: LegState) => playerOnTurn(state, openVisit(state) !== null, finished(state));

/** Winner first, then by points, then by closed fields; equal points and fields share a place. */
function standings(state: LegState): PlayerId[][] {
  const t = tally(state);
  return groupStandings(state.players, (a, b) => t.points[b] - t.points[a] || closedFields(t, b) - closedFields(t, a), t.winner);
}

/** Cricket (legacy CricketGame, M7): marks on 15–20 and Bull, points from the fourth mark on. No average (29.10.2026). */
export const cricket: GameMode = {
  applyDart(state, dart) {
    if (!isDart(dart)) return { ok: false, reason: "invalid-dart" };
    if (finished(state)) return { ok: false, reason: "leg-finished" };
    return { ok: true, value: withDart(state, openVisit(state), currentPlayer(state), dart) };
  },
  undoDart: popDart,
  isOpenVisit: (state, index) => index === state.visits.length - 1 && openVisit(state) !== null,
  currentPlayer,
  isLegFinished: finished,
  standings,
  board(state, names) {
    const t = tally(state);
    const done = t.winner !== null;
    const active = currentPlayer(state);
    const open = openVisit(state);
    const players = state.players.map((id): PlayerPanelData => ({
      id,
      name: names[id] ?? id,
      score: t.points[id],
      darts: dartsOf(state, id),
      average: null,
      isActive: id === active,
      isWinner: id === t.winner,
      slots: slotsOf(shownVisit(state, id, active, open), id === active, done),
      isBust: false,
      placement: null,
      isOut: false,
      marks: CRICKET_FIELDS.map((field) => ({ field, marks: Math.min(3, t.marks[id][field]), closed: isClosedForAll(t, state.players, field) })),
    }));
    const missing = CRICKET_FIELDS.find((f) => t.marks[active][f] < 3);
    return {
      mode: "cricket",
      players,
      activePlayerId: active,
      winnerId: t.winner,
      dartsLeft: done ? 0 : MAX_DARTS_PER_VISIT - (open?.darts.length ?? 0),
      hint: done || missing === undefined ? null : { kind: "marks", field: missing, missing: 3 - t.marks[active][missing] },
      canUndo: state.visits.length > 0,
      ranking: standings(state).flat(),
    };
  },
};
