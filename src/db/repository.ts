import type { NewPlayer, Player, PlayerCredentials } from "@/domain/player";
import type { FieldHits } from "@/domain/stats/field-hits";
import type { InputMode, MatchFormat, MatchState, ModeId, PlayerId, Rules, Visit } from "@/domain/game";

/**
 * Interfaces between services and persistence (architecture.md §9, dependency inversion).
 * SQLite: sqlite-player-repository.ts, sqlite-match-repository.ts; tests: memory-*-repository.ts.
 */

export type { NewPlayer, Player, PlayerCredentials };

export type MatchStatus = "running" | "finished" | "abandoned";

export type MatchSummary = {
  id: string;
  mode: ModeId;
  rules: Rules;
  status: MatchStatus;
  players: Player[]; // in seat order
  inputMode: InputMode;
  hostPlayerId: PlayerId | null;
  startedAt: number;
  finishedAt: number | null;
  /** M9: the match is a tournament fixture. */
  isTournament: boolean;
};

/** For the game overview (M4): open matches, newest first. */
export type OpenMatch = Pick<MatchSummary, "id" | "mode" | "players" | "inputMode" | "startedAt">;

/** For the history (M5): a closed match with what its result is derived from. */
export type RecentMatch = Pick<MatchSummary, "id" | "mode" | "rules" | "players" | "status" | "startedAt" | "finishedAt"> & {
  format: MatchFormat;
  /** Winner per leg in leg order, null = leg not finished. */
  legWinners: (PlayerId | null)[];
  placements: Record<PlayerId, number | null>;
};

/** A stored leg as the services see it; its visits are in `LoadedMatch.state`. */
export type StoredLegInfo = { id: string; setNo: number; legNo: number; winnerPlayerId: PlayerId | null };

/** Everything the scoring screen needs: match, players and all legs (M5) as domain state. */
export type LoadedMatch = MatchSummary & {
  format: MatchFormat;
  /** Same order as `state.legs`. */
  legs: StoredLegInfo[];
  state: MatchState;
};

/** M8: a finished match for the statistics, with the final places. */
export type FinishedMatch = LoadedMatch & { placements: Record<PlayerId, number | null> };

export type NewLeg = { id: string; matchId: string; setNo: number; legNo: number; starterPlayerId: PlayerId };

export type NewMatch = {
  id: string;
  mode: ModeId;
  legId: string;
  rules: Rules;
  playerIds: PlayerId[]; // seat order
  starterIndex: number;
  format: MatchFormat;
  inputMode: InputMode;
  hostPlayerId: PlayerId | null;
  startedAt: number;
  /** M9: created by a tournament. */
  isTournament?: boolean;
};

/** A guest match whose last guest has expired (E12): everything the cleanup needs. */
export type ExpiredGuestMatch = {
  id: string;
  /** Regular, not deleted players: they get the field hits. */
  regularPlayerIds: PlayerId[];
  /** Visits of all legs of the match. */
  visits: Visit[];
  /** M10: what the achievements need, for a finished match; null otherwise. */
  finished: (FinishedMatchCore & { finishedAt: number }) | null;
  /** Cancelled: counts nowhere, so nothing of it is saved. */
  abandoned: boolean;
};

/** The part of a finished match the achievement detection reads. */
export type FinishedMatchCore = { mode: ModeId; state: MatchState; placements: Record<PlayerId, number | null> };

/**
 * Players, their login (E10), guests (E12) and stored field hits. Split from MatchRepository by
 * responsibility (architecture.md §9, interface segregation).
 */
