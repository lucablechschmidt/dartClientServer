import type { FieldHits } from "@/domain/stats/field-hits";
import type { InputMode, MatchFormat, ModeId, PlayerId, Rules, Visit } from "@/domain/game";
import type { MatchStatus, Player } from "./repository";

export type StoredPlayer = Player & { passwordHash: string | null };
export const toPlayer = (p: StoredPlayer): Player => ({
  id: p.id,
  name: p.name,
  createdAt: p.createdAt,
  guestUntil: p.guestUntil,
  hasLogin: p.hasLogin,
  isAdmin: p.isAdmin,
});

export type StoredMatch = {
  id: string;
  mode: ModeId;
  rules: Rules;
  status: MatchStatus;
  playerIds: PlayerId[];
  inputMode: InputMode;
  hostPlayerId: PlayerId | null;
  startedAt: number;
  finishedAt: number | null;
  format: MatchFormat;
  placements: Record<PlayerId, number | null>;
  legs: StoredLeg[];
};

export type StoredLeg = {
  id: string;
  setNo: number;
  legNo: number;
  starterIndex: number;
  winnerPlayerId: PlayerId | null;
  playOut: boolean;
  visits: Visit[];
};

/**
 * Shared in-memory "database" for tests: the memory repositories read and write the same maps,
 * like the SQLite repositories share one connection. Tests may inspect it directly.
 */
export class MemoryStore {
  players = new Map<PlayerId, StoredPlayer>();
  matches = new Map<string, StoredMatch>();
  fieldHits = new Map<PlayerId, FieldHits>();

  /** A stored player; a missing one is a bug in the test setup. */
  player(id: PlayerId): StoredPlayer {
    const player = this.players.get(id);
    if (!player) throw new Error(`unknown player ${id}`);
    return player;
  }

  isSeated(playerId: PlayerId): boolean {
    return [...this.matches.values()].some((m) => m.playerIds.includes(playerId));
  }
}
