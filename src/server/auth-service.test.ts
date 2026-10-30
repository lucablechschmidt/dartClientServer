import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryAuthRepository } from "@/db/memory-auth-repository";
import { bootstrapAdmin, changeOwnPassword, cleanupSessions, login, logout, SESSION_LIFETIME_MS, sessionFromToken } from "./auth-service";
import type { Deps } from "./deps";
import { memoryDeps } from "./testing";
import type { Env } from "./env";
import { createGuest, createPlayer, renamePlayer } from "./player-service";

/** Hash in the format of `caddy hash-password` ($2a$…), with a small cost factor for fast tests. */
const caddyHash = (pw: string) => bcrypt.hashSync(pw, 4).replace(/^\$2b\$/, "$2a$");
const env: Env = { admin: { name: "Luca", passwordHash: caddyHash("admin-secret") }, appUrl: "http://127.0.0.1:3100", cookieSecure: false };

let auth: MemoryAuthRepository;
let clock: number;
let deps: Deps;
let n: number;
let seed: number;

beforeEach(() => {
  n = 0;
  seed = 0;
  clock = 1_000_000;
  auth = new MemoryAuthRepository();
  deps = memoryDeps({ auth, newId: () => `id${++n}`, now: () => clock, random: (b) => new Uint8Array(b).fill(++seed) });
});

const H = 60 * 60 * 1000;
const DAY = 24 * H;

describe("bootstrapAdmin", () => {
  it("creates the admin player once; a renamed admin stays the admin", () => {
    expect(bootstrapAdmin(deps, env)).toBe(true);
    const luca = deps.players.findPlayerByName("Luca")!;
    expect(luca).toMatchObject({ hasLogin: true, isAdmin: true, guestUntil: null });
    expect(bootstrapAdmin(deps, env)).toBe(false);
    renamePlayer(deps, { playerId: luca.id, name: luca.name, isAdmin: true }, luca.id, "Chefin");
    expect(bootstrapAdmin(deps, env)).toBe(false);
    expect(deps.players.findPlayerByName("Luca")).toBeNull();
    expect(deps.players.listPlayers(0)).toHaveLength(1);
  });
  it("does nothing without admin env, and attaches login to an existing player of that name", () => {
    expect(bootstrapAdmin(deps, { ...env, admin: null })).toBe(false);
    createPlayer(deps, "Luca");
    expect(bootstrapAdmin(deps, env)).toBe(true);
    expect(deps.players.listPlayers(0)).toHaveLength(1);
    expect(deps.players.findPlayerByName("luca")).toMatchObject({ hasLogin: true, isAdmin: true });
  });
});

describe("login / session / logout", () => {
  beforeEach(() => bootstrapAdmin(deps, env));

  it("admin logs in with the caddy-format hash and gets an admin session", async () => {
    const r = await login(deps, "luca", "admin-secret");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.session).toMatchObject({ name: "Luca", isAdmin: true });
    expect(sessionFromToken(deps, r.token)).toEqual(r.session);
    expect(auth.sessions.has(r.token)).toBe(false); // only the token's hash is stored in the DB
  });

  it("wrong password, unknown name and player without login all answer invalid-credentials", async () => {
    createGuest(deps, "Gast");
    expect(await login(deps, "Luca", "nope")).toEqual({ ok: false, reason: "invalid-credentials" });
    expect(await login(deps, "Niemand", "admin-secret")).toEqual({ ok: false, reason: "invalid-credentials" });
    expect(await login(deps, "Gast", "")).toEqual({ ok: false, reason: "invalid-credentials" });
    expect(auth.sessions.size).toBe(0);
  });

  it("session is valid for one year from login, not longer, even when used daily", async () => {
    const r = await login(deps, "Luca", "admin-secret");
    if (!r.ok) throw new Error();
    for (let d = 1; d < 365; d += 30) {
      clock = 1_000_000 + d * DAY;
      expect(sessionFromToken(deps, r.token)).not.toBeNull();
    }
    clock = 1_000_000 + SESSION_LIFETIME_MS;
    expect(sessionFromToken(deps, r.token)).toBeNull();
    expect(cleanupSessions(deps)).toBe(1);
  });

  it("logout and a removed login both end the session", async () => {
    const a = await login(deps, "Luca", "admin-secret");
    const b = await login(deps, "Luca", "admin-secret");
    if (!a.ok || !b.ok) throw new Error();
    expect(a.token).not.toBe(b.token);
    logout(deps, a.token);
    expect(sessionFromToken(deps, a.token)).toBeNull();
    expect(sessionFromToken(deps, b.token)).not.toBeNull();
    deps.players.setPasswordHash(b.session.playerId, null);
    expect(sessionFromToken(deps, b.token)).toBeNull();
  });
});

describe("changeOwnPassword", () => {
  it("needs the old password and at least 8 characters; other sessions end, the own one stays", async () => {
    bootstrapAdmin(deps, env);
    const a = await login(deps, "Luca", "admin-secret");
    const b = await login(deps, "Luca", "admin-secret");
    if (!a.ok || !b.ok) throw new Error();
    expect(await changeOwnPassword(deps, a.session, a.token, "falsch", "neues-passwort")).toEqual({
      ok: false,
      reason: "invalid-credentials",
    });
    expect(await changeOwnPassword(deps, a.session, a.token, "admin-secret", "kurz")).toEqual({ ok: false, reason: "password-too-short" });
    expect(await changeOwnPassword(deps, a.session, a.token, "admin-secret", "neues-passwort")).toEqual({ ok: true });
    expect(sessionFromToken(deps, a.token)).not.toBeNull();
    expect(sessionFromToken(deps, b.token)).toBeNull();
    expect((await login(deps, "Luca", "admin-secret")).ok).toBe(false);
    expect((await login(deps, "Luca", "neues-passwort")).ok).toBe(true);
  });
});
