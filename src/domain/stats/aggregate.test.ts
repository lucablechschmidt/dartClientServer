import { describe, expect, it } from "vitest";
import { leaderboard, rangeStart, records, type StatsMatch } from "./aggregate";
import { eloRatings, ELO_START } from "./elo";

let n = 0;
/** A finished match; `order` best first, players listed together share a place. */
function match(mode: StatsMatch["mode"], order: (string | string[])[], finishedAt = ++n, hasGuest = false): StatsMatch {
  const placements: Record<string, number> = {};
  order.forEach((p, i) => {
    for (const id of Array.isArray(p) ? p : [p]) placements[id] = i + 1;
  });
  return { id: `m${n}`, mode, finishedAt, players: Object.keys(placements), placements, hasGuest };
}

describe("Elo per mode (m8-plan §1)", () => {
  it("A (1000) beats B (1000): 1016 and 984; a second win brings less", () => {
    const one = eloRatings([match("x01", ["a", "b"])], "x01");
    expect([one.get("a"), one.get("b")]).toEqual([1016, 984]);
    const two = eloRatings([match("x01", ["a", "b"]), match("x01", ["a", "b"])], "x01");
    expect(two.get("a")! - 1016).toBeLessThan(16);
    expect(two.get("a")! + two.get("b")!).toBeCloseTo(2 * ELO_START);
  });

  it("only 1 vs 1 of that mode without guests, in the order they finished; a shared place is a draw", () => {
    const ratings = eloRatings(
      [
        match("cricket", ["a", "b"]),
        match("x01", ["a", "b", "c"]),
        match("x01", ["b", "a"], 50, true),
        match("x01", ["c", "a"], 30),
        match("x01", ["a", "c"], 20),
        match("splitscore", [["a", "b"]]),
      ],
      "x01",
    );
    // a beats c first (20): 1016 / 984; then c beats a (30): a loses K × its expected score
    const expectedA = 1 / (1 + 10 ** ((984 - 1016) / 400));
    expect(ratings.get("a")).toBeCloseTo(1016 - 32 * expectedA, 6);
    expect(ratings.has("b")).toBe(false);
    expect(eloRatings([match("splitscore", [["a", "b"]])], "splitscore").get("a")).toBe(1000);
  });
});

describe("records and leaderboard", () => {
  it("games and wins per mode, guest matches left out", () => {
    const r = records(
      [match("x01", ["a", "b"]), match("x01", ["b", "a", "c"]), match("cricket", ["a", "b"]), match("x01", ["a", "b"], 9, true)],
      "a",
    );
    expect(r).toEqual({ x01: { games: 2, wins: 1 }, cricket: { games: 1, wins: 1 } });
  });

  it("everyone with a counted match of the mode, by Elo then games; deleted players and other modes out", () => {
    const ms = [
      match("x01", ["a", "b"]),
      match("x01", ["a", "c"]),
      match("x01", ["b", "c", "d"]),
      match("cricket", ["e", "a"]),
      match("x01", ["x", "a"]),
    ];
    const rows = leaderboard(ms, "x01", new Set(["x"]));
    // a beats b and c, then loses to the deleted x (still counts for a); c lost to a stronger a than b did
    expect(rows.map((r) => r.player)).toEqual(["a", "d", "c", "b"]);
    expect(rows[0]).toMatchObject({ place: 1, games: 3, wins: 2 });
    expect(rows.find((r) => r.player === "d")).toMatchObject({ elo: 1000, games: 1, wins: 0 });
  });

  it("equal Elo and games share the place", () => {
    const rows = leaderboard([match("x01", ["a", "b", "c"])], "x01", new Set());
    expect(rows.map((r) => r.place)).toEqual([1, 1, 1]);
  });
});

describe("rangeStart", () => {
  const now = new Date(2026, 10, 5, 12).getTime();
  it("all: none; 30 days back; this year from 1 January", () => {
    expect(rangeStart("all", now)).toBeNull();
    expect(rangeStart("30d", now)).toBe(now - 30 * 24 * 60 * 60 * 1000);
    expect(rangeStart("year", now)).toBe(new Date(2026, 0, 1).getTime());
  });
});
