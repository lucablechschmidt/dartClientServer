import type { PlayerId } from "@/domain/x01";

/**
 * Sessions and invites (M3, E10). Separate from MatchRepository because only the auth service
 * needs them. Both tables store only the SHA-256 of the token, never the token itself.
 */
export type SessionRecord = { id: string; playerId: PlayerId; createdAt: number; expiresAt: number };

export type InviteKind = "register" | "password";
export type InviteRecord = {
  id: string;
  kind: InviteKind;
  /** Set for kind 'password': the player who sets a password. */
  playerId: PlayerId | null;
  /** For kind 'password': end old sessions (reset) or not (create login). */
  resetSessions: boolean;
  createdAt: number;
  expiresAt: number;
  usedAt: number | null;
};

export interface AuthRepository {
  createSession(session: SessionRecord): void;
  /** Only valid (unexpired) sessions. */
  findSession(id: string, now: number): SessionRecord | null;
  deleteSession(id: string): void;
  deleteSessionsOfPlayer(playerId: PlayerId, exceptId?: string): void;
  deleteExpiredSessions(now: number): number;

  createInvite(invite: Omit<InviteRecord, "usedAt">): void;
  /** Only valid ones: not expired, not used. */
  findInvite(id: string, now: number): InviteRecord | null;
  markInviteUsed(id: string, now: number): void;
}
