import { describe, expect, it } from "vitest";
import { newLeg } from "../game/state";
import type { Dart, LegState } from "../game/types";
import { splitscore } from "./mode";
import { rounds, TARGETS } from "./rounds";

const [A, B, C] = ["a", "b", "c"];
const S = (field: number): Dart => ({ field, type: "single" });
const D = (field: number): Dart => ({ field, type: "double" });
const T = (field: number): Dart => ({ field, type: "triple" });
const OVER: Dart = { field: 0, type: "overthrown" };
const MISS = [S(0), S(0), S(0)];
const leg = (players = [A, B], start = 40) => newLeg(players, { startScore: start, inRule: "single", outRule: "single" }, 0, "splitscore");
const play = (state: LegState, ...darts: Dart[]): LegState =>
  darts.reduce((s, d) => {
    const r = splitscore.applyDart(s, d);
    if (!r.ok) throw new Error(`applyDart failed: ${r.reason}`);
    return r.value;
  }, state);
const undo = (state: LegState, times = 1): LegState => {
  for (let i = 0; i < times; i++) {
    const r = splitscore.undoDart(state);
    if (!r.ok) throw new Error(r.reason);
    state = r.value;
  }
  return state;
};
const points = (s: LegState) => rounds(s).points;
const target = (s: LegState) => splitscore.board(s, {}).hint;

describe("splitscore (M7, legacy §6)", () => {
  it("everybody starts with 40; targets 15, 16, double, 17, 18, triple, 19, 20, bull", () => {
    expect(points(leg())).toEqual({ [A]: 40, [B]: 40 });
    expect(TARGETS).toEqual(["15", "16", "double", "17", "18", "triple", "19", "20", "bull"]);
  });

  it("target 15: S15, T15, 0 → +60", () => {
    expect(points(play(leg(), S(15), T(15), S(0)))[A]).toBe(100);
  });

  it("a dart off the target is stored as overthrown, like a miss (legacy, never counts in statistics)", () => {
    const s = play(leg(), S(15), T(20), S(0));
    expect(s.visits[0]).toEqual({ playerId: A, darts: [S(15), OVER, OVER], isBust: false });
    expect(points(s)[A]).toBe(55);
  });

  it("no hit halves the score: 40 → 20, 41 → 21 (rounded up)", () => {
    expect(points(play(leg(), ...MISS))[A]).toBe(20);
    expect(points(play(leg([A, B], 41), ...MISS))[A]).toBe(21);
  });

  it("the score changes only when the visit is complete", () => {
    expect(points(play(leg(), S(15), S(15)))[A]).toBe(40);
  });

  it("target double: D5 hits (+10); target triple: bull does not hit", () => {
    let s = play(leg(), ...MISS, ...MISS); // round 15
    s = play(s, ...MISS, ...MISS); // round 16: A 10, B 10
    s = play(s, D(5), S(0), S(0)); // double: +10
    expect(points(s)[A]).toBe(20);
    s = play(s, ...MISS, ...MISS, ...MISS, ...MISS, ...MISS); // B double, A/B 17, A/B 18
    expect(target(s)).toEqual({ kind: "target", target: "triple" });
    const before = points(s)[A];
    s = play(s, D(25), S(25), S(0));
    expect(points(s)[A]).toBe(Math.ceil(before / 2));
  });

  it("the target moves on after the last player of the round", () => {
    let s = play(leg([A, B, C]), ...MISS, ...MISS);
    expect(target(s)).toEqual({ kind: "target", target: "15" });
    s = play(s, ...MISS);
    expect(target(s)).toEqual({ kind: "target", target: "16" });
    expect(splitscore.currentPlayer(s)).toBe(A);
  });

  it("undo across the round change: target back, score recomputed", () => {
    const s = undo(play(leg(), ...MISS, S(15), S(15), S(15), S(16)), 2);
    expect(target(s)).toEqual({ kind: "target", target: "15" });
    expect(splitscore.currentPlayer(s)).toBe(B);
    expect(points(s)).toEqual({ [A]: 20, [B]: 40 });
  });

  it("ends after bull; places by points, equal points share a place", () => {
    let s = leg([A, B, C]);
    for (let round = 0; round < 8; round++) s = play(s, ...MISS, ...MISS, ...MISS);
    expect(splitscore.isLegFinished(s)).toBe(false);
    s = play(s, S(25), S(0), S(0), ...MISS, S(25), S(0), S(0)); // bull: A and C hit
    expect(splitscore.isLegFinished(s)).toBe(true);
    expect(splitscore.standings(s)).toEqual([[A, C], [B]]);
    expect(splitscore.applyDart(s, S(1))).toEqual({ ok: false, reason: "leg-finished" });
  });

  it("board: points as score, overthrown slots, target as hint", () => {
    const v = splitscore.board(play(leg(), S(15), S(14)), { a: "Casey" });
    expect(v.mode).toBe("splitscore");
    expect(v.players[0].slots.map((x) => [x.label, x.isOverthrown])).toEqual([["15", false], ["✕", true], [null, false]]);
    expect(v.players[0].score).toBe(40);
    expect(v.dartsLeft).toBe(1);
  });

  it("replay equals the sequence of applyDart (random darts)", () => {
    let seed = 9;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed % n;
    };
    let s = leg([A, B, C]);
    const thrown: Dart[] = [];
    while (!splitscore.isLegFinished(s)) {
      const field = rand(4) === 0 ? 25 : 13 + rand(8);
      const dart = field === 25 ? [S, D][rand(2)](25) : [S, D, T][rand(3)](field);
      thrown.push(dart);
      s = play(s, dart);
    }
    expect(play(leg([A, B, C]), ...thrown)).toEqual(s);
    expect(s.visits).toHaveLength(27);
  });
});
