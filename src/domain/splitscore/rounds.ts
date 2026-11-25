import { dartScore } from "../game/scoring";
import type { LiveKeys } from "../game/board";
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

/** One visit of the match history: the darts, whether one hit the target, the change and the score after it. */
export type RoundVisit = {
  playerId: PlayerId;
  target: Target;
  darts: Dart[];
  /** At least one dart on the target: the visit's points were added; otherwise the score was halved. */
  hit: boolean;
  /** Points added, or (negative) the points lost by halving. */
  change: number;
  score: number;
};

/** The match history (25.11.2026): every complete visit in throwing order, with the same rules as `rounds`. */
export function roundLog(state: LegState): RoundVisit[] {
  const points: Record<PlayerId, number> = Object.fromEntries(state.players.map((p) => [p, state.rules.startScore]));
  return state.visits.flatMap((visit, index) => {
    const target = targetOfVisit(state, index);
    if (!target || visit.darts.length < MAX_DARTS_PER_VISIT) return [];
    const before = points[visit.playerId];
    const hit = visit.darts.some((d) => d.type !== "overthrown");
    const score = hit ? before + visit.darts.reduce((n, d) => n + dartScore(d), 0) : Math.ceil(before / 2);
    points[visit.playerId] = score;
    return [{ playerId: visit.playerId, target, darts: visit.darts, hit, change: score - before, score }];
  });
}

const NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);

/** Adaptive keypad (11.11.2026): the darts that hit `target`; every other key is off. */
export function liveKeysOf(target: Target): LiveKeys {
  switch (target) {
    case "double":
      return { fields: [...NUMBERS, 25], rings: ["double"] };
    case "triple":
      return { fields: NUMBERS, rings: ["triple"] };
    case "bull":
      return { fields: [25], rings: ["single", "double"] };
    default:
      return { fields: [Number(target)], rings: ["single", "double", "triple"] };
  }
}
