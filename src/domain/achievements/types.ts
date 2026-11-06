import type { ModeId, PlayerId } from "../game/types";
import type { MatchState } from "../game/match";

/** The achievements of m10-plan §1, in the order of the gallery. */
export const ACHIEVEMENTS = [
  "180",
  "gone-fishing",
  "nine-darter",
  "shanghai",
  "all-finishes",
  "first-blood",
  "split-one",
  "never-halved",
  "bearly-never-halved",
  "almostDone",
] as const;
export type AchievementKey = (typeof ACHIEVEMENTS)[number];

/** The 21 doubles of "Gotta catch 'Em All!": D1–D20 and Bull (25). */
export const FINISH_DOUBLES: readonly number[] = [...Array.from({ length: 20 }, (_, i) => i + 1), 25];
export const doubleFact = (field: number) => `double-${field}`;

/** A finished match as the detection needs it (from listFinishedMatches or an expiring guest match). */
export type AchievementMatch = { mode: ModeId; state: MatchState; placements: Record<PlayerId, number | null> };
