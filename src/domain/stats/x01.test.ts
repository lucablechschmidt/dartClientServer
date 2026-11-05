import { describe, expect, it } from "vitest";
import { newLeg, type Dart, type LegState } from "@/domain/game";
import { x01 } from "@/domain/x01";
import { x01Stats } from "./x01";

const [A, B] = ["a", "b"];
const S = (field: number): Dart => ({ field, type: "single" });
const D = (field: number): Dart => ({ field, type: "double" });
const T = (field: number): Dart => ({ field, type: "triple" });
const MISS = [S(0), S(0), S(0)];
const play = (state: LegState, ...darts: Dart[]): LegState =>
  darts.reduce((s, d) => {
    const r = x01.applyDart(s, d);
    if (!r.ok) throw new Error(`applyDart failed: ${r.reason}`);
    return r.value;
  }, state);
const leg = (startScore: number, outRule: "single" | "double" = "double") => newLeg([A, B], { startScore, inRule: "single", outRule });

describe("x01Stats (M8 §1)", () => {
  // 441 double out: A 180 (261), 100 (161), bust (T20 T20 then T20: 41 - 60), 161 checkout T20 T17 D25; B misses
  const handLeg = play(
    leg(441),
    T(20),
    T(20),
    T(20),
    ...MISS,
    T(20),
    S(20),
    S(20),
    ...MISS,
    T(20),
    T(20),
    T(20),
    ...MISS,
    T(20),
    T(17),
    D(25),
  );

  it("the hand-counted leg: a bust counts 0 and as a visit", () => {
    const s = x01Stats([handLeg], A);
    expect(s.visits).toBe(4);
    expect(s.average).toBeCloseTo((180 + 100 + 0 + 161) / 4);
    expect(s.first9).toBeCloseTo((180 + 100 + 0) / 3);
    expect([s.count180, s.count140, s.count100]).toEqual([1, 1, 1]); // 180; 161; 100
    expect(s.highestFinish).toBe(161);
    expect(s.highestScore).toBe(180);
    expect(s.bestLeg).toEqual({ 441: 12 });
    expect(s.legsWon).toBe(1);
  });

  it("the loser: no finish, no best leg, misses count in the average", () => {
    const s = x01Stats([handLeg], B);
    expect(s).toMatchObject({ visits: 3, average: 0, highestFinish: null, highestScore: 0, bestLeg: {}, legsWon: 0 });
  });

  it("best leg per start score, the fewest darts", () => {
    const six = play(leg(301, "single"), T(20), T(20), T(20), ...MISS, T(20), T(20), S(1));
    const nine = play(leg(301, "single"), T(20), T(20), T(20), ...MISS, ...MISS, ...MISS, T(20), T(20), S(1));
    const three = play(leg(101, "single"), T(20), T(7), S(20));
    expect(x01Stats([nine, six, three], A).bestLeg).toEqual({ 301: 6, 101: 3 });
  });

  it("over several legs the average is points ÷ visits of all legs; no legs, all zero", () => {
    const three = play(leg(101, "single"), T(20), T(7), S(20)); // one visit of 101
    const s = x01Stats([handLeg, three], A);
    expect(s.visits).toBe(5);
    expect(s.average).toBeCloseTo((441 + 101) / 5);
    expect(x01Stats([], A)).toMatchObject({ visits: 0, average: 0, first9: 0, highestFinish: null, highestScore: null });
  });

  it("an open visit (a match ended by a declared winner) does not count", () => {
    const open = play(leg(301), T(20), T(20)); // two darts, still open
    expect(x01Stats([open], A).visits).toBe(0);
  });
});
