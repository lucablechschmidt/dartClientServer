/** Port of SingleDartsScore / DartThrow (docs/legacy-analysis.md §1–3): types shared by all game modes (M7). */

/** The four legacy game modes; the value of `match.mode`. */
export type ModeId = "x01" | "cricket" | "elimination" | "splitscore";
export const MODE_IDS: readonly ModeId[] = ["x01", "cricket", "elimination", "splitscore"];

export type PlayerId = string;

export type DartType = "single" | "double" | "triple" | "overthrown";

/** One dart. field 0 (miss), 1–20 or 25 (bull). overthrown = placeholder after a bust, scores 0. */
export type Dart = {
  field: number;
  type: DartType;
};

/** One visit (DartThrow): up to three darts of one player. On a bust the remaining slots are overthrown. */
export type Visit = {
  playerId: PlayerId;
  darts: Dart[];
  isBust: boolean;
};

export type InRule = "single" | "double" | "triple";
export type OutRule = "single" | "double" | "triple";

/**
 * Options of a match. X01: start score and in/out rule. Elimination (M7): `startScore` is the
 * target to reach, `outRule` as in X01. SplitScore: `startScore` is the start (40). Cricket: unused.
 */
export type Rules = {
  startScore: number;
  inRule: InRule;
  outRule: OutRule;
};

/**
 * The complete state of a leg is the ordered list of visits; everything else (score, player on
 * turn, places, winner) is derived from it by the leg's game mode (game/modes.ts).
 */
export type LegState = {
  mode: ModeId;
  players: PlayerId[];
  rules: Rules;
  /** Index in players of who throws first in the leg. */
  starter: number;
  visits: Visit[];
  /**
   * 3+ players, places already fixed: the last player still plays to his checkout (M5 plan §9.2).
   * Never changes a place, only adds visits for the statistics.
   */
  playOut: boolean;
};

export type Result<T, E extends string> = { ok: true; value: T } | { ok: false; reason: E };

export type ApplyError = "leg-finished" | "invalid-dart";
export type UndoError = "nothing-to-undo";
export type PlayOutError = "no-play-out";
export type StarterError = "leg-started" | "unknown-player" | "leg-finished";

export const MAX_DARTS_PER_VISIT = 3;
