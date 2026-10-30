import { dartScore } from "../game/scoring";
import { MAX_DARTS_PER_VISIT, type Dart, type LegState, type PlayerId } from "../game/types";

/** Port of SplitScoreGame (legacy-analysis.md §6): one round per target, nine rounds. */

export const TARGETS = ["15", "16", "double", "17", "18", "triple", "19", "20", "bull"] as const;
export type Target = (typeof TARGETS)[number];

/** Port of dartHasHitCurrentField. */
export function hitsTarget(dart: Dart, target: Target): boolean {
  if (target === "double") return dart.type === "double";
  if (target === "triple") return dart.type === "triple";
  if (target === "bull") return dart.field === 25 && dart.type !== "overthrown";
  return dart.type !== "overthrown" && dart.field === Number(target);
}

/** Target of the visit at `index`: every player throws one visit per round, in seat order from the starter. */
export const targetOfVisit = (state: LegState, index: number): Target | null => TARGETS[Math.floor(index / state.players.length)] ?? null;

export type Rounds = {
  points: Record<PlayerId, number>;
  /** Target of the visit being thrown or coming next; null after the last round. */
  target: Target | null;
};

/**
 * Port of switchPlayers/recalculateScores: a complete visit with at least one hit adds its points
 * (darts off the target are stored overthrown and score 0), without a hit the score is halved, rounded up.
 */
export function rounds(state: LegState): Rounds {
  const points: Record<PlayerId, number> = Object.fromEntries(state.players.map((p) => [p, state.rules.startScore]));
  state.visits.forEach((visit) => {
    if (visit.darts.length < MAX_DARTS_PER_VISIT) return;
    const hit = visit.darts.some((d) => d.type !== "overthrown");
    points[visit.playerId] = hit
      ? points[visit.playerId] + visit.darts.reduce((n, d) => n + dartScore(d), 0)
      : Math.ceil(points[visit.playerId] / 2);
  });
  const last = state.visits.at(-1);
  const next = last && last.darts.length < MAX_DARTS_PER_VISIT ? state.visits.length - 1 : state.visits.length;
  return { points, target: targetOfVisit(state, next) };
}
