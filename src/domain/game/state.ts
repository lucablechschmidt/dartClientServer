import type { LegState, ModeId, PlayerId, Rules } from "./types";

export function newLeg(players: PlayerId[], rules: Rules, starter = 0, mode: ModeId = "x01"): LegState {
  if (players.length === 0) throw new Error("a leg needs at least one player");
  return { mode, players: [...players], rules, starter: starter % players.length, visits: [], playOut: false };
}
