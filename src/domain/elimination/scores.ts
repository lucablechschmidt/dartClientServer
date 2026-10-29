import { dartScore } from "../game/scoring";
import type { Dart, LegState, PlayerId } from "../game/types";

/** Port of EliminationGame (legacy-analysis.md §5): points count up from 0 to the target. */

export type Scores = {
  points: Record<PlayerId, number>;
  winner: PlayerId | null;
};

const target = (state: LegState) => state.rules.startScore;

/**
 * Is `dart` allowed at `score`? Past the target never; exactly on it only with the out rule (single
 * out = any dart, as in X01). Port of isValidDartScore.
 */
export function isValidDart(state: LegState, score: number, dart: Dart): boolean {
  const after = score + dartScore(dart);
  if (after > target(state)) return false;
  if (after === target(state)) return state.rules.outRule === "single" || dart.type === state.rules.outRule;
  return true;
}

/**
 * The leg replayed dart by dart. Overthrown darts (busts) count nothing; a dart that lands exactly
 * on other players' score sends all of them back to 0. Undo needs no bookkeeping: replaying the
 * shorter list brings them back (legacy kept an `Elimination` record for that).
 */
export function scores(state: LegState): Scores {
  const points: Record<PlayerId, number> = Object.fromEntries(state.players.map((p) => [p, 0]));
  let winner: PlayerId | null = null;
  for (const visit of state.visits) {
    for (const dart of visit.darts) {
      if (winner || dart.type === "overthrown") continue;
      const after = points[visit.playerId] + dartScore(dart);
      for (const p of state.players) if (p !== visit.playerId && points[p] === after) points[p] = 0;
      points[visit.playerId] = after;
      if (after === target(state)) winner = visit.playerId;
    }
  }
  return { points, winner };
}

/** Points to the nearest player above, who the next landing on his score would send back to 0. */
export function nextElimination(s: Scores, player: PlayerId): number | null {
  const gaps = Object.entries(s.points)
    .filter(([p, v]) => p !== player && v > s.points[player])
    .map(([, v]) => v - s.points[player]);
  return gaps.length > 0 ? Math.min(...gaps) : null;
}
