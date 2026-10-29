import type { LegState, PlayerId, Rules } from "./types";

export function newLeg(players: PlayerId[], rules: Rules, starter = 0): LegState {
  if (players.length === 0) throw new Error("a leg needs at least one player");
  return { players: [...players], rules, starter: starter % players.length, visits: [], playOut: false };
}
