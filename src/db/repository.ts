import type { DeletePlayerResult, NewPlayer, Player, PlayerCredentials } from "@/domain/player";
import type { FieldHits } from "@/domain/stats/field-hits";
import type { InputMode, LegState, PlayerId, Rules, Visit } from "@/domain/x01";

/**
 * Interfaces between services and persistence (architecture.md §9, dependency inversion).
 * SQLite: sqlite-player-repository.ts, sqlite-match-repository.ts; tests: memory-*-repository.ts.
 */

export type { DeletePlayerResult, NewPlayer, Player, PlayerCredentials };

export type MatchStatus = "running" | "finished" | "abandoned";

export type MatchSummary = {
  id: string;
  rules: Rules;
  status: MatchStatus;
  players: Player[]; // in seat order
  inputMode: InputMode;
  hostPlayerId: PlayerId | null;
  startedAt: number;
  finishedAt: number | null;
};

/** For the game overview (M4): open matches, newest first. */
export type OpenMatch = Pick<MatchSummary, "id" | "players" | "inputMode" | "startedAt">;

/** Everything the scoring screen needs: match, players and the current leg as domain state. */
export type LoadedMatch = MatchSummary & {
  leg: { id: string; setNo: number; legNo: number; winnerPlayerId: PlayerId | null };
  state: LegState;
};

export type NewMatch = {
  id: string;
  legId: string;
  rules: Rules;
  playerIds: PlayerId[]; // seat order
  starterIndex: number;
  inputMode: InputMode;
  hostPlayerId: PlayerId | null;
  startedAt: number;
};

/** A guest match whose last guest has expired (E12): everything the cleanup needs. */
export type ExpiredGuestMatch = {
  id: string;
  regularPlayerIds: PlayerId[];
  /** Visits of all legs of the match. */
  visits: Visit[];
};

/**
 * Players, their login (E10), guests (E12) and stored field hits. Split from MatchRepository by
 * responsibility (architecture.md §9, interface segregation).
 */
export interface PlayerRepository {
  /** Regular players, then the guests visible at `now`, each in creation order. */
  listPlayers(now: number): Player[];
  createPlayer(player: NewPlayer): void;
  renamePlayer(id: PlayerId, name: string): void;
  /** Case-insensitive name match across all players, including expired guests. */
  findPlayerByName(name: string): Player | null;
  findPlayerById(id: PlayerId): Player | null;
  /** Deletes only players without a match. */
  deletePlayer(id: PlayerId): DeletePlayerResult;

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
}

/** Matches, legs and visits. */
export interface MatchRepository {
  createMatch(input: NewMatch): void;
  loadMatch(matchId: string): LoadedMatch | null;
  /** Status running and newer than `openSince` (ms timestamp), newest first. */
  listOpenMatches(openSince: number): OpenMatch[];

  /**
   * Writes the visit state of a leg: rows from `fromSeq` on are replaced,
   * surplus rows deleted. Server actions only ever change the last visit,
   * so fromSeq = visits.length - 1 is the normal case.
   */
  syncVisits(legId: string, visits: Visit[], fromSeq: number, ids: () => string, now: number): void;
  finishLeg(legId: string, winnerPlayerId: PlayerId, now: number): void;
  reopenLeg(legId: string): void;
  setMatchStatus(matchId: string, status: MatchStatus, now: number): void;

  // Guest matches (E12)
  listExpiredGuestMatches(now: number): ExpiredGuestMatch[];
  deleteMatch(matchId: string): void;
}
