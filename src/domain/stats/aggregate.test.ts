import { describe, expect, it } from "vitest";
import { inRange, leaderboard, rangeStart, records, type StatsMatch } from "./aggregate";
import { eloFactor, eloHistory, eloRatings, ELO_K, ELO_START } from "./elo";

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

  it("only that mode, without guests and solo games, in the order they finished; a shared place is a draw", () => {
    const ratings = eloRatings(
      [
        match("cricket", ["a", "b"]),
        match("x01", ["b"]),
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

  it("history: one point per player after each rated match, oldest first; the last one is the rating", () => {
    const matches = [match("x01", ["c", "a"], 30), match("x01", ["a", "b"], 20), match("x01", ["a", "b", "c"], 25, true)];
    const history = eloHistory(matches, "x01");
    expect(history.get("a")!.map((p) => [p.finishedAt, Math.round(p.elo)])).toEqual([
      [20, 1016],
      [30, 999],
    ]);
    expect(history.get("b")).toEqual([{ matchId: matches[1].id, finishedAt: 20, elo: 984 }]);
    expect(history.get("c")!.at(-1)!.elo).toBe(eloRatings(matches, "x01").get("c"));
    expect(inRange(history.get("a")!, "30d", 30 + 30 * 24 * 60 * 60 * 1000).map((p) => p.finishedAt)).toEqual([30]);
    expect(inRange(history.get("a")!, "all", 1e12)).toHaveLength(2);
  });
});

describe("Elo with more than two players (E8, 19.11.2026)", () => {
  const change = (order: (string | string[])[]) => {
    const r = eloRatings([match("x01", order)], "x01");
    return Object.fromEntries([...r].map(([p, elo]) => [p, Math.round((elo - ELO_START) * 100) / 100]));
  };

  it("each duel weighs K/√(n−1): K for two, K/√2 for three, K/√3 for four", () => {
    expect(eloFactor(2)).toBe(ELO_K);
    expect(eloFactor(3)).toBeCloseTo(ELO_K / Math.SQRT2);
    expect(eloFactor(4)).toBeCloseTo(ELO_K / Math.sqrt(3));
  });

  it("four at 1000: +27.71, +9.24, −9.24, −27.71; the changes add up to zero", () => {
    expect(change(["a", "b", "c", "d"])).toEqual({ a: 27.71, b: 9.24, c: -9.24, d: -27.71 });
  });

  it("three at 1000: the winner +22.63, the middle stays, the last −22.63", () => {
    expect(change(["a", "b", "c"])).toEqual({ a: 22.63, b: 0, c: -22.63 });
  });

  it("a shared place is a draw between those two and a win over the ones behind", () => {
    expect(change(["a", ["b", "c"], "d"])).toEqual({ a: 27.71, b: 0, c: 0, d: -27.71 });
  });

  it("all duels use the ratings from before the match", () => {
    const ratings = eloRatings([match("x01", ["a", "b"]), match("x01", ["c", "b", "a"])], "x01");
    const [a0, b0, c0] = [1016, 984, 1000];
    const e = (own: number, other: number) => 1 / (1 + 10 ** ((other - own) / 400));
    expect(ratings.get("a")).toBeCloseTo(a0 + eloFactor(3) * (0 - e(a0, b0) + 0 - e(a0, c0)), 6);
    expect(ratings.get("b")).toBeCloseTo(b0 + eloFactor(3) * (1 - e(b0, a0) + 0 - e(b0, c0)), 6);
    expect(ratings.get("c")).toBeCloseTo(c0 + eloFactor(3) * (1 - e(c0, a0) + 1 - e(c0, b0)), 6);
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
    // a beats b and c, then loses to the deleted x (still counts for a); b wins the game of three, d,
    // last there, drops below 1000
    expect(rows.map((r) => r.player)).toEqual(["a", "b", "c", "d"]);
    expect(rows[0]).toMatchObject({ place: 1, games: 3, wins: 2 });
    expect(rows.find((r) => r.player === "d")).toMatchObject({ games: 1, wins: 0 });
    expect(rows.find((r) => r.player === "d")!.elo).toBeLessThan(ELO_START);
  });

  it("equal Elo and games share the place", () => {
    const rows = leaderboard([match("x01", [["a", "b", "c"]])], "x01", new Set());
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
