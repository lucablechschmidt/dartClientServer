import type { MatchState } from "./match";
import { MAX_DARTS_PER_VISIT, type Visit } from "./types";

/** T20 T20 T20 thrown and counted (no bust); the 180 achievement and the 180 sound (M11). */
export const isMaximum = (v: Visit): boolean =>
  !v.isBust && v.darts.length === MAX_DARTS_PER_VISIT && v.darts.every((d) => d.type === "triple" && d.field === 20);

const dartCount = (m: MatchState) => m.legs.reduce((n, leg) => n + leg.visits.reduce((k, v) => k + v.darts.length, 0), 0);

/** The last visit of the match with its place (leg, visit), or null before the first dart. */
function lastVisit(m: MatchState): { leg: number; index: number; visit: Visit } | null {
  for (let leg = m.legs.length - 1; leg >= 0; leg--) {
    const visits = m.legs[leg].visits;
    if (visits.length > 0) return { leg, index: visits.length - 1, visit: visits[visits.length - 1] };
  }
  return null;
}

/**
 * M11 180 sound: did the step from `prev` to `next` just complete a 180? Only when darts were added
 * (thrown here or arriving from another device), so an undo that uncovers an older 180, or a reload,
 * stays silent.
 */
export function completesMaximum(prev: MatchState, next: MatchState): boolean {
  if (dartCount(next) <= dartCount(prev)) return false;
  const last = lastVisit(next);
  if (!last || !isMaximum(last.visit)) return false;
  const before = prev.legs.at(last.leg)?.visits.at(last.index);
  return !before || !isMaximum(before);
}
