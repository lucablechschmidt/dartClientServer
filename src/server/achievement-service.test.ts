import { describe, expect, it } from "vitest";
import type { Visit } from "@/domain/game";
import type { Session } from "@/domain/player";
import { deleteMatchAsAdmin } from "./cleanup-service";
import type { Deps } from "./deps";
import { myAchievements, newInMatch } from "./achievement-service";
import { memoryDeps, sqliteDeps } from "./testing";

const as = (playerId: string, isAdmin = false): Session => ({ playerId, name: playerId, isAdmin });
const v = (playerId: string, darts: [number, "single" | "double" | "triple"][]): Visit => ({
  playerId,
  darts: darts.map(([field, type]) => ({ field, type })),
  isBust: false,
});
const T20: [number, "triple"] = [20, "triple"];
const MISS = (p: string) =>
  v(p, [
    [0, "single"],
    [0, "single"],
    [0, "single"],
  ]);

describe.each([
  ["memory", () => memoryDeps({ now: () => 10_000 })],
  ["sqlite", () => sqliteDeps({ now: () => 10_000 })],
])("achievement service (%s)", (_name, make) => {
  let n = 0;
  /** A finished 301 single-out game: a throws 180 then 121, b misses. */
  function game(d: Deps, a: string, b: string, finishedAt: number) {
    const id = `m${++n}`;
    d.matches.createMatch({
      mode: "x01",
      id,
      legId: `${id}-l`,
      rules: { startScore: 301, inRule: "single", outRule: "single" },
      playerIds: [a, b],
      starterIndex: 0,
      format: { legsToWinSet: 1, setsToWinMatch: 1 },
      inputMode: "single",
      hostPlayerId: null,
      startedAt: finishedAt - 1,
    });
    d.matches.syncVisits(
      `${id}-l`,
      [v(a, [T20, T20, T20]), MISS(b), v(a, [T20, T20, [1, "single"]])],
      0,
      () => `${id}-v${++n}`,
      finishedAt,
    );
    d.matches.setMatchStatus(id, "finished", finishedAt);
    d.matches.setPlacements(id, { [a]: 1, [b]: 2 });
    return id;
  }
  const setup = () => {
    const d = make();
    for (const id of ["a", "b"]) d.players.createPlayer({ id, name: id.toUpperCase(), createdAt: 1, guestUntil: null });
    d.players.createPlayer({ id: "g", name: "Gast", createdAt: 1, guestUntil: 99_999 });
    return d;
  };

  it("my gallery: earned at the first game, saved guest-game facts included, a deleted game no longer counts", () => {
    const d = setup();
    const first = game(d, "a", "b", 100);
    game(d, "a", "b", 200);
    d.players.addAchievements("a", ["shanghai", "double-16"], 50);
    const g = myAchievements(d, as("a"));
    expect(g.find((x) => x.key === "180")?.earnedAt).toBe(100);
    expect(g.find((x) => x.key === "shanghai")?.earnedAt).toBe(50);
    expect(g.find((x) => x.key === "all-finishes")?.progress).toEqual({ done: 1, of: 21 });
    expect(myAchievements(d, as("b")).every((x) => x.earnedAt === null)).toBe(true);
    deleteMatchAsAdmin(d, as("admin", true), first);
    expect(myAchievements(d, as("a")).find((x) => x.key === "180")?.earnedAt).toBe(200);
  });

  it("new in a game: only what no earlier game brought, guests never, nothing for a running game", () => {
    const d = setup();
    const first = game(d, "a", "g", 100);
    expect(newInMatch(d, first)).toEqual([{ playerId: "a", name: "A", keys: ["180"] }]);
    const second = game(d, "a", "b", 200);
    expect(newInMatch(d, second)).toEqual([]);
    expect(newInMatch(d, game(d, "b", "a", 300))).toEqual([{ playerId: "b", name: "B", keys: ["180"] }]);
    const running = `m${++n}`;
    d.matches.createMatch({
      mode: "x01",
      id: running,
      legId: `${running}-l`,
      rules: { startScore: 301, inRule: "single", outRule: "single" },
      playerIds: ["a", "b"],
      starterIndex: 0,
      format: { legsToWinSet: 1, setsToWinMatch: 1 },
      inputMode: "single",
      hostPlayerId: null,
      startedAt: 1,
    });
    expect(newInMatch(d, running)).toEqual([]);
    expect(newInMatch(d, "nope")).toEqual([]);
  });
});
