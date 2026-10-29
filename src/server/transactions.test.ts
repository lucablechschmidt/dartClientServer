import { describe, expect, it } from "vitest";
import type { Dart } from "@/domain/x01";
import { createRegisterInvite, redeem } from "./invite-service";
import { commitVisit, createMatch, loadMatchView } from "./match-service";
import { cleanupGuests } from "./guest-cleanup";
import { createGuest, createPlayer, listPlayers } from "./player-service";
import { memoryDeps, sqliteDeps } from "./testing";

const D20: Dart = { field: 20, type: "double" };
const admin = { playerId: "x", name: "x", isAdmin: true };
const pw = { password: "passwort1", passwordRepeat: "passwort1" };
const ok = <T extends { ok: boolean }>(r: T) => {
  if (!r.ok) throw new Error("expected ok");
  return r as Extract<T, { ok: true }>;
};

describe("transactions (SQLite)", () => {
  it("a failure after the visit is written rolls the visit back", () => {
    const deps = sqliteDeps();
    const a = ok(createPlayer(deps, "Casey")).player;
    const id = createMatch(deps, { playerIds: [a.id], rules: { startScore: 40, inRule: "single", outRule: "double" }, starterIndex: 0, hostPlayerId: a.id });
    deps.matches.finishLeg = () => {
      throw new Error("disk full");
    };
    expect(() => commitVisit(deps, { ...admin, playerId: a.id }, id, 0, [D20])).toThrow("disk full");
    const view = loadMatchView(deps, id)!;
    expect(view.state.visits).toEqual([]);
    expect(view.status).toBe("running");
  });

  it("the same visit commits completely when nothing fails", () => {
    const deps = sqliteDeps();
    const a = ok(createPlayer(deps, "Casey")).player;
    const id = createMatch(deps, { playerIds: [a.id], rules: { startScore: 40, inRule: "single", outRule: "double" }, starterIndex: 0, hostPlayerId: a.id });
    expect(commitVisit(deps, { ...admin, playerId: a.id }, id, 0, [D20]).ok).toBe(true);
    expect(loadMatchView(deps, id)!.status).toBe("finished");
  });

  it("guest cleanup keeps the match and adds no field hits when deleting it fails", () => {
    let clock = 1_000_000;
    const deps = sqliteDeps({ now: () => clock });
    const a = ok(createPlayer(deps, "Casey")).player;
    const g = ok(createGuest(deps, "Guest")).player;
    const id = createMatch(deps, { playerIds: [a.id, g.id], rules: { startScore: 501, inRule: "single", outRule: "double" }, starterIndex: 0, hostPlayerId: a.id });
    commitVisit(deps, { ...admin, playerId: a.id }, id, 0, [{ field: 20, type: "triple" }, { field: 20, type: "single" }, { field: 5, type: "triple" }]);
    clock += 24 * 60 * 60 * 1000;
    deps.matches.deleteMatch = () => {
      throw new Error("locked");
    };
    expect(() => cleanupGuests(deps)).toThrow("locked");
    expect(deps.players.fieldHitsOf(a.id)).toEqual(new Map());
    expect(loadMatchView(deps, id)).not.toBeNull();
  });
});

describe("redeem race", () => {
  it("two requests with the same invite: exactly one succeeds, one player is created", async () => {
    const deps = memoryDeps();
    const token = createRegisterInvite(deps);
    const [r1, r2] = await Promise.all([redeem(deps, token, { name: "Mara", ...pw }), redeem(deps, token, { name: "Nora", ...pw })]);
    expect([r1.ok, r2.ok].sort()).toEqual([false, true]);
    expect([r1, r2].find((r) => !r.ok)).toEqual({ ok: false, reason: "invalid-token" });
    expect(listPlayers(deps).map((p) => p.name)).toHaveLength(1);
  });
  it("two invites, same name at the same time: only one player gets the name", async () => {
    const deps = memoryDeps();
    const [t1, t2] = [createRegisterInvite(deps), createRegisterInvite(deps)];
    const [r1, r2] = await Promise.all([redeem(deps, t1, { name: "Mara", ...pw }), redeem(deps, t2, { name: "mara", ...pw })]);
    expect([r1.ok, r2.ok].sort()).toEqual([false, true]);
    expect(listPlayers(deps)).toHaveLength(1);
  });
});
