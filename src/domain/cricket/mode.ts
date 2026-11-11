import { groupStandings, slotsOf, type PlayerPanelData } from "../game/board";
import type { GameMode } from "../game/mode";
import { isDart } from "../game/scoring";
import { MAX_DARTS_PER_VISIT, type LegState, type PlayerId, type Result, type UndoError } from "../game/types";
import { dartsOf, lastOpenVisit, nextSeat, playerOnTurn, previousVisit, shownVisit, withDart } from "../game/visits";
import { closedFields, CRICKET_FIELDS, isClosedForAll, tally } from "./tally";

/**
 * Undo: the misses at the end of a visit go back all at once (in Cricket a miss is only entered with the
 * X key, 11.11.2026, which fills the rest of the visit; like the
 * filled slots of a bust in X01); any other dart one by one.
 */
function undoDart(state: LegState): Result<LegState, UndoError> {
  const last = state.visits.at(-1);
  if (!last) return { ok: false, reason: "nothing-to-undo" };
  let keep = last.darts.length - 1;
  if (last.darts[keep]?.field === 0) while (keep > 0 && last.darts[keep - 1].field === 0) keep--;
  const darts = last.darts.slice(0, keep);
  const visits = darts.length === 0 ? state.visits.slice(0, -1) : [...state.visits.slice(0, -1), { ...last, darts }];
  return { ok: true, value: { ...state, visits } };
}

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
  undoDart,
  isOpenVisit: (state, index) => index === state.visits.length - 1 && openVisit(state) !== null,
  currentPlayer,
  isLegFinished: finished,
  standings,
  board(state, names) {
    const t = tally(state);
    const done = t.winner !== null;
    const active = currentPlayer(state);
    const open = openVisit(state);
    const alone = state.players.length === 1;
    const players = state.players.map((id): PlayerPanelData => ({
      id,
      name: names[id] ?? id,
      score: t.points[id],
      darts: dartsOf(state, id),
      average: null,
      isActive: id === active,
      isWinner: id === t.winner,
      slots: slotsOf(shownVisit(state, id, active, open), id === active, done, alone ? previousVisit(state, id, open) : null),
      isBust: false,
      placement: null,
      isOut: false,
      marks: CRICKET_FIELDS.map((field) => ({
        field,
        marks: Math.min(3, t.marks[id][field]),
        closed: isClosedForAll(t, state.players, field),
      })),
    }));
    return {
      mode: "cricket",
      players,
      activePlayerId: active,
      winnerId: t.winner,
      dartsLeft: done ? 0 : MAX_DARTS_PER_VISIT - (open?.darts.length ?? 0),
      hint: null,
      // a field everyone has closed scores nobody anything: its key is off (adaptive keypad, 11.11.2026)
      liveKeys: { fields: CRICKET_FIELDS.filter((f) => !isClosedForAll(t, state.players, f)), rings: ["single", "double", "triple"] },
      canUndo: state.visits.length > 0,
      ranking: standings(state).flat(),
      nextPlayerId: done ? undefined : nextSeat(state.players, active),
    };
  },
};
