import { beforeEach, describe, expect, it } from "vitest";
import type { Deps } from "./deps";
import { memoryDeps, sqliteDeps } from "./testing";
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
    createMatch(deps, { playerIds: [a.id, g2.id], rules, starterIndex: 0 });
    expect(deletePlayer(deps, as(a.id), g2.id)).toEqual({ ok: false, reason: "player-in-match" });
    expect(deletePlayer(deps, admin, g2.id)).toEqual({ ok: true });
    expect(deletePlayer(deps, admin, g2.id)).toEqual({ ok: false, reason: "not-found" });
  });
});

const rules = { startScore: 501, inRule: "single", outRule: "double" } as const;

describe.each([
  ["memory", () => memoryDeps({ now: () => 1000 })],
  ["sqlite", () => sqliteDeps({ now: () => 1000 })],
])("player service: the admin deletes a player with matches (%s)", (_name, make) => {
  const setup = () => {
    const d = make();
    const published: string[] = [];
    d.events = { publish: (id) => published.push(id) };
    for (const [id, name] of [
      ["a", "A"],
      ["b", "B"],
      ["c", "C"],
      ["h", "H"],
    ])
      d.players.createPlayer({ id, name, createdAt: 1, guestUntil: null, passwordHash: "hash" });
    const match = (playerIds: string[], hostPlayerId: string | null) => createMatch(d, { playerIds, rules, starterIndex: 0, hostPlayerId });
    return { d, published, match };
  };

  it("cancels open matches they sit in or host, keeps finished ones, and removes their login", () => {
    const { d, published, match } = setup();
    const playing = match(["a", "b"], "b");
    const hosting = match(["b", "c"], "a");
    const others = match(["b", "c"], "h");
    const finished = match(["a", "c"], "c");
    d.matches.setMatchStatus(finished, "finished", 500);
    d.auth.createSession({ id: "s", playerId: "a", createdAt: 1, expiresAt: 10_000 });
    d.auth.createInvite({ id: "i", kind: "password", playerId: "a", resetSessions: true, createdAt: 1, expiresAt: 10_000 });

    expect(deletePlayer(d, admin, "a")).toEqual({ ok: true });

    expect([playing, hosting, others, finished].map((id) => d.matches.loadMatch(id)?.status)).toEqual([
      "abandoned",
      "abandoned",
      "running",
      "finished",
    ]);
    expect(published.sort()).toEqual([playing, hosting].sort());
    expect(d.matches.loadMatch(finished)?.players.map((p) => [p.id, p.deletedAt])).toEqual([
      ["a", 1000],
      ["c", null],
    ]);
    expect(listPlayers(d).map((p) => p.id)).toEqual(["b", "c", "h"]);
    expect(d.auth.findSession("s", 0)).toBeNull();
    expect(d.auth.findInvite("i", 0)).toBeNull();
    expect(d.players.credentialsByName("A")).toBeNull();
    expect(ok(createPlayer(d, "a")).player.name).toBe("a"); // the name is free again
  });

  it("a player who only hosted a match can be deleted (used to fail on the foreign key)", () => {
    const { d, match } = setup();
    const hosting = match(["b", "c"], "h");
    expect(deletePlayer(d, admin, "h")).toEqual({ ok: true });
    expect(d.matches.loadMatch(hosting)?.status).toBe("abandoned");
  });
});
