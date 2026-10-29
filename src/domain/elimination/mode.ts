import { slotsOf, type PlayerPanelData } from "../game/board";
import type { GameMode } from "../game/mode";
import { dartScore, isDart } from "../game/scoring";
import { MAX_DARTS_PER_VISIT, type Dart, type LegState, type PlayerId } from "../game/types";
import { isClosedByDarts, playerOnTurn, popDart, withDart } from "../game/visits";
import { isValidDart, nextElimination, scores } from "./scores";

const OVERTHROWN: Dart = { field: 0, type: "overthrown" };

const finished = (state: LegState) => scores(state).winner !== null;
const lastOpen = (state: LegState) => {
  const last = state.visits.at(-1);
  return last !== undefined && !isClosedByDarts(last) && !finished(state);
};
const currentPlayer = (state: LegState) => playerOnTurn(state, lastOpen(state), finished(state));

/** Winner first, then by points; equal points share a place. */
function standings(state: LegState): PlayerId[][] {
  const s = scores(state);
  const others = state.players.filter((p) => p !== s.winner).sort((a, b) => s.points[b] - s.points[a]);
  const groups: PlayerId[][] = s.winner ? [[s.winner]] : [];
  for (const p of others) {
    const prev = groups.at(-1)?.[0];
    if (prev && prev !== s.winner && s.points[prev] === s.points[p]) groups.at(-1)!.push(p);
    else groups.push([p]);
  }
  return groups;
}

/** Points scored per closed visit (overthrown darts score nothing; eliminations by others are not subtracted). */
function average(state: LegState, player: PlayerId): number {
  const closed = state.visits.filter((v, i) => v.playerId === player && (i < state.visits.length - 1 || !lastOpen(state)));
  const points = closed.reduce((sum, v) => sum + v.darts.reduce((n, d) => n + dartScore(d), 0), 0);
  return closed.length === 0 ? 0 : points / closed.length;
}

/** Elimination (legacy EliminationGame, M7): count up to the target, landing on someone sends him back to 0. */
export const elimination: GameMode = {
  applyDart(state, dart) {
    if (!isDart(dart)) return { ok: false, reason: "invalid-dart" };
    if (finished(state)) return { ok: false, reason: "leg-finished" };
    const player = currentPlayer(state);
    const open = lastOpen(state) ? state.visits.at(-1)! : null;
    const valid = isValidDart(state, scores(state).points[player], dart);
    return { ok: true, value: valid ? withDart(state, open, player, dart) : withDart(state, open, player, OVERTHROWN, true) };
  },
  undoDart: popDart,
  isOpenVisit: (state, index) => index === state.visits.length - 1 && lastOpen(state),
  currentPlayer,
  isLegFinished: finished,
  standings,
  board(state, names) {
    const s = scores(state);
    const done = s.winner !== null;
    const active = currentPlayer(state);
    const open = lastOpen(state) ? state.visits.at(-1)! : null;
    const players = state.players.map((id): PlayerPanelData => {
      const own = state.visits.filter((v) => v.playerId === id);
      const visit = id === active ? (open ?? { playerId: id, darts: [], isBust: false }) : (own.at(-1) ?? { playerId: id, darts: [], isBust: false });
      return {
        id,
        name: names[id] ?? id,
        score: s.points[id],
        darts: own.reduce((n, v) => n + v.darts.length, 0),
        average: average(state, id),
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
