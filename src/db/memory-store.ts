import type { FieldHits } from "@/domain/stats/field-hits";
import type { InputMode, PlayerId, Rules, Visit } from "@/domain/x01";
import type { MatchStatus, Player } from "./repository";

export type StoredPlayer = Player & { passwordHash: string | null };
export const toPlayer = (p: StoredPlayer): Player => ({ id: p.id, name: p.name, createdAt: p.createdAt, guestUntil: p.guestUntil, hasLogin: p.hasLogin, isAdmin: p.isAdmin });

export type StoredMatch = {
  id: string;
  rules: Rules;
  status: MatchStatus;
  playerIds: PlayerId[];
  inputMode: InputMode;
  hostPlayerId: PlayerId | null;
  startedAt: number;
  finishedAt: number | null;
  leg: { id: string; starterIndex: number; winnerPlayerId: PlayerId | null; visits: Visit[] };
};

/**
 * Shared in-memory "database" for tests: the memory repositories read and write the same maps,
 * like the SQLite repositories share one connection. Tests may inspect it directly.
 */
export class MemoryStore {
  players = new Map<PlayerId, StoredPlayer>();
  matches = new Map<string, StoredMatch>();
  fieldHits = new Map<PlayerId, FieldHits>();

  isSeated(playerId: PlayerId): boolean {
    return [...this.matches.values()].some((m) => m.playerIds.includes(playerId));
  }
}
