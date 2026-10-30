import { isGuest, type RedeemError, type Session } from "@/domain/player";
import { MIN_PASSWORD_LENGTH, startSession } from "./auth-service";
import { hashPassword, newToken, tokenId } from "./crypto";
import type { Deps } from "./deps";
import { playerNameSchema } from "./player-service";

/** Invites via QR code (M3, E10): valid for 24 h, single use. */
export const INVITE_LIFETIME_MS = 24 * 60 * 60 * 1000;

export type InviteInfo = { kind: "register" } | { kind: "password"; playerName: string; reset: boolean };

export type RedeemResult = { ok: true; token: string; session: Session } | { ok: false; reason: RedeemError };

function create(deps: Deps, invite: { kind: "register" } | { kind: "password"; playerId: string; resetSessions: boolean }): string {
  const { token, id } = newToken(deps.random);
  const now = deps.now();
  deps.auth.createInvite({
    id,
    kind: invite.kind,
    playerId: invite.kind === "password" ? invite.playerId : null,
    resetSessions: invite.kind === "password" ? invite.resetSessions : false,
    createdAt: now,
    expiresAt: now + INVITE_LIFETIME_MS,
  });
  return token;
}

/** Case A: a new player chooses name and password. */
export function createRegisterInvite(deps: Deps): string {
  return create(deps, { kind: "register" });
}

/** Case F (create login) and reset: a fixed player sets a password. Reset ends the old sessions. */
export function createPasswordInvite(deps: Deps, playerId: string, resetSessions: boolean): string | null {
  const player = deps.players.findPlayerById(playerId);
  if (!player || isGuest(player)) return null;
  return create(deps, { kind: "password", playerId, resetSessions });
}

/** What the invite page should show; null = invalid (case E). */
export function inviteInfo(deps: Deps, token: string): InviteInfo | null {
  const invite = deps.auth.findInvite(tokenId(token), deps.now());
  if (!invite) return null;
  if (invite.kind === "register") return { kind: "register" };
  const player = invite.playerId ? deps.players.findPlayerById(invite.playerId) : null;
  return player ? { kind: "password", playerName: player.name, reset: invite.resetSessions } : null;
}

/** Case C: player with login; case D: guest or player without login → the admin creates a login for it. */
const nameConflict = (deps: Deps, name: string): RedeemError | null => {
  const existing = deps.players.findPlayerByName(name);
  return existing ? (existing.hasLogin ? "name-taken" : "name-without-login") : null;
};

/**
 * Redeem an invite. Cheap checks first for quick feedback, then bcrypt (async, ~1 s on the Pi),
 * then everything that writes in one synchronous transaction that checks token and name again:
 * two requests with the same QR code may both pass the first check while bcrypt runs, but only
 * one of them gets through the transaction.
 */
export async function redeem(
  deps: Deps,
  token: string,
  input: { name?: string; password: string; passwordRepeat: string },
): Promise<RedeemResult> {
  const id = tokenId(token);
  const invite = deps.auth.findInvite(id, deps.now());
  if (!invite) return { ok: false, reason: "invalid-token" };
  if (input.password.length < MIN_PASSWORD_LENGTH) return { ok: false, reason: "password-too-short" };
  if (input.password !== input.passwordRepeat) return { ok: false, reason: "password-mismatch" };

  let name: string | null = null;
  if (invite.kind === "register") {
    const parsed = playerNameSchema.safeParse(input.name ?? "");
    if (!parsed.success) return { ok: false, reason: "name-taken" };
    name = parsed.data;
    const conflict = nameConflict(deps, name);
    if (conflict) return { ok: false, reason: conflict };
  }

  const hash = await hashPassword(input.password);

  return deps.transaction((): RedeemResult => {
    const now = deps.now();
    if (!deps.auth.findInvite(id, now)) return { ok: false, reason: "invalid-token" };

    if (invite.kind === "register" && name !== null) {
      const conflict = nameConflict(deps, name);
      if (conflict) return { ok: false, reason: conflict };
      const playerId = deps.newId();
      deps.players.createPlayer({ id: playerId, name, createdAt: now, guestUntil: null, passwordHash: hash });
      deps.auth.markInviteUsed(id, now);
      return { ok: true, ...startSession(deps, playerId, name, false) };
    }

    const player = invite.playerId ? deps.players.credentialsById(invite.playerId) : null;
    if (!player) return { ok: false, reason: "invalid-token" };
    deps.players.setPasswordHash(player.id, hash);
    if (invite.resetSessions) deps.auth.deleteSessionsOfPlayer(player.id);
    deps.auth.markInviteUsed(id, now);
    return { ok: true, ...startSession(deps, player.id, player.name, player.isAdmin) };
  });
}
