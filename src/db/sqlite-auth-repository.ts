import { and, eq, gt, isNull, lte, ne } from "drizzle-orm";
import type { PlayerId } from "@/domain/game";
import type { AuthRepository, InviteRecord, SessionRecord } from "./auth-repository";
import type { Db } from "./client";
import { invites, sessions } from "./schema";

export class SqliteAuthRepository implements AuthRepository {
  constructor(private readonly db: Db) {}

  createSession(session: SessionRecord): void {
    this.db.insert(sessions).values(session).run();
  }
  findSession(id: string, now: number): SessionRecord | null {
    return (
      this.db
        .select()
        .from(sessions)
        .where(and(eq(sessions.id, id), gt(sessions.expiresAt, now)))
        .get() ?? null
    );
  }
  deleteSession(id: string): void {
    this.db.delete(sessions).where(eq(sessions.id, id)).run();
  }
  deleteSessionsOfPlayer(playerId: PlayerId, exceptId?: string): void {
    const where = exceptId ? and(eq(sessions.playerId, playerId), ne(sessions.id, exceptId)) : eq(sessions.playerId, playerId);
    this.db.delete(sessions).where(where).run();
  }
  deleteExpiredSessions(now: number): number {
    return this.db.delete(sessions).where(lte(sessions.expiresAt, now)).run().changes;
  }

  createInvite(invite: Omit<InviteRecord, "usedAt">): void {
    this.db.insert(invites).values(invite).run();
  }
  findInvite(id: string, now: number): InviteRecord | null {
    return (
      this.db
        .select()
        .from(invites)
        .where(and(eq(invites.id, id), gt(invites.expiresAt, now), isNull(invites.usedAt)))
        .get() ?? null
    );
  }
  markInviteUsed(id: string, now: number): void {
    this.db.update(invites).set({ usedAt: now }).where(eq(invites.id, id)).run();
  }
}
