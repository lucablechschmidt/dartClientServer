import { tally } from "../cricket/tally";
import type { LegState, PlayerId } from "../game/types";
import { rounds } from "../splitscore/rounds";

/** Modes whose result is a points total at the end: Cricket and SplitScore (one leg per match). */
export const POINTS_MODES = ["cricket", "splitscore"] as const;
export type PointsMode = (typeof POINTS_MODES)[number];

/** A player's points at the end of their matches of one mode, whatever the place. */
export type PointsStats = {
  games: number;
  /** Most points at the end of one match. */
  highScore: number;
  /** Mean of the points at the end, over the games. */
  average: number;
};

/** Points of `player` at the end of a leg, by the mode's own scoring. */
const pointsOf: Record<PointsMode, (leg: LegState, player: PlayerId) => number> = {
  cricket: (leg, player) => tally(leg).points[player] ?? 0,
  splitscore: (leg, player) => rounds(leg).points[player] ?? 0,
};

/**
 * High score and average of the points at the end of each match (the last leg; these modes have
 * one), only the points, not the place. `matches` holds the legs of each finished match of `mode`
 * the player took part in; null without such a match.
 */
export function pointsStats(mode: PointsMode, matches: readonly (readonly LegState[])[], player: PlayerId): PointsStats | null {
  const finals = matches.flatMap((legs) => {
    const last = legs.at(-1);
    return last ? [pointsOf[mode](last, player)] : [];
  });
  if (finals.length === 0) return null;
  return {
    games: finals.length,
    highScore: Math.max(...finals),
    average: finals.reduce((sum, p) => sum + p, 0) / finals.length,
  };
}
