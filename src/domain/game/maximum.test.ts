import { describe, expect, it } from "vitest";
import { applyMatchDart, newMatch, undoMatchDart, type MatchState } from "./match";
import { completesMaximum, isMaximum } from "./maximum";
import type { Dart } from "./types";

const [A, B] = ["a", "b"];
const S = (field: number): Dart => ({ field, type: "single" });
const T = (field: number): Dart => ({ field, type: "triple" });
const MAX = [T(20), T(20), T(20)];
const match = (start = 501) =>
  newMatch([A, B], { startScore: start, inRule: "single", outRule: "double" }, { legsToWinSet: 1, setsToWinMatch: 1 });
const play = (m: MatchState, ...darts: Dart[]): MatchState =>
  darts.reduce((s, d) => {
    const r = applyMatchDart(s, d);
    if (!r.ok) throw new Error(r.reason);
    return r.value;
  }, m);
const undo = (m: MatchState): MatchState => {
  const r = undoMatchDart(m);
  if (!r.ok) throw new Error(r.reason);
  return r.value;
};

describe("180 sound cue (M11)", () => {
  it("isMaximum: three T20 that counted", () => {
    expect(isMaximum({ playerId: A, darts: MAX, isBust: false })).toBe(true);
    expect(isMaximum({ playerId: A, darts: MAX, isBust: true })).toBe(false);
    expect(isMaximum({ playerId: A, darts: [T(20), T(20)], isBust: false })).toBe(false);
    expect(isMaximum({ playerId: A, darts: [T(20), T(20), T(19)], isBust: false })).toBe(false);
  });

  it("fires on the third T20, not before", () => {
    const two = play(match(), T(20), T(20));
    expect(completesMaximum(match(), two)).toBe(false);
    expect(completesMaximum(two, play(two, T(20)))).toBe(true);
  });

  it("fires when the whole visit arrives at once (another device, X key, reload of a queue)", () => {
    expect(completesMaximum(match(), play(match(), ...MAX))).toBe(true);
  });

  it("stays silent for an undo that uncovers an older 180 and for an unchanged state", () => {
    const after = play(match(), ...MAX, S(1));
    const back = undo(after);
    expect(completesMaximum(after, back)).toBe(false);
    expect(completesMaximum(back, back)).toBe(false);
  });

  it("stays silent when the next player throws after a 180", () => {
    const max = play(match(), ...MAX);
    expect(completesMaximum(max, play(max, S(1)))).toBe(false);
  });

  it("a bust of three T20 is no 180", () => {
    const low = play(match(101), S(1), S(1), S(1), S(1), S(1), S(1)); // A 98, B 98
    expect(completesMaximum(low, play(low, ...MAX))).toBe(false);
  });
});
