import type { ModeId, PlayerId } from "../game/types";

/** A finished match as the statistics see it (m8-plan §1); the repository gives only finished ones. */
export type StatsMatch = {
  id: string;
  mode: ModeId;
  finishedAt: number;
  players: PlayerId[];
  /** Place 1 is a win; players with the same place share it. */
  placements: Record<PlayerId, number | null>;
  /** A guest took part: counts in nothing but field hits (E12). */
  hasGuest: boolean;
};

/** Time filter of the own statistics. */
export type StatsRange = "all" | "year" | "30d";
