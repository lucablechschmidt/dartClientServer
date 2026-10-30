import type { Session } from "@/domain/player";
import { DUMMY_HASH, hashPassword, newToken, tokenId, verifyPassword } from "./crypto";
import type { Deps } from "./deps";
import type { Env } from "./env";
import { playerNameSchema } from "./player-service";

/** The session cookie is valid for 1 year from login, without extension (E10). */
export const SESSION_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000;
export const MIN_PASSWORD_LENGTH = 8;

export type LoginResult = { ok: true; token: string; session: Session } | { ok: false; reason: "invalid-credentials" };
export type PasswordError = "invalid-credentials" | "password-too-short";

/**
 * Creates the first admin from the environment if no player is admin yet (bootstrap).
 * After that only the DB decides; a renamed admin stays admin. Returns true if created.
 */
export function bootstrapAdmin(deps: Deps, env: Env): boolean {
  const admin = env.admin;
  if (!admin) return false;
  const name = playerNameSchema.parse(admin.name);
  return deps.transaction(() => {
    if (deps.players.hasAdmin()) return false;
    const existing = deps.players.findPlayerByName(name);
    if (existing) {
      // Name already taken (e.g. an old player): attach login and admin rights to it, do not create a second one.
      deps.players.setPasswordHash(existing.id, admin.passwordHash);
      deps.players.setAdmin(existing.id, true);
      return true;
    }
    deps.players.createPlayer({
      id: deps.newId(),
      name,
      createdAt: deps.now(),
      guestUntil: null,
      passwordHash: admin.passwordHash,
      isAdmin: true,
    });
    return true;
  });
}

function startSession(deps: Deps, playerId: string, name: string, isAdmin: boolean): { token: string; session: Session } {
  const { token, id } = newToken(deps.random);
  const now = deps.now();
  deps.auth.createSession({ id, playerId, createdAt: now, expiresAt: now + SESSION_LIFETIME_MS });
  return { token, session: { playerId, name, isAdmin } };
}

/** Name and password → session. Unknown name, no login and wrong password answer the same, with the same timing. */
export async function login(deps: Deps, name: string, password: string): Promise<LoginResult> {
  const creds = deps.players.credentialsByName(name.trim());
  const ok = await verifyPassword(password, creds?.passwordHash ?? DUMMY_HASH);
  if (!creds?.passwordHash || !ok) return { ok: false, reason: "invalid-credentials" };
  return { ok: true, ...startSession(deps, creds.id, creds.name, creds.isAdmin) };
}

export function logout(deps: Deps, token: string): void {
  deps.auth.deleteSession(tokenId(token));
}

/** Cookie token → logged-in player, or null. A removed login invalidates the session immediately. */
export function sessionFromToken(deps: Deps, token: string): Session | null {
  const s = deps.auth.findSession(tokenId(token), deps.now());
  if (!s) return null;
  const creds = deps.players.credentialsById(s.playerId);
  if (!creds?.passwordHash) return null;
  return { playerId: creds.id, name: creds.name, isAdmin: creds.isAdmin };
}

/** Change own password: the old one must match; all other sessions of the player end, the current one stays. */
export async function changeOwnPassword(
  deps: Deps,
  session: Session,
  token: string,
  oldPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; reason: PasswordError }> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) return { ok: false, reason: "password-too-short" };
  const creds = deps.players.credentialsById(session.playerId);
  const ok = await verifyPassword(oldPassword, creds?.passwordHash ?? DUMMY_HASH);
  if (!creds?.passwordHash || !ok) return { ok: false, reason: "invalid-credentials" };
  const hash = await hashPassword(newPassword);
  deps.transaction(() => {
    deps.players.setPasswordHash(creds.id, hash);
    deps.auth.deleteSessionsOfPlayer(creds.id, tokenId(token));
  });
  return { ok: true };
}

/** For the daily cleanup. */
export function cleanupSessions(deps: Deps): number {
  return deps.auth.deleteExpiredSessions(deps.now());
}

/** Session with a fixed start time for invites (M3 step 7) and tests. */
export { startSession };
