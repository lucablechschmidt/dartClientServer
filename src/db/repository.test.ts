import { describe, expect, it } from "vitest";
import { applyDart, newLeg, scoreOf, winnerOf, type Visit } from "@/domain/x01";
import { openDatabase } from "./client";
import { MemoryMatchRepository } from "./memory-match-repository";
import { MemoryPlayerRepository } from "./memory-player-repository";
import { MemoryStore } from "./memory-store";
import type { MatchRepository, PlayerRepository } from "./repository";
import { SqliteMatchRepository } from "./sqlite-match-repository";
import { SqlitePlayerRepository } from "./sqlite-player-repository";
import { rowToVisit, visitToSlots } from "./visit-mapping";

/** Both repositories over the same storage, as in production (one SQLite connection). */
type Repos = { players: PlayerRepository; matches: MatchRepository };

const impls: [string, () => Repos][] = [
  ["sqlite (in-memory file)", () => {
    const db = openDatabase(":memory:");
    return { players: new SqlitePlayerRepository(db), matches: new SqliteMatchRepository(db) };
  }],
  ["memory", () => {
    const store = new MemoryStore();
    return { players: new MemoryPlayerRepository(store), matches: new MemoryMatchRepository(store) };
  }],
];

let n = 0;
const nextId = () => `id-${++n}`;
const rules = { startScore: 501, inRule: "single", outRule: "double" } as const;
const format = { legsToWinSet: 1, setsToWinMatch: 1 };

