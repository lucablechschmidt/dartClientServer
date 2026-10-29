import { fieldHits } from "@/domain/stats/field-hits";
import type { Deps } from "./deps";

/**
 * E12: guest matches live only as long as their longest-visible guest. After that the field hits
 * of the regular participants are saved, then match, legs and visits are deleted,
 * finally the guests that are no longer in any match. Returns the number of deleted matches.
 */
export function cleanupGuests(deps: Deps): number {
  const now = deps.now();
  const expired = deps.matches.listExpiredGuestMatches(now);
  for (const match of expired) {
    // Per match: either the field hits are saved and the match is gone, or neither happened.
    deps.transaction(() => {
      for (const playerId of match.regularPlayerIds) {
        const hits = fieldHits(match.visits.filter((v) => v.playerId === playerId));
        if (hits.size > 0) deps.players.addFieldHits(playerId, hits);
      }
      deps.matches.deleteMatch(match.id);
    });
  }
  deps.players.deleteOrphanGuests(now);
  return expired.length;
}

/** Once a day is enough: guests live 24 h, a few hours of overhang do no harm. */
export const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
