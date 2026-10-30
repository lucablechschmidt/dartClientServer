import { beforeEach, describe, expect, it } from "vitest";
import type { Deps } from "./deps";
import { memoryDeps } from "./testing";
import { createMatch } from "./match-service";
import type { Session } from "@/domain/player";
import { createGuest, createPlayer, deletePlayer, listPlayers, renamePlayer } from "./player-service";

const admin: Session = { playerId: "admin", name: "Admin", isAdmin: true };
const as = (playerId: string): Session => ({ playerId, name: playerId, isAdmin: false });

let deps: Deps;
let n: number;
beforeEach(() => {
  n = 0;
  deps = memoryDeps({ newId: () => `id${++n}`, now: () => 1000 });
});
const ok = <T extends { ok: boolean }>(r: T) => {
  if (!r.ok) throw new Error("expected ok");
  return r as Extract<T, { ok: true }>;
};

describe("player service: unique names", () => {
  it("rejects a second player with the same name, ignoring case, guests included", () => {
    ok(createPlayer(deps, "Luca"));
    expect(createPlayer(deps, "luca")).toEqual({ ok: false, reason: "name-taken" });
    expect(createGuest(deps, "LUCA")).toEqual({ ok: false, reason: "name-taken" });
    const guest = ok(createGuest(deps, "Gast")).player;
    expect(createPlayer(deps, "gast")).toEqual({ ok: false, reason: "name-taken" });
    expect(renamePlayer(deps, admin, guest.id, "Luca")).toEqual({ ok: false, reason: "name-taken" });
    expect(renamePlayer(deps, admin, guest.id, "gast")).toEqual({ ok: true }); // own name, different case
    expect(listPlayers(deps).map((p) => p.name)).toEqual(["Luca", "gast"]);
  });
  it("rename rights: self and guests for everyone, everything for the admin", () => {
    const a = ok(createPlayer(deps, "A")).player;
    const b = ok(createPlayer(deps, "B")).player;
    const g = ok(createGuest(deps, "G")).player;
    expect(renamePlayer(deps, as(a.id), a.id, "Anna")).toEqual({ ok: true });
    expect(renamePlayer(deps, as(a.id), g.id, "Gustav")).toEqual({ ok: true });
    expect(renamePlayer(deps, as(a.id), b.id, "Bert")).toEqual({ ok: false, reason: "forbidden" });
    expect(renamePlayer(deps, admin, b.id, "Bert")).toEqual({ ok: true });
    expect(renamePlayer(deps, admin, "nope", "X")).toEqual({ ok: false, reason: "not-found" });
    expect(listPlayers(deps).map((p) => p.name)).toEqual(["Anna", "Bert", "Gustav"]);
  });
  it("delete rights: guests for everyone, regular players only for the admin and never admins or self", () => {
    const a = ok(createPlayer(deps, "A")).player;
    const g = ok(createGuest(deps, "G")).player;
    deps.players.createPlayer({ id: "admin", name: "Admin", createdAt: 1, guestUntil: null, passwordHash: "h", isAdmin: true });
    deps.players.createPlayer({ id: "admin2", name: "Admin2", createdAt: 1, guestUntil: null, passwordHash: "h", isAdmin: true });
    expect(deletePlayer(deps, as(a.id), g.id)).toEqual({ ok: true });
    expect(deletePlayer(deps, as(a.id), a.id)).toEqual({ ok: false, reason: "forbidden" });
    expect(deletePlayer(deps, admin, "admin")).toEqual({ ok: false, reason: "forbidden" });
    expect(deletePlayer(deps, admin, "admin2")).toEqual({ ok: false, reason: "forbidden" });
    const g2 = ok(createGuest(deps, "G2")).player;
    createMatch(deps, { playerIds: [a.id, g2.id], rules: { startScore: 501, inRule: "single", outRule: "double" }, starterIndex: 0 });
    expect(deletePlayer(deps, admin, g2.id)).toEqual({ ok: false, reason: "player-in-match" });
    expect(deletePlayer(deps, admin, a.id)).toEqual({ ok: false, reason: "player-in-match" });
  });
});
