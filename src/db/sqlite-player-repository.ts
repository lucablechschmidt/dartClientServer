import { and, asc, eq, gt, isNotNull, isNull, lte, notInArray, or, sql } from "drizzle-orm";
import { hitsOf, type FieldHits } from "@/domain/stats/field-hits";
import type { PlayerId } from "@/domain/game";
import type { Db } from "./client";
import type { NewPlayer, Player, PlayerCredentials, PlayerRepository } from "./repository";
import { matchPlayers, playerAchievements, playerFieldHits, players, type PlayerRow } from "./schema";

/** The hash stays in the DB layer; only hasLogin/isAdmin go outside. */
export const toPlayer = (r: PlayerRow): Player => ({
  id: r.id,
  name: r.name,
  createdAt: r.createdAt,
  guestUntil: r.guestUntil,
  hasLogin: r.passwordHash !== null,
  isAdmin: r.isAdmin,
  deletedAt: r.deletedAt,
});
const toCredentials = (r: PlayerRow): PlayerCredentials => ({ id: r.id, name: r.name, passwordHash: r.passwordHash, isAdmin: r.isAdmin });

/** Players, their login data, guests and stored field hits (SQLite). */
export class SqlitePlayerRepository implements PlayerRepository {
  constructor(private readonly db: Db) {}

  listPlayers(now: number): Player[] {
    return this.db
      .select()
      .from(players)
      .where(and(isNull(players.deletedAt), or(isNull(players.guestUntil), gt(players.guestUntil, now))))
      .orderBy(asc(isNotNull(players.guestUntil)), asc(players.createdAt))
      .all()
      .map(toPlayer);
  }
  createPlayer(player: NewPlayer): void {
    this.db
      .insert(players)
      .values({ ...player, passwordHash: player.passwordHash ?? null, isAdmin: player.isAdmin ?? false })
      .run();
  }
  renamePlayer(id: PlayerId, name: string): void {
    this.db.update(players).set({ name }).where(eq(players.id, id)).run();
  }
  private rowByName(name: string): PlayerRow | undefined {
    return this.db
      .select()
      .from(players)
      .where(and(isNull(players.deletedAt), sql`lower(${players.name}) = lower(${name})`))
      .get();
  }
  private rowById(id: PlayerId): PlayerRow | undefined {
    return this.db
      .select()
      .from(players)
      .where(and(isNull(players.deletedAt), eq(players.id, id)))
      .get();
  }
  findPlayerByName(name: string): Player | null {
    const r = this.rowByName(name);
    return r ? toPlayer(r) : null;
  }
  findPlayerById(id: PlayerId): Player | null {
    const r = this.rowById(id);
    return r ? toPlayer(r) : null;
  }
  credentialsByName(name: string): PlayerCredentials | null {
    const r = this.rowByName(name);
    return r ? toCredentials(r) : null;
  }
  credentialsById(id: PlayerId): PlayerCredentials | null {
    const r = this.rowById(id);
    return r ? toCredentials(r) : null;
  }
  setPasswordHash(id: PlayerId, hash: string | null): void {
    this.db.update(players).set({ passwordHash: hash }).where(eq(players.id, id)).run();
  }
  hasAdmin(): boolean {
    return this.db.select({ id: players.id }).from(players).where(eq(players.isAdmin, true)).get() !== undefined;
  }
  setAdmin(id: PlayerId, isAdmin: boolean): void {
    this.db.update(players).set({ isAdmin }).where(eq(players.id, id)).run();
  }
  promoteGuest(id: PlayerId): void {
    this.db.update(players).set({ guestUntil: null }).where(eq(players.id, id)).run();
  }
  isSeated(id: PlayerId): boolean {
    return this.db.select({ matchId: matchPlayers.matchId }).from(matchPlayers).where(eq(matchPlayers.playerId, id)).get() !== undefined;
  }
  markDeleted(id: PlayerId, now: number): void {
    this.db.update(players).set({ deletedAt: now, passwordHash: null }).where(eq(players.id, id)).run();
  }
  addFieldHits(playerId: PlayerId, hits: FieldHits): void {
    const rows = [...hits]
      .filter(([, c]) => hitsOf(c) > 0)
      .map(([field, c]) => ({ playerId, field, hits: hitsOf(c), singles: c.single, doubles: c.double, triples: c.triple }));
    if (rows.length === 0) return;
    this.db
      .insert(playerFieldHits)
      .values(rows)
      .onConflictDoUpdate({
        target: [playerFieldHits.playerId, playerFieldHits.field],
        set: {
          hits: sql`${playerFieldHits.hits} + excluded.hits`,
          singles: sql`${playerFieldHits.singles} + excluded.singles`,
          doubles: sql`${playerFieldHits.doubles} + excluded.doubles`,
          triples: sql`${playerFieldHits.triples} + excluded.triples`,
        },
      })
      .run();
  }
  addAchievements(playerId: PlayerId, facts: readonly string[], earnedAt: number): void {
    if (facts.length === 0) return;
    this.db
      .insert(playerAchievements)
      .values(facts.map((key) => ({ playerId, key, earnedAt })))
      .onConflictDoUpdate({
        target: [playerAchievements.playerId, playerAchievements.key],
        set: { earnedAt: sql`min(${playerAchievements.earnedAt}, excluded.earned_at)` },
      })
      .run();
  }
  achievementsStored(playerId: PlayerId): { key: string; earnedAt: number }[] {
    return this.db
      .select({ key: playerAchievements.key, earnedAt: playerAchievements.earnedAt })
      .from(playerAchievements)
      .where(eq(playerAchievements.playerId, playerId))
      .all();
  }
  fieldHitsOf(playerId: PlayerId): FieldHits {
    const rows = this.db.select().from(playerFieldHits).where(eq(playerFieldHits.playerId, playerId)).all();
    // weighted hits beyond the split are the ones saved before the split existed
    return new Map(
      rows.map((r) => {
        const split = { single: r.singles, double: r.doubles, triple: r.triples, unsplit: 0 };
        return [r.field, { ...split, unsplit: Math.max(0, r.hits - hitsOf(split)) }];
      }),
    );
  }
  deleteOrphanGuests(now: number): void {
    const seated = this.db.selectDistinct({ id: matchPlayers.playerId }).from(matchPlayers);
    this.db
      .delete(players)
      .where(and(isNotNull(players.guestUntil), lte(players.guestUntil, now), notInArray(players.id, seated)))
      .run();
  }
}
