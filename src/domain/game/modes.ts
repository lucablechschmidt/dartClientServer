import { x01 } from "../x01/mode";
import type { ScoreboardView } from "./board";
import type { GameMode } from "./mode";
import type { ApplyError, Dart, LegState, ModeId, PlayerId, PlayOutError, Result, UndoError, Visit } from "./types";

/**
 * Registry of the game modes (M7) and the functions everything outside a mode calls: they look up
 * the leg's mode and delegate. Adding a mode means adding it here, nothing else changes.
 */
const MODES: Partial<Record<ModeId, GameMode>> = { x01 };

export function modeOf(state: Pick<LegState, "mode">): GameMode {
  const mode = MODES[state.mode];
  if (!mode) throw new Error(`unknown game mode ${state.mode}`);
  return mode;
}

export const applyDart = (state: LegState, dart: Dart): Result<LegState, ApplyError> => modeOf(state).applyDart(state, dart);
export const undoDart = (state: LegState): Result<LegState, UndoError> => modeOf(state).undoDart(state);
export const isOpenVisit = (state: LegState, index: number): boolean => modeOf(state).isOpenVisit(state, index);
export const currentPlayer = (state: LegState): PlayerId => modeOf(state).currentPlayer(state);
export const isLegFinished = (state: LegState): boolean => modeOf(state).isLegFinished(state);
export const standings = (state: LegState): PlayerId[][] => modeOf(state).standings(state);
export const projectBoard = (state: LegState, names: Record<PlayerId, string>): ScoreboardView => modeOf(state).board(state, names);

/** The visit still taking darts, if any. */
export function openVisit(state: LegState): Visit | null {
  const i = state.visits.length - 1;
  return i >= 0 && isOpenVisit(state, i) ? state.visits[i] : null;
}

/** Winner of a finished leg: first place (on a tie the first of them in seat order). */
export function winnerOf(state: LegState): PlayerId | null {
  return isLegFinished(state) ? (standings(state)[0]?.[0] ?? null) : null;
}

// Play-out (X01 only, M5 plan §9.2); other modes have no last player who plays on.
export const remainingPlayer = (state: LegState): PlayerId | null => modeOf(state).playOut?.remainingPlayer(state) ?? null;
export const playOutUndo = (state: LegState): LegState | null => modeOf(state).playOut?.playOutUndo(state) ?? null;
const noPlayOut = { ok: false, reason: "no-play-out" } as const;
export const startPlayOut = (state: LegState): Result<LegState, PlayOutError> => modeOf(state).playOut?.startPlayOut(state) ?? noPlayOut;
export const resign = (state: LegState): Result<LegState, PlayOutError> => modeOf(state).playOut?.resign(state) ?? noPlayOut;
