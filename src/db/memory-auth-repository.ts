import type { PlayerId } from "@/domain/game";
import type { AuthRepository, InviteRecord, SessionRecord } from "./auth-repository";

/** For tests: same semantics as SQLite, in memory only. There is no cascade on player deletion here. */
export class MemoryAuthRepository implements AuthRepository {
  sessions = new Map<string, SessionRecord>();
  invites = new Map<string, InviteRecord>();

  createSession(session: SessionRecord): void {
    this.sessions.set(session.id, { ...session });
  }
  findSession(id: string, now: number): SessionRecord | null {
    const s = this.sessions.get(id);
    return s && s.expiresAt > now ? { ...s } : null;
  }
  deleteSession(id: string): void {
    this.sessions.delete(id);
  }
  deleteSessionsOfPlayer(playerId: PlayerId, exceptId?: string): void {
    for (const s of this.sessions.values()) if (s.playerId === playerId && s.id !== exceptId) this.sessions.delete(s.id);
  }
  deleteExpiredSessions(now: number): number {
    let n = 0;
    for (const s of this.sessions.values()) {
      if (s.expiresAt <= now) {
        this.sessions.delete(s.id);
        n++;
      }
    }
    return n;
  }

  createInvite(invite: Omit<InviteRecord, "usedAt">): void {
    this.invites.set(invite.id, { ...invite, usedAt: null });
  }
  findInvite(id: string, now: number): InviteRecord | null {
    const i = this.invites.get(id);
    return i && i.expiresAt > now && i.usedAt === null ? { ...i } : null;
  }
  markInviteUsed(id: string, now: number): void {
    const i = this.invites.get(id);
    if (i) i.usedAt = now;
  }
}
