/**
 * A player as the UI and domain know it. A login is a player with a password hash (E10);
 * the hash itself never arrives here, only `hasLogin`.
 */
export type Player = {
  id: string;
  name: string;
  createdAt: number;
  /** E12: guest visible in lists until this time (ms); null = regular player. */
  guestUntil: number | null;
  hasLogin: boolean;
  isAdmin: boolean;
  /** Set = deleted by the admin: the row stays for old matches, the player is gone from lists and login. */
  deletedAt: number | null;
};

/** For creation: hash and admin flag are optional (guests, players without login). */
export type NewPlayer = Pick<Player, "id" | "name" | "createdAt" | "guestUntil"> & {
  passwordHash?: string | null;
  isAdmin?: boolean;
};

/** Only for the auth service: the player with their hash. Never leaves the server layer. */
export type PlayerCredentials = {
  id: string;
  name: string;
  passwordHash: string | null;
  isAdmin: boolean;
};

/** The logged-in identity of a request. */
export type Session = { playerId: string; name: string; isAdmin: boolean };

/** How long a guest stays in the setup screens after creation. */
export const GUEST_LIFETIME_MS = 24 * 60 * 60 * 1000;

export const isGuest = (player: Pick<Player, "guestUntil">): boolean => player.guestUntil !== null;

/** Regular player always; guest only while their time has not expired. */
export const isListed = (player: Pick<Player, "guestUntil">, now: number): boolean => player.guestUntil === null || player.guestUntil > now;

/** Error on create/rename/delete; names are unique across all players (case-insensitive), guests included. */
export type PlayerError = "name-taken" | "invalid-name" | "player-in-match" | "forbidden" | "not-found";
export type PlayerResult = { ok: true } | { ok: false; reason: PlayerError };
/** Adding a guest from a setup or the players tab; the id lets the setup select them right away. */
export type GuestResult = { ok: true; id: string } | { ok: false; reason: "name-taken" | "invalid-name" };

/** State of the login form (useActionState); lives here so server and UI share it. */
export type LoginFormState = { error: "invalid-credentials" | "too-many-attempts" | null };

export type RedeemError =
  "invalid-token" | "name-taken" | "invalid-name" | "name-without-login" | "password-too-short" | "password-mismatch";
export type InviteFormState = { error: RedeemError | "too-many-attempts" | null };
export type PasswordFormState = { error: "invalid-credentials" | "password-too-short" | "password-mismatch" | null; saved: boolean };