export type PlayerRepository = {
  /** Regular players, then the guests visible at `now`, each in creation order; never deleted ones. */
  listPlayers(now: number): Player[];
  createPlayer(player: NewPlayer): void;
  renamePlayer(id: PlayerId, name: string): void;
  /** Case-insensitive name match across all players, including expired guests. Lookups never find deleted players. */
  findPlayerByName(name: string): Player | null;
  findPlayerById(id: PlayerId): Player | null;
  /** Has a seat in any match, whatever its status. */
  isSeated(id: PlayerId): boolean;
  /** Soft delete: sets deleted_at and removes the login; matches keep referencing the row. */
  markDeleted(id: PlayerId, now: number): void;

  // Login lives on the player (E10). Only the auth service reads the hash.
  credentialsByName(name: string): PlayerCredentials | null;
  credentialsById(id: PlayerId): PlayerCredentials | null;
  /** null = delete the login. */
  setPasswordHash(id: PlayerId, hash: string | null): void;
  hasAdmin(): boolean;
  setAdmin(id: PlayerId, isAdmin: boolean): void;

  // Guests (E12)
  /** Guest becomes a regular player. */
  promoteGuest(id: PlayerId): void;
  /** Expired guests that are no longer in any match. */
  deleteOrphanGuests(now: number): void;
  addFieldHits(playerId: PlayerId, hits: FieldHits): void;
  fieldHitsOf(playerId: PlayerId): FieldHits;
  /** M10: achievement facts from a guest match being deleted; an earlier time already stored wins. */
  addAchievements(playerId: PlayerId, facts: readonly string[], earnedAt: number): void;
  achievementsStored(playerId: PlayerId): { key: string; earnedAt: number }[];
};

/** Matches, legs and visits. */
export type MatchRepository = {
  createMatch(input: NewMatch): void;
  loadMatch(matchId: string): LoadedMatch | null;
  /** Status running and newer than `openSince` (ms timestamp), newest first. */
  listOpenMatches(openSince: number): OpenMatch[];
  /** Several matches at once (tournaments); unknown ids are left out, the order is not guaranteed. */
  loadMatches(matchIds: readonly string[]): LoadedMatch[];
  /**
   * M8 statistics: finished matches (finished at or after `since`), oldest first, with visits and places;
   * with `playerIds` only those at least one of them played (R-01: the filter runs in SQL).
   */
  listFinishedMatches(since: number | null, playerIds?: readonly PlayerId[]): FinishedMatch[];
  /** Admin (clean-up): every match whatever its status, newest started first, `limit` from `offset`. */
  listMatches(limit: number, offset: number): MatchSummary[];
  /** Running matches the player sits in or hosts, whatever their age. */
  listOpenMatchIdsOf(playerId: PlayerId): string[];
  /** History (M5): finished, abandoned or running but older than `openSince`; most recently ended first. */
  listRecentMatches(openSince: number, limit: number, mode?: ModeId): RecentMatch[];
  /** How many matches `listRecentMatches` would list without a limit (the "n Spiele" on the start screen). */
  countRecentMatches(openSince: number, mode?: ModeId): number;

  /**
   * Writes the visit state of a leg: rows from `fromSeq` on are replaced,
   * surplus rows deleted. Server actions only ever change the last visit,
   * so fromSeq = visits.length - 1 is the normal case.
   */
  syncVisits(legId: string, visits: Visit[], fromSeq: number, ids: () => string, now: number): void;
  finishLeg(legId: string, winnerPlayerId: PlayerId, now: number): void;
  reopenLeg(legId: string): void;
  setMatchStatus(matchId: string, status: MatchStatus, now: number): void;

  // Legs (M5): the next leg is created with its first visit, an emptied one is deleted again.
  createLeg(leg: NewLeg): void;
  deleteLeg(legId: string): void;
  setLegStarter(legId: string, starterPlayerId: PlayerId): void;
  setPlayOut(legId: string, playOut: boolean): void;
  /** Final places of the match; null = not decided (match running again). */
  setPlacements(matchId: string, placements: Record<PlayerId, number | null>): void;
  /** M9: winner declared after a leg; null takes the declaration back. */
  setDecidedWinner(matchId: string, playerId: PlayerId | null): void;

  // Guest matches (E12)
  listExpiredGuestMatches(now: number): ExpiredGuestMatch[];
  /** Cancelled matches started at or before `startedBefore` (deleted 24 h after their start). */
  listAbandonedMatchIds(startedBefore: number): string[];
  /** Removes the match with its legs, visits and seats; a tournament fixture it played is open again. */
  deleteMatch(matchId: string): void;
};