describe.each(impls)("Player and match repositories: %s", (_name, make) => {
  const seed = (repo: Repos) => {
    repo.players.createPlayer({ id: "p1", name: "Casey", createdAt: 1, guestUntil: null });
    repo.players.createPlayer({ id: "p2", name: "Sam", createdAt: 2, guestUntil: null });
    repo.matches.createMatch({ id: "m1", legId: "l1", rules, playerIds: ["p1", "p2"], starterIndex: 1, format, inputMode: "single", hostPlayerId: null, startedAt: 10 });
  };

  it("players: create, list in creation order, rename, delete", () => {
    const repo = make();
    repo.players.createPlayer({ id: "b", name: "Bea", createdAt: 2, guestUntil: null });
    repo.players.createPlayer({ id: "a", name: "Al", createdAt: 1, guestUntil: null });
    expect(repo.players.listPlayers(0).map((p) => p.name)).toEqual(["Al", "Bea"]);
    repo.players.renamePlayer("a", "Alex");
    expect(repo.players.listPlayers(0)[0].name).toBe("Alex");
    expect(repo.players.deletePlayer("b")).toBe("deleted");
    expect(repo.players.listPlayers(0)).toHaveLength(1);
  });

  it("login lives on the player: hash never leaves the repository, hasLogin/isAdmin do", () => {
    const repo = make();
    repo.players.createPlayer({ id: "a", name: "Admin", createdAt: 1, guestUntil: null, passwordHash: "$2a$14$x", isAdmin: true });
    repo.players.createPlayer({ id: "g", name: "Gast", createdAt: 2, guestUntil: 100 });
    expect(repo.players.hasAdmin()).toBe(true);
    const listed = repo.players.listPlayers(0);
    expect(listed.map((p) => [p.name, p.hasLogin, p.isAdmin])).toEqual([["Admin", true, true], ["Gast", false, false]]);
    expect(listed.some((p) => "passwordHash" in p)).toBe(false);
    expect(repo.players.credentialsByName("admin")).toEqual({ id: "a", name: "Admin", passwordHash: "$2a$14$x", isAdmin: true });
    expect(repo.players.credentialsById("g")?.passwordHash).toBeNull();
    repo.players.setPasswordHash("g", "h2");
    expect(repo.players.findPlayerById("g")?.hasLogin).toBe(true);
    repo.players.setPasswordHash("a", null);
    expect(repo.players.findPlayerById("a")).toMatchObject({ hasLogin: false, isAdmin: true });
    repo.players.promoteGuest("g");
    expect(repo.players.findPlayerById("g")?.guestUntil).toBeNull();
    repo.players.setAdmin("g", true);
    expect(repo.players.findPlayerById("g")?.isAdmin).toBe(true);
    expect(repo.players.listPlayers(1000).map((p) => p.id)).toEqual(["a", "g"]);
  });

  it("finds players by name ignoring case, including expired guests", () => {
    const repo = make();
    repo.players.createPlayer({ id: "a", name: "Luca", createdAt: 1, guestUntil: null });
    repo.players.createPlayer({ id: "g", name: "Gast", createdAt: 2, guestUntil: 5 });
    expect(repo.players.findPlayerByName("luca")?.id).toBe("a");
    expect(repo.players.findPlayerByName("GAST")?.id).toBe("g");
    expect(repo.players.findPlayerByName("Finn")).toBeNull();
  });

  it("players in a match cannot be deleted", () => {
    const repo = make();
    seed(repo);
    expect(repo.players.deletePlayer("p1")).toBe("player-in-match");
    expect(repo.players.listPlayers(0)).toHaveLength(2);
  });

  it("guests: listed after regular players until guestUntil, then hidden", () => {
    const repo = make();
    repo.players.createPlayer({ id: "g", name: "Gast", createdAt: 1, guestUntil: 100 });
    repo.players.createPlayer({ id: "r", name: "Regular", createdAt: 2, guestUntil: null });
    expect(repo.players.listPlayers(50).map((p) => p.id)).toEqual(["r", "g"]);
    expect(repo.players.listPlayers(100).map((p) => p.id)).toEqual(["r"]);
  });

  it("guest matches expire with the longest-lived guest; regular-only matches never", () => {
    const repo = make();
    repo.players.createPlayer({ id: "r", name: "Regular", createdAt: 1, guestUntil: null });
    repo.players.createPlayer({ id: "a", name: "Gast A", createdAt: 2, guestUntil: 100 });
    repo.players.createPlayer({ id: "b", name: "Gast B", createdAt: 3, guestUntil: 300 });
    repo.matches.createMatch({ id: "mg", legId: "lg", rules, playerIds: ["r", "a", "b"], starterIndex: 0, format, inputMode: "single", hostPlayerId: null, startedAt: 10 });
    repo.matches.createMatch({ id: "mr", legId: "lr", rules, playerIds: ["r"], starterIndex: 0, format, inputMode: "single", hostPlayerId: null, startedAt: 10 });
    const v: Visit = { playerId: "r", darts: [{ field: 20, type: "triple" }], isBust: false };
    repo.matches.syncVisits("lg", [v], 0, nextId, 10);
    expect(repo.matches.listExpiredGuestMatches(200)).toEqual([]);
    const expired = repo.matches.listExpiredGuestMatches(300);
    expect(expired.map((m) => m.id)).toEqual(["mg"]);
    expect(expired[0].regularPlayerIds).toEqual(["r"]);
    expect(expired[0].visits).toEqual([v]);
    repo.matches.deleteMatch("mg");
    expect(repo.matches.loadMatch("mg")).toBeNull();
    expect(repo.matches.loadMatch("mr")).not.toBeNull();
    repo.players.deleteOrphanGuests(300);
    expect(repo.players.listPlayers(0).map((p) => p.id)).toEqual(["r"]);
  });

  it("field hits accumulate per player and field", () => {
    const repo = make();
    repo.players.createPlayer({ id: "r", name: "Regular", createdAt: 1, guestUntil: null });
    repo.players.addFieldHits("r", new Map([[20, 4], [5, 3]]));
    repo.players.addFieldHits("r", new Map([[20, 1], [0, 0]]));
    expect(repo.players.fieldHitsOf("r")).toEqual(new Map([[20, 5], [5, 3]]));
    expect(repo.players.fieldHitsOf("nobody")).toEqual(new Map());
  });

  it("lists open matches: running and started after openSince, newest first", () => {
    const repo = make();
    repo.players.createPlayer({ id: "p1", name: "Casey", createdAt: 1, guestUntil: null });
    repo.matches.createMatch({ id: "old", legId: "l0", rules, playerIds: ["p1"], starterIndex: 0, format, inputMode: "single", hostPlayerId: "p1", startedAt: 10 });
    repo.matches.createMatch({ id: "new", legId: "l1", rules, playerIds: ["p1"], starterIndex: 0, format, inputMode: "per-player", hostPlayerId: "p1", startedAt: 500 });
    repo.matches.createMatch({ id: "done", legId: "l2", rules, playerIds: ["p1"], starterIndex: 0, format, inputMode: "single", hostPlayerId: "p1", startedAt: 600 });
    repo.matches.setMatchStatus("done", "abandoned", 700);
    expect(repo.matches.listOpenMatches(100).map((m) => [m.id, m.inputMode])).toEqual([["new", "per-player"]]);
    expect(repo.matches.listOpenMatches(0).map((m) => m.id)).toEqual(["new", "old"]);
    expect(repo.matches.loadMatch("new")).toMatchObject({ inputMode: "per-player", hostPlayerId: "p1" });
  });

  it("creates a match with seats, starter and an empty first leg", () => {
    const repo = make();
    seed(repo);
    const m = repo.matches.loadMatch("m1");
    expect(m).not.toBeNull();
    expect(m!.players.map((p) => p.name)).toEqual(["Casey", "Sam"]);
    expect(m!.state.legs[0].starter).toBe(1);
    expect(m!.state.legs[0].visits).toEqual([]);
    expect(m!.status).toBe("running");
    expect(repo.matches.loadMatch("nope")).toBeNull();
  });

  it("round-trips visits including open, bust and finishing ones", () => {
    const repo = make();
    seed(repo);
    let s = newLeg(["p1", "p2"], rules, 1);
    const throwAll = (...darts: Parameters<typeof applyDart>[1][]) => {
      for (const d of darts) {
        const r = applyDart(s, d);
        if (!r.ok) throw new Error(r.reason);
        s = r.value;
      }
    };
    throwAll({ field: 20, type: "triple" }, { field: 20, type: "triple" }, { field: 20, type: "triple" }); // p2: 321
    throwAll({ field: 20, type: "single" }, { field: 5, type: "single" }); // p1 open visit
    repo.matches.syncVisits("l1", s.visits, 0, nextId, 100);
    let loaded = repo.matches.loadMatch("m1")!;
    expect(loaded.state.legs[0].visits).toEqual(s.visits);
    expect(scoreOf(loaded.state.legs[0], "p1")).toBe(476);

    // only the last visit changes: third dart
    throwAll({ field: 1, type: "single" });
    repo.matches.syncVisits("l1", s.visits, s.visits.length - 1, nextId, 101);
    loaded = repo.matches.loadMatch("m1")!;
    expect(loaded.state.legs[0].visits).toEqual(s.visits);

    // bust visit with overthrown slots
    s = { ...s, visits: [...s.visits, { playerId: "p2", darts: [{ field: 20, type: "single" }, { field: 0, type: "overthrown" }, { field: 0, type: "overthrown" }], isBust: true }] };
    repo.matches.syncVisits("l1", s.visits, s.visits.length - 1, nextId, 102);
    loaded = repo.matches.loadMatch("m1")!;
    expect(loaded.state.legs[0].visits.at(-1)).toEqual(s.visits.at(-1));

    // undo: last visit removed
    s = { ...s, visits: s.visits.slice(0, -1) };
    repo.matches.syncVisits("l1", s.visits, s.visits.length, nextId, 103);
    loaded = repo.matches.loadMatch("m1")!;
    expect(loaded.state.legs[0].visits).toHaveLength(2);
    expect(winnerOf(loaded.state.legs[0])).toBeNull();
  });

  it("finishes and reopens a leg and sets the match status", () => {
    const repo = make();
    seed(repo);
    repo.matches.finishLeg("l1", "p1", 500);
    repo.matches.setMatchStatus("m1", "finished", 500);
    let m = repo.matches.loadMatch("m1")!;
    expect(m.legs[0].winnerPlayerId).toBe("p1");
    expect(m.status).toBe("finished");
    expect(m.finishedAt).toBe(500);
    repo.matches.reopenLeg("l1");
    repo.matches.setMatchStatus("m1", "running", 501);
    m = repo.matches.loadMatch("m1")!;
    expect(m.legs[0].winnerPlayerId).toBeNull();
    expect(m.status).toBe("running");
    expect(m.finishedAt).toBeNull();
  });
});

