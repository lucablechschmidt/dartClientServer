import type { FinishedMatch } from "@/db/repository";
import { factsOf } from "@/domain/achievements/detect";
import { gallery, newlyEarned, type FactSource, type GalleryItem } from "@/domain/achievements/gallery";
import type { AchievementKey } from "@/domain/achievements/types";
import type { PlayerId } from "@/domain/game";
import type { Session } from "@/domain/player";
import type { Deps } from "./deps";
import { shownName } from "./player-names";

/**
 * M10 achievements (m10-plan §2): computed from the finished games like the statistics, plus the
 * facts saved from deleted guest games. Only the own gallery is shown.
 */

const finishedAt = (m: FinishedMatch) => m.finishedAt ?? m.startedAt;
const factSource = (m: FinishedMatch, player: PlayerId): FactSource => ({ facts: factsOf(m, player), at: finishedAt(m) });
const stored = (deps: Deps, player: PlayerId): FactSource[] =>
  deps.players.achievementsStored(player).map((s) => ({ facts: [s.key], at: s.earnedAt }));

/** The session's gallery: every achievement, earned with its date or open, progress for all-finishes. */
export function myAchievements(deps: Deps, session: Session): GalleryItem[] {
  const me = session.playerId;
  const games = deps.matches.listFinishedMatches(null).filter((m) => m.players.some((p) => p.id === me));
  return gallery([...games.map((m) => factSource(m, me)), ...stored(deps, me)]);
}

export type NewAchievements = { playerId: PlayerId; name: string; keys: AchievementKey[] };

/** The victory screen's banner: per regular player what this finished game brought that no earlier one had. */
export function newInMatch(deps: Deps, matchId: string): NewAchievements[] {
  const all = deps.matches.listFinishedMatches(null);
  const match = all.find((m) => m.id === matchId);
  if (!match) return [];
  return match.players.flatMap((p) => {
    if (p.guestUntil !== null || p.deletedAt !== null) return [];
    const earlier = all.filter((m) => m.id !== matchId && finishedAt(m) <= finishedAt(match) && m.players.some((x) => x.id === p.id));
    const keys = newlyEarned([...earlier.map((m) => factSource(m, p.id)), ...stored(deps, p.id)], factSource(match, p.id));
    return keys.length > 0 ? [{ playerId: p.id, name: shownName(p), keys }] : [];
  });
}
