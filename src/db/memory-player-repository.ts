import { isListed } from "@/domain/player";
import { addFieldHits, type FieldHits } from "@/domain/stats/field-hits";
import type { PlayerId } from "@/domain/game";
import { MemoryStore, toPlayer, type StoredPlayer } from "./memory-store";
import type { NewPlayer, Player, PlayerCredentials, PlayerRepository } from "./repository";

/** For service tests: same semantics as SqlitePlayerRepository, in memory only. */
export class MemoryPlayerRepository implements PlayerRepository {
  constructor(readonly store: MemoryStore = new MemoryStore()) {}

  listPlayers(now: number): Player[] {
    const guestRank = (p: Player) => (p.guestUntil === null ? 0 : 1);
    return [...this.store.players.values()]
      .filter((p) => p.deletedAt === null && isListed(p, now))
      .sort((a, b) => guestRank(a) - guestRank(b) || a.createdAt - b.createdAt)
      .map(toPlayer);
  }
  createPlayer(player: NewPlayer): void {
    const passwordHash = player.passwordHash ?? null;
    this.store.players.set(player.id, {
      id: player.id,
      name: player.name,
      createdAt: player.createdAt,
      guestUntil: player.guestUntil,
      passwordHash,
      hasLogin: passwordHash !== null,
      isAdmin: player.isAdmin ?? false,
      deletedAt: null,
    });
  }
  renamePlayer(id: PlayerId, name: string): void {
    const p = this.store.players.get(id);
    if (p) p.name = name;
  }
  private storedByName(name: string): StoredPlayer | undefined {
    const needle = name.toLowerCase();
    return [...this.store.players.values()].find((p) => p.deletedAt === null && p.name.toLowerCase() === needle);
  }
  /** Like the SQLite lookups: a deleted player is not found. */
  private live(id: PlayerId): StoredPlayer | undefined {
    const p = this.store.players.get(id);
    return p?.deletedAt === null ? p : undefined;
  }
  findPlayerByName(name: string): Player | null {
    const p = this.storedByName(name);
    return p ? toPlayer(p) : null;
  }
  findPlayerById(id: PlayerId): Player | null {
    const p = this.live(id);
    return p ? toPlayer(p) : null;
  }
  private creds(p: StoredPlayer | undefined): PlayerCredentials | null {
    return p ? { id: p.id, name: p.name, passwordHash: p.passwordHash, isAdmin: p.isAdmin } : null;
  }
  credentialsByName(name: string): PlayerCredentials | null {
    return this.creds(this.storedByName(name));
  }
  credentialsById(id: PlayerId): PlayerCredentials | null {
    return this.creds(this.live(id));
  }
  setPasswordHash(id: PlayerId, hash: string | null): void {
    const p = this.store.players.get(id);
    if (p) {
      p.passwordHash = hash;
      p.hasLogin = hash !== null;
    }
  }
  hasAdmin(): boolean {
    return [...this.store.players.values()].some((p) => p.isAdmin);
  }
  setAdmin(id: PlayerId, isAdmin: boolean): void {
    const p = this.store.players.get(id);
    if (p) p.isAdmin = isAdmin;
  }
  promoteGuest(id: PlayerId): void {
    const p = this.store.players.get(id);
    if (p) p.guestUntil = null;
  }
  isSeated(id: PlayerId): boolean {
    return this.store.isSeated(id);
  }
  markDeleted(id: PlayerId, now: number): void {
    const p = this.store.players.get(id);
    if (p) Object.assign(p, { deletedAt: now, passwordHash: null, hasLogin: false });
  }
  addFieldHits(playerId: PlayerId, hits: FieldHits): void {
    const positive = new Map([...hits].filter(([, n]) => n > 0));
    this.store.fieldHits.set(playerId, addFieldHits(this.store.fieldHits.get(playerId) ?? new Map<number, number>(), positive));
  }
  fieldHitsOf(playerId: PlayerId): FieldHits {
    return new Map(this.store.fieldHits.get(playerId) ?? []);
  }
  deleteOrphanGuests(now: number): void {
    for (const p of this.store.players.values()) {
      if (p.guestUntil !== null && p.guestUntil <= now && !this.store.isSeated(p.id)) this.store.players.delete(p.id);
    }
  }
}
