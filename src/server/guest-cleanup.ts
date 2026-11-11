import { factsOf } from "@/domain/achievements/detect";
import { ABANDONED_LIFETIME_MS } from "@/domain/game";
import { fieldHits } from "@/domain/stats/field-hits";
import type { Deps } from "./deps";

/**
 * E12: guest matches live only as long as their longest-visible guest. After that the field hits
 * and (M10) achievements of the regular participants are saved, then match, legs and visits are deleted,
 * finally the guests that are no longer in any match. A cancelled guest match saves nothing, it counts nowhere.
 * Returns the number of deleted matches.
 */
export function cleanupGuests(deps: Deps): number {
  const now = deps.now();
  const expired = deps.matches.listExpiredGuestMatches(now);
  for (const match of expired) {
    // Per match: either the field hits are saved and the match is gone, or neither happened.
    deps.transaction(() => {
      for (const playerId of match.abandoned ? [] : match.regularPlayerIds) {
        const hits = fieldHits(match.visits.filter((v) => v.playerId === playerId));
        if (hits.size > 0) deps.players.addFieldHits(playerId, hits);
        // M10: achievements from guest matches count, so they outlive the match (m10-plan §2).
        if (match.finished) deps.players.addAchievements(playerId, [...factsOf(match.finished, playerId)], match.finished.finishedAt);
      }
      deps.matches.deleteMatch(match.id);
    });
  }
  deps.players.deleteOrphanGuests(now);
  return expired.length;
}

/**
 * Cancelled matches count in no statistics and no achievement; 24 h after their start they are deleted
 * with legs, visits and seats (a tournament fixture they belonged to is open again). Returns the number.
 */
export function cleanupAbandoned(deps: Deps): number {
  const ids = deps.matches.listAbandonedMatchIds(deps.now() - ABANDONED_LIFETIME_MS);
  for (const id of ids) deps.matches.deleteMatch(id);
  return ids.length;
}

/** Once a day is enough: guests live 24 h, a few hours of overhang do no harm. */
export const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
