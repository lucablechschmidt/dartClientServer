import type { ScoreboardView } from "./board";
import type { ApplyError, Dart, LegState, PlayerId, PlayOutError, Result, UndoError } from "./types";

/**
 * One game mode (architecture.md §9, open/closed; M7). Server, scoring screen, permissions and the
 * network protocol only use this interface; X01, Cricket, Elimination and SplitScore implement it.
 * The state of a leg is always its list of visits (storage format, architecture.md §6).
 */
export interface GameMode {
  /** A dart for the player on turn; an invalid dart may close the visit (bust) instead of an error. */
  applyDart(state: LegState, dart: Dart): Result<LegState, ApplyError>;
  /** Takes back one dart (or one step, see X01 play-out). */
  undoDart(state: LegState): Result<LegState, UndoError>;
  /** Visit at `index` still takes darts: not full, not busted, not ending the leg. */
  isOpenVisit(state: LegState, index: number): boolean;
  currentPlayer(state: LegState): PlayerId;
  isLegFinished(state: LegState): boolean;
  /** Place groups so far, best first; players in one group share the place. */
  standings(state: LegState): PlayerId[][];
  board(state: LegState, names: Record<PlayerId, string>): ScoreboardView;
  /** X01 only (M5 plan §9.2): the last player plays to his checkout. */
  playOut?: {
    remainingPlayer(state: LegState): PlayerId | null;
    playOutUndo(state: LegState): LegState | null;
    startPlayOut(state: LegState): Result<LegState, PlayOutError>;
    resign(state: LegState): Result<LegState, PlayOutError>;
  };
}
