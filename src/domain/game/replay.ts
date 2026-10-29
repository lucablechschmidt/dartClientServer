import { newLeg } from "./state";
import type { MatchFormat, MatchState } from "./match";
import type { LegState, ModeId, PlayerId, Rules, Visit } from "./types";

/**
 * State from stored visits. Since the state consists only of the visit list,
 * replay is plain copying; the function exists as the single place
 * where DB rows become domain state.
 */
export function replay(players: PlayerId[], rules: Rules, visits: Visit[], starter = 0, playOut = false, mode: ModeId = "x01"): LegState {
  const state = newLeg(players, rules, starter, mode);
  return { ...state, visits: visits.map((v) => ({ ...v, darts: [...v.darts] })), playOut };
}

export type StoredLeg = { starter: number; visits: Visit[]; playOut: boolean };

/** All legs of a match, in order. A match without a stored leg gets an empty first one. */
export function replayMatch(players: PlayerId[], rules: Rules, format: MatchFormat, legs: StoredLeg[], starter = 0, mode: ModeId = "x01"): MatchState {
  const states = legs.map((l) => replay(players, rules, l.visits, l.starter, l.playOut, mode));
  return { mode, players: [...players], rules, format, legs: states.length > 0 ? states : [newLeg(players, rules, starter, mode)] };
}