describe.each(impls)("Legs (M5): %s", (_name, make) => {
  const seed = (repo: Repos) => {
    repo.players.createPlayer({ id: "p1", name: "Casey", createdAt: 1, guestUntil: null });
    repo.players.createPlayer({ id: "p2", name: "Sam", createdAt: 2, guestUntil: null });
    repo.matches.createMatch({ id: "m1", legId: "l1", rules, playerIds: ["p1", "p2"], starterIndex: 0, format: { legsToWinSet: 2, setsToWinMatch: 3 }, inputMode: "single", hostPlayerId: null, startedAt: 10 });
  };
  const v = (playerId: string): Visit => ({ playerId, darts: [{ field: 20, type: "single" }], isBust: false });

  it("stores the format and loads all legs in order with their visits, starter and play-out", () => {
    const repo = make();
    seed(repo);
    repo.matches.syncVisits("l1", [v("p1")], 0, nextId, 11);
    repo.matches.createLeg({ id: "l2", matchId: "m1", setNo: 1, legNo: 2, starterPlayerId: "p2" });
    repo.matches.syncVisits("l2", [v("p2"), v("p1")], 0, nextId, 12);
    repo.matches.setPlayOut("l2", true);
    const m = repo.matches.loadMatch("m1")!;
    expect(m.format).toEqual({ legsToWinSet: 2, setsToWinMatch: 3 });
    expect(m.legs.map((l) => [l.id, l.setNo, l.legNo])).toEqual([["l1", 1, 1], ["l2", 1, 2]]);
    expect(m.state.legs.map((l) => [l.starter, l.visits.length, l.playOut])).toEqual([[0, 1, false], [1, 2, true]]);
  });

  it("changes the starter, deletes a leg with its visits, sets places", () => {
    const repo = make();
    seed(repo);
    repo.matches.createLeg({ id: "l2", matchId: "m1", setNo: 1, legNo: 2, starterPlayerId: "p2" });
    repo.matches.setLegStarter("l2", "p1");
    expect(repo.matches.loadMatch("m1")!.state.legs[1].starter).toBe(0);
    repo.matches.syncVisits("l2", [v("p1")], 0, nextId, 12);
    repo.matches.deleteLeg("l2");
    expect(repo.matches.loadMatch("m1")!.state.legs).toHaveLength(1);
    repo.matches.setPlacements("m1", { p1: 2, p2: 1 });
    repo.matches.setPlacements("m1", { p1: null, p2: null });
  });
});

describe("visit mapping", () => {
  it("maps slots both ways, empty slots as NULL", () => {
    const v: Visit = { playerId: "p", darts: [{ field: 25, type: "double" }], isBust: false };
    const slots = visitToSlots(v);
    expect(slots).toEqual({ d1Field: 25, d1Type: "double", d2Field: null, d2Type: null, d3Field: null, d3Type: null, isBust: false });
    expect(rowToVisit({ id: "x", legId: "l", playerId: "p", seq: 0, createdAt: 0, ...slots })).toEqual(v);
  });
});
