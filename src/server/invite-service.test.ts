import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryAuthRepository } from "@/db/memory-auth-repository";
import { GUEST_LIFETIME_MS } from "@/domain/player";
import { promoteGuest } from "./admin-service";
import { bootstrapAdmin, login, sessionFromToken } from "./auth-service";
import type { Deps } from "./deps";
import { memoryDeps } from "./testing";
import type { Env } from "./env";
import { cleanupGuests } from "./guest-cleanup";
import { createPasswordInvite, createRegisterInvite, INVITE_LIFETIME_MS, inviteInfo, redeem } from "./invite-service";
import { createGuest, listPlayers } from "./player-service";

const env: Env = { admin: { name: "Luca", passwordHash: bcrypt.hashSync("admin-secret", 4) }, appUrl: "http://x", cookieSecure: false };
let auth: MemoryAuthRepository;
let clock: number;
let deps: Deps;
let n: number;
let seed: number;
const pw = { password: "passwort1", passwordRepeat: "passwort1" };

beforeEach(() => {
  n = 0;
  seed = 0;
  clock = 1_000_000;
  auth = new MemoryAuthRepository();
  deps = memoryDeps({ auth, newId: () => `id${++n}`, now: () => clock, random: (b) => new Uint8Array(b).fill(++seed) });
  bootstrapAdmin(deps, env);
});

const adminSession = () => ({ playerId: deps.players.findPlayerByName("Luca")!.id, name: "Luca", isAdmin: true });

describe("invite: register (case A, C, D, E)", () => {
  it("A: a free name creates a player with login, uses the token and starts a session", async () => {
    const token = createRegisterInvite(deps);
    expect(inviteInfo(deps, token)).toEqual({ kind: "register" });
    const r = await redeem(deps, token, { name: "Mara", ...pw });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(sessionFromToken(deps, r.token)).toMatchObject({ name: "Mara", isAdmin: false });
    expect(deps.players.findPlayerByName("mara")).toMatchObject({ hasLogin: true, guestUntil: null });
    expect((await login(deps, "Mara", "passwort1")).ok).toBe(true);
    // E: token used up
    expect(inviteInfo(deps, token)).toBeNull();
    expect(await redeem(deps, token, { name: "Noch", ...pw })).toEqual({ ok: false, reason: "invalid-token" });
  });

  it("C: the name of a player with login is rejected and the token stays valid", async () => {
    const token = createRegisterInvite(deps);
    expect(await redeem(deps, token, { name: "luca", ...pw })).toEqual({ ok: false, reason: "name-taken" });
    expect(inviteInfo(deps, token)).not.toBeNull();
  });

  it("D: the name of a guest or a player without login is rejected with its own reason", async () => {
    createGuest(deps, "Mara");
    const token = createRegisterInvite(deps);
    expect(await redeem(deps, token, { name: "MARA", ...pw })).toEqual({ ok: false, reason: "name-without-login" });
    expect(inviteInfo(deps, token)).not.toBeNull();
  });

  it("E: expired or unknown tokens are invalid; password rules apply before anything is created", async () => {
    const token = createRegisterInvite(deps);
    expect(await redeem(deps, token, { name: "Mara", password: "kurz", passwordRepeat: "kurz" })).toEqual({
      ok: false,
      reason: "password-too-short",
    });
    expect(await redeem(deps, token, { name: "Mara", password: "passwort1", passwordRepeat: "passwort2" })).toEqual({
      ok: false,
      reason: "password-mismatch",
    });
    clock += INVITE_LIFETIME_MS;
    expect(inviteInfo(deps, token)).toBeNull();
    expect(await redeem(deps, token, { name: "Mara", ...pw })).toEqual({ ok: false, reason: "invalid-token" });
    expect(await redeem(deps, "garbage", { name: "Mara", ...pw })).toEqual({ ok: false, reason: "invalid-token" });
    expect(listPlayers(deps)).toHaveLength(1);
  });
});

describe("invite: password (case F and reset)", () => {
  it("F: a promoted guest gets a login through a fixed-player invite and is no longer cleaned up", async () => {
    const guest = createGuest(deps, "Mara");
    if (!guest.ok) throw new Error();
    expect(promoteGuest(deps, adminSession(), guest.player.id)).toEqual({ ok: true });
    expect(deps.players.findPlayerById(guest.player.id)?.guestUntil).toBeNull();
    const token = createPasswordInvite(deps, guest.player.id, false)!;
    expect(inviteInfo(deps, token)).toEqual({ kind: "password", playerName: "Mara", reset: false });
    const r = await redeem(deps, token, pw);
    expect(r.ok).toBe(true);
    clock += GUEST_LIFETIME_MS + 1;
    cleanupGuests(deps);
    expect(deps.players.findPlayerByName("Mara")).toMatchObject({ hasLogin: true });
    expect(inviteInfo(deps, token)).toBeNull();
  });

  it("no password invite for guests", () => {
    const guest = createGuest(deps, "Gast");
    if (!guest.ok) throw new Error();
    expect(createPasswordInvite(deps, guest.player.id, true)).toBeNull();
  });

  it("reset: sets a new password and ends the old sessions; a plain login-invite keeps them", async () => {
    const reg = createRegisterInvite(deps);
    const mara = await redeem(deps, reg, { name: "Mara", ...pw });
    if (!mara.ok) throw new Error();
    const old = await login(deps, "Mara", "passwort1");
    if (!old.ok) throw new Error();
    const reset = createPasswordInvite(deps, mara.session.playerId, true)!;
    expect(inviteInfo(deps, reset)).toMatchObject({ reset: true });
    const r = await redeem(deps, reset, { password: "neues-pw-99", passwordRepeat: "neues-pw-99" });
    expect(r.ok).toBe(true);
    expect(sessionFromToken(deps, old.token)).toBeNull();
    expect((await login(deps, "Mara", "passwort1")).ok).toBe(false);
    expect((await login(deps, "Mara", "neues-pw-99")).ok).toBe(true);
  });
});
