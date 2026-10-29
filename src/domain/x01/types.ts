/** Port of SingleDartsScore / DartThrow / ClassicGame (docs/legacy-analysis.md §1–3). */

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

export type Rules = {
  startScore: number;
  inRule: InRule;
  outRule: OutRule;
};

/**
 * The complete state of a leg is the ordered list of visits.
 * Rest, player on turn, placements and winner are derived from it (selectors.ts).
 */
export type LegState = {
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
