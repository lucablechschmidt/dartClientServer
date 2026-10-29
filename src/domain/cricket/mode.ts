import { slotsOf, type PlayerPanelData } from "../game/board";
import type { GameMode } from "../game/mode";
import { isDart } from "../game/scoring";
import { MAX_DARTS_PER_VISIT, type LegState, type PlayerId } from "../game/types";
import { isClosedByDarts, playerOnTurn, popDart, withDart } from "../game/visits";
import { closedFields, CRICKET_FIELDS, isClosedForAll, tally } from "./tally";

const finished = (state: LegState) => tally(state).winner !== null;
const lastOpen = (state: LegState) => {
  const last = state.visits.at(-1);
  return last !== undefined && !isClosedByDarts(last) && !finished(state);
};
const currentPlayer = (state: LegState) => playerOnTurn(state, lastOpen(state), finished(state));

/** Winner first, then by points, then by closed fields; equal points and fields share a place. */
function standings(state: LegState): PlayerId[][] {
  const t = tally(state);
  const key = (p: PlayerId) => [t.points[p], closedFields(t, p)] as const;
  const others = state.players.filter((p) => p !== t.winner).sort((a, b) => key(b)[0] - key(a)[0] || key(b)[1] - key(a)[1]);
  const groups: PlayerId[][] = t.winner ? [[t.winner]] : [];
  for (const p of others) {
    const prev = groups.at(-1)?.[0];
    if (prev && prev !== t.winner && key(prev)[0] === key(p)[0] && key(prev)[1] === key(p)[1]) groups.at(-1)!.push(p);
    else groups.push([p]);
  }
  return groups;
}

/** Cricket (legacy CricketGame, M7): marks on 15–20 and Bull, points from the fourth mark on. */
export const cricket: GameMode = {
  applyDart(state, dart) {
    if (!isDart(dart)) return { ok: false, reason: "invalid-dart" };
    if (finished(state)) return { ok: false, reason: "leg-finished" };
    const open = lastOpen(state) ? state.visits.at(-1)! : null;
    return { ok: true, value: withDart(state, open, currentPlayer(state), dart) };
  },
  undoDart: popDart,
  isOpenVisit: (state, index) => index === state.visits.length - 1 && lastOpen(state),
  currentPlayer,
  isLegFinished: finished,
  standings,
  board(state, names) {
    const t = tally(state);
    const done = t.winner !== null;
    const active = currentPlayer(state);
    const open = lastOpen(state) ? state.visits.at(-1)! : null;
    const players = state.players.map((id): PlayerPanelData => {
      const own = state.visits.filter((v) => v.playerId === id);
      const visit = id === active ? (open ?? { playerId: id, darts: [], isBust: false }) : (own.at(-1) ?? { playerId: id, darts: [], isBust: false });
      return {
        id,
        name: names[id] ?? id,
        score: t.points[id],
        darts: own.reduce((n, v) => n + v.darts.length, 0),
        average: null,
        isActive: id === active,
        isWinner: id === t.winner,
        slots: slotsOf(visit, id === active, done),
        isBust: false,
        placement: null,
        isOut: false,
        marks: CRICKET_FIELDS.map((field) => ({ field, marks: Math.min(3, t.marks[id][field]), closed: isClosedForAll(t, state.players, field) })),
      };
    });
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
