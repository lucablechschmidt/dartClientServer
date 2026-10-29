import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";

/** Password hashes (bcrypt, compatible with `caddy hash-password`) and tokens for session and invite (M3). */

/** Cost factor for new hashes; 12 ≈ 1 s on the Pi 3 B+, which is fine at one login per year and device. */
export const BCRYPT_COST = 12;

export function hashPassword(password: string, cost = BCRYPT_COST): Promise<string> {
  return bcrypt.hash(password, cost);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** A hash to compare against when there is no user: same timing as a real failed attempt. */
export const DUMMY_HASH = "$2a$12$KZvDQkItZv5rGj2cbPv/B.OeG6RdPu/WfeZXpUn5cYsAtDPP93YbG";

/** The token goes into the cookie or the link; the DB only stores its id (SHA-256). */
export function tokenId(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newToken(random: (bytes: number) => Uint8Array): { token: string; id: string } {
  const token = Buffer.from(random(32)).toString("base64url");
  return { token, id: tokenId(token) };
}
