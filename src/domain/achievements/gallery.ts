import { ACHIEVEMENTS, doubleFact, FINISH_DOUBLES, type AchievementKey } from "./types";

/** Facts of one game (or of the saved guest games) with the time they were earned. */
export type FactSource = { facts: Iterable<string>; at: number };

export type GalleryItem = {
  key: AchievementKey;
  /** First time earned; null while open. */
  earnedAt: number | null;
  /** Only "all-finishes": doubles finished on so far. */
  progress?: { done: number; of: number };
};

/** Earliest time of every fact. */
function firstTimes(sources: readonly FactSource[]): Map<string, number> {
  const first = new Map<string, number>();
  for (const s of sources) for (const f of s.facts) first.set(f, Math.min(first.get(f) ?? Infinity, s.at));
  return first;
}

/**
 * Every achievement in gallery order, earned at its first game or open (m10-plan §2). "Gotta catch
 * 'Em All!" counts the 21 doubles and is earned when the last missing one came.
 */
export function gallery(sources: readonly FactSource[]): GalleryItem[] {
  const first = firstTimes(sources);
  const doubles = FINISH_DOUBLES.map((d) => first.get(doubleFact(d)));
  const done = doubles.filter((t) => t !== undefined).length;
  return ACHIEVEMENTS.map((key): GalleryItem => {
    if (key !== "all-finishes") return { key, earnedAt: first.get(key) ?? null };
    const complete = done === FINISH_DOUBLES.length;
    return { key, earnedAt: complete ? Math.max(...doubles.map((t) => t ?? 0)) : null, progress: { done, of: FINISH_DOUBLES.length } };
  });
}

/** What `game` earns that the `earlier` games had not (the victory screen's banner), in gallery order. */
export function newlyEarned(earlier: readonly FactSource[], game: FactSource): AchievementKey[] {
  const had = new Set(
    gallery(earlier)
      .filter((x) => x.earnedAt !== null)
      .map((x) => x.key),
  );
  return gallery([...earlier, game])
    .filter((x) => x.earnedAt !== null && !had.has(x.key))
    .map((x) => x.key);
}
