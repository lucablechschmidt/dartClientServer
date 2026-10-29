import { newLeg } from "./state";
import type { LegState, PlayerId, Rules, Visit } from "./types";

/**
 * State from stored visits. Since the state consists only of the visit list,
 * replay is plain copying; the function exists as the single place
 * where DB rows become domain state.
 */
export function replay(players: PlayerId[], rules: Rules, visits: Visit[], starter = 0): LegState {
  const state = newLeg(players, rules, starter);
  return { ...state, visits: visits.map((v) => ({ ...v, darts: [...v.darts] })) };
}
