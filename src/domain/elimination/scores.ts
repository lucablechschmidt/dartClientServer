import { dartScore, isDart } from "../game/scoring";
import { MAX_DARTS_PER_VISIT, type Dart, type DartType, type LegState, type PlayerId } from "../game/types";

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

/** What one dart can score, a miss (0) included. */
const DART_POINTS: readonly number[] = [
  ...new Set(
    Array.from({ length: 26 }, (_, field) => field).flatMap((field) =>
      (["single", "double", "triple"] as DartType[]).filter((type) => isDart({ field, type })).map((type) => dartScore({ field, type })),
    ),
  ),
];

/** SUMS[k]: every total of at most k darts (a miss counts 0). */
const SUMS: readonly ReadonlySet<number>[] = Array.from({ length: MAX_DARTS_PER_VISIT }).reduce<Set<number>[]>(
  (sums) => [...sums, new Set([...sums[sums.length - 1]].flatMap((sum) => DART_POINTS.map((d) => sum + d)))],
  [new Set([0])],
);

/** Can `darts` darts score exactly `points` (> 0)? 31 with one dart no, 32 (D16) yes. */
export function reachable(points: number, darts: number): boolean {
  return points > 0 && darts > 0 && (SUMS[Math.min(darts, MAX_DARTS_PER_VISIT)]?.has(points) ?? false);
}

/** Gaps to the players above `player`, nearest first. */
const gapsAbove = (s: Scores, player: PlayerId): number[] =>
  Object.entries(s.points)
    .filter(([p, v]) => p !== player && v > s.points[player])
    .map(([, v]) => v - s.points[player])
    .sort((a, b) => a - b);

/** Points to the nearest player above whom the darts left can still reach exactly (and send back to 0). */
export function nextElimination(s: Scores, player: PlayerId, dartsLeft: number): number | null {
  return gapsAbove(s, player).find((gap) => reachable(gap, dartsLeft)) ?? null;
}

/** Points to the nearest player above, reachable or not. */
export function gapAbove(s: Scores, player: PlayerId): number | null {
  return gapsAbove(s, player).at(0) ?? null;
}
