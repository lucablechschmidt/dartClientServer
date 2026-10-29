import type { GameMode } from "../game/mode";
import { playOutUndo, resign, startPlayOut, undoDart, applyDart } from "./apply";
import { currentPlayer, isLegFinished, isOpenVisit, placements, remainingPlayer } from "./selectors";
import { projectScoreboard } from "./view";

/** X01 behind the mode interface (M7); the functions themselves are unchanged since M5. */
export const x01: GameMode = {
  applyDart,
  undoDart,
  isOpenVisit,
  currentPlayer,
  isLegFinished,
  standings: (state) => placements(state).map((p) => [p]),
  board: projectScoreboard,
  playOut: { remainingPlayer, playOutUndo, startPlayOut, resign },
};
