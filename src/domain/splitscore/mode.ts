import { slotsOf, type PlayerPanelData } from "../game/board";
import type { GameMode } from "../game/mode";
import { dartScore, isDart } from "../game/scoring";
import { MAX_DARTS_PER_VISIT, type Dart, type LegState, type PlayerId } from "../game/types";
import { isClosedByDarts, playerOnTurn, popDart, withDart } from "../game/visits";
import { hitsTarget, rounds, targetOfVisit, TARGETS } from "./rounds";

const OVERTHROWN: Dart = { field: 0, type: "overthrown" };

const finished = (state: LegState) => {
  const last = state.visits.at(-1);
  return state.visits.length === TARGETS.length * state.players.length && last !== undefined && isClosedByDarts(last);
};
const lastOpen = (state: LegState) => {
  const last = state.visits.at(-1);
  return last !== undefined && !isClosedByDarts(last);
};
const currentPlayer = (state: LegState) => playerOnTurn(state, lastOpen(state), finished(state));

/** By points; equal points share a place (M7 plan §9.4). */
function standings(state: LegState): PlayerId[][] {
  const { points } = rounds(state);
  const groups: PlayerId[][] = [];
  for (const p of [...state.players].sort((a, b) => points[b] - points[a])) {
    const prev = groups.at(-1)?.[0];
    if (prev && points[prev] === points[p]) groups.at(-1)!.push(p);
    else groups.push([p]);
  }
  return groups;
}

/** Points hit per complete visit. */
function average(state: LegState, player: PlayerId): number {
  const done = state.visits.filter((v) => v.playerId === player && isClosedByDarts(v));
  const hit = done.reduce((sum, v) => sum + v.darts.reduce((n, d) => n + dartScore(d), 0), 0);
  return done.length === 0 ? 0 : hit / done.length;
}

/** SplitScore (legacy SplitScoreGame, M7): hit the round's target or lose half of your points. */
export const splitscore: GameMode = {
  applyDart(state, dart) {
    if (!isDart(dart)) return { ok: false, reason: "invalid-dart" };
    if (finished(state)) return { ok: false, reason: "leg-finished" };
    const open = lastOpen(state) ? state.visits.at(-1)! : null;
    const target = targetOfVisit(state, open ? state.visits.length - 1 : state.visits.length)!;
    // A dart off the target is as good as missing the board: stored overthrown (legacy addSingleFaultyDartScore).
    return { ok: true, value: withDart(state, open, currentPlayer(state), hitsTarget(dart, target) ? dart : OVERTHROWN) };
  },
  undoDart: popDart,
  isOpenVisit: (state, index) => index === state.visits.length - 1 && lastOpen(state),
  currentPlayer,
  isLegFinished: finished,
  standings,
  board(state, names) {
    const r = rounds(state);
    const done = finished(state);
    const active = currentPlayer(state);
    const open = lastOpen(state) ? state.visits.at(-1)! : null;
    const ranking = standings(state);
    const players = state.players.map((id): PlayerPanelData => {
      const own = state.visits.filter((v) => v.playerId === id);
      const visit = id === active ? (open ?? { playerId: id, darts: [], isBust: false }) : (own.at(-1) ?? { playerId: id, darts: [], isBust: false });
      return {
        id,
        name: names[id] ?? id,
        score: r.points[id],
        darts: own.reduce((n, v) => n + v.darts.length, 0),
        average: average(state, id),
        isActive: id === active,
        isWinner: done && ranking[0].includes(id),
        slots: slotsOf(visit, id === active, done),
        isBust: false,
        placement: null,
        isOut: false,
      };
    });
    return {
      mode: "splitscore",
      players,
      activePlayerId: active,
      winnerId: done ? ranking[0][0] : null,
      dartsLeft: done ? 0 : MAX_DARTS_PER_VISIT - (open?.darts.length ?? 0),
      hint: r.target && !done ? { kind: "target", target: r.target } : null,
      canUndo: state.visits.length > 0,
      ranking: ranking.flat(),
    };
  },
};
