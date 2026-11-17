import { describe, expect, it } from "vitest";
import { newLeg } from "../game/state";
import type { Dart, LegState, Visit } from "../game/types";
import { pointsStats } from "./final-points";

const rules = { startScore: 40, inRule: "single", outRule: "single" } as const;
const S = (field: number): Dart => ({ field, type: "single" });
const T = (field: number): Dart => ({ field, type: "triple" });
const OVER: Dart = { field: 0, type: "overthrown" };
/** A visit without a hit, as stored: darts off the target are overthrown (SplitScore), a miss in Cricket too. */
const MISS = [OVER, OVER, OVER];
const visit = (playerId: string, darts: Dart[]): Visit => ({ playerId, darts, isBust: false });
const leg = (mode: "cricket" | "splitscore", visits: Visit[]): LegState => ({ ...newLeg(["a", "b"], rules, 0, mode), visits });

describe("points at the end (Cricket, SplitScore)", () => {
  it("SplitScore: high score and average of the final points, whatever the place", () => {
    // a hits 15 (S15 T15 → 40 + 60 = 100), b misses (40 → 20); then a misses (100 → 50), b hits 16 (20 + 16)
    const first = leg("splitscore", [
      visit("a", [S(15), T(15), OVER]),
      visit("b", MISS),
      visit("a", MISS),
      visit("b", [S(16), OVER, OVER]),
    ]);
    // a hits 15 once: 40 + 15
    const second = leg("splitscore", [visit("a", [S(15), OVER, OVER])]);
    expect(pointsStats("splitscore", [[first], [second]], "a")).toEqual({ games: 2, highScore: 55, average: 52.5 });
    // b ends behind a, the 36 count all the same
    expect(pointsStats("splitscore", [[first]], "b")).toEqual({ games: 1, highScore: 36, average: 36 });
  });

  it("Cricket: marks beyond the third score; the last leg of a match counts", () => {
    // a: T20 closes 20, T20 scores 60, S20 scores 20 → 80; b has nothing
    const scored = leg("cricket", [visit("a", [T(20), T(20), S(20)]), visit("b", MISS)]);
    const nothing = leg("cricket", [visit("a", MISS)]);
    expect(pointsStats("cricket", [[nothing, scored], [nothing]], "a")).toEqual({ games: 2, highScore: 80, average: 40 });
    expect(pointsStats("cricket", [[scored]], "b")).toEqual({ games: 1, highScore: 0, average: 0 });
  });

  it("no match, no figures", () => {
    expect(pointsStats("cricket", [], "a")).toBeNull();
    expect(pointsStats("cricket", [[]], "a")).toBeNull();
    // a player missing from a leg's seats has no points there
    expect(pointsStats("cricket", [[leg("cricket", [])]], "z")).toEqual({ games: 1, highScore: 0, average: 0 });
    expect(pointsStats("splitscore", [[leg("splitscore", [])]], "z")).toEqual({ games: 1, highScore: 0, average: 0 });
  });
});
