import { describe, expect, it } from "vitest";
import { applyMatchDart, newMatch, type Dart, type MatchState, type ModeId, type OutRule } from "@/domain/game";
import { factsOf } from "./detect";

const [A, B] = ["a", "b"];
const S = (field: number): Dart => ({ field, type: "single" });
const D = (field: number): Dart => ({ field, type: "double" });
const T = (field: number): Dart => ({ field, type: "triple" });
const MISS = [S(0), S(0), S(0)];

const ONE_LEG = { legsToWinSet: 1, setsToWinMatch: 1 };
/** The darts thrown one by one into `start`. */
function darts(start: MatchState, ...thrown: Dart[]): MatchState {
  return thrown.reduce((m, d) => {
    const r = applyMatchDart(m, d);
    if (!r.ok) throw new Error(`applyMatchDart failed: ${r.reason}`);
    return r.value;
  }, start);
}
function game(mode: ModeId, startScore: number, outRule: OutRule, players: string[], ...thrown: Dart[]): MatchState {
  return darts(newMatch(players, { startScore, inRule: "single", outRule }, ONE_LEG, 0, mode), ...thrown);
}
const facts = (mode: ModeId, state: MatchState, player: string, placements: Record<string, number | null> = { [A]: 1, [B]: 2 }) =>
  [...factsOf({ mode, state, placements }, player)].sort();

describe("achievement detection (m10-plan §1)", () => {
  it("x01: a nine-darter at 501 double out brings 180, nine-darter and the double it finished on", () => {
    const m = game("x01", 501, "double", [A, B], ...[T(20), T(20), T(20)], ...MISS, ...[T(20), T(20), T(20)], ...MISS, T(20), T(19), D(12));
    expect(facts("x01", m, A)).toEqual(["180", "double-12", "nine-darter"]);
    expect(facts("x01", m, B)).toEqual([]);
  });

  it("x01: nine darts with single out is no nine-darter and no double finish", () => {
    const m = game("x01", 501, "single", [A, B], ...[T(20), T(20), T(20)], ...MISS, ...[T(20), T(20), T(20)], ...MISS, T(20), T(19), D(12));
    expect(facts("x01", m, A)).toEqual(["180"]);
  });

  it("x01: gone fishing is a 170 checkout; 170 thrown into a bust is not", () => {
    const fish = game("x01", 350, "double", [A, B], T(20), T(20), T(20), ...MISS, T(20), T(20), D(25));
    expect(facts("x01", fish, A)).toEqual(["180", "double-25", "gone-fishing"]);
    const bust = game("x01", 341, "double", [A, B], T(20), T(20), T(20), ...MISS, T(20), T(20), D(25));
    expect(facts("x01", bust, A)).toEqual(["180"]);
  });

  it("x01: shanghai is single, double and triple of one field in the checkout", () => {
    const m = game("x01", 300, "double", [A, B], T(20), T(20), T(20), ...MISS, S(20), T(20), D(20));
    expect(facts("x01", m, A)).toEqual(["180", "double-20", "shanghai"]);
  });

  it("elimination: first blood for the first who sends someone to 0; gone fishing is 170 onto the target", () => {
    // A 20, B lands on 20: A back to 0
    const blood = game("elimination", 301, "single", [A, B], S(20), S(0), S(0), S(20), S(0), S(0));
    expect(facts("elimination", blood, B)).toEqual(["first-blood"]);
    expect(facts("elimination", blood, A)).toEqual([]);
    const fish = game("elimination", 301, "single", [A, B], T(20), T(20), S(11), ...MISS, T(20), T(20), D(25));
    expect(facts("elimination", fish, A)).toEqual(["gone-fishing"]);
  });

  it("splitscore: one point at the end, never halved, and the good horse at exactly 175", () => {
    const one = game("splitscore", 40, "single", [A], ...Array.from({ length: 9 }, () => MISS).flat());
    expect(facts("splitscore", one, A, { [A]: 1 })).toEqual(["split-one"]);
    // one hit each round: 15 16 D1 17 18 T1 19 20 Bull = 135, 40 + 135 = 175
    const horse = game(
      "splitscore",
      40,
      "single",
      [A],
      ...[S(15), S(16), D(1), S(17), S(18), T(1), S(19), S(20), S(25)].flatMap((d) => [d, S(0), S(0)]),
    );
    expect(facts("splitscore", horse, A, { [A]: 1 })).toEqual(["bearly-never-halved", "never-halved"]);
    const halvedOnce = game(
      "splitscore",
      40,
      "single",
      [A],
      ...MISS,
      ...[S(16), D(1), S(17), S(18), T(1), S(19), S(20), S(25)].flatMap((d) => [d, S(0), S(0)]),
    );
    expect(facts("splitscore", halvedOnce, A, { [A]: 1 })).toEqual([]);
  });

  it("cricket: done but not finished, all fields closed at 0 points and still won", () => {
    const m = game(
      "cricket",
      0,
      "single",
      [A, B],
      ...[T(15), T(16), T(17)],
      ...[T(20), T(20), S(0)], // B closes 20 and has 60
      ...[T(18), T(19), T(20)],
      ...MISS,
      ...[D(25), S(25), S(0)], // A: everything closed, still 0 points
      ...MISS,
      ...[T(15), T(15)], // 90 > 60: A wins
    );
    expect(facts("cricket", m, A)).toEqual(["almostDone"]);
    expect(facts("cricket", m, A, { [A]: 2, [B]: 1 })).toEqual([]); // not without the win
  });

  it("JJ Nine: T1 T1 T1 thrown and counted in X01, Elimination and SplitScore", () => {
    const T1 = [T(1), T(1), T(1)];
    expect(facts("x01", game("x01", 301, "double", [A, B], ...T1), A)).toEqual(["jj-nine"]);
    expect(facts("elimination", game("elimination", 301, "single", [A, B], ...T1), A)).toEqual(["jj-nine"]);
    // SplitScore: only in the triple round (the sixth), T1 hits it
    const split = game("splitscore", 40, "single", [A], ...Array.from({ length: 5 }, () => MISS).flat(), ...T1);
    expect(facts("splitscore", split, A, { [A]: null })).toEqual(["jj-nine"]);
    expect(facts("x01", game("x01", 301, "double", [A, B], T(1), T(1), S(1)), A)).toEqual([]);
  });

  it("JJ Nine: not when the visit busts or a dart does not count, and never in Cricket", () => {
    // X01 rest 8: T1 T1 leave 2, the third T1 busts
    expect(facts("x01", game("x01", 8, "single", [A, B], T(1), T(1), T(1)), A)).toEqual([]);
    // X01 double in: the first T1 is no double, the visit busts
    const doubleIn = darts(newMatch([A, B], { startScore: 301, inRule: "double", outRule: "double" }, ONE_LEG, 0, "x01"), T(1), T(1), T(1));
    expect(facts("x01", doubleIn, A)).toEqual([]);
    // Elimination target 8: the third T1 overshoots and is stored overthrown
    expect(facts("elimination", game("elimination", 8, "single", [A, B], T(1), T(1), T(1)), A)).toEqual([]);
    // SplitScore round 15: T1 is off the target and stored overthrown
    expect(facts("splitscore", game("splitscore", 40, "single", [A], T(1), T(1), T(1)), A, { [A]: null })).toEqual([]);
    expect(facts("cricket", game("cricket", 0, "single", [A, B], T(1), T(1), T(1)), A, { [A]: null, [B]: null })).toEqual([]);
  });

  it("a 180 counts in every mode", () => {
    const m = game("cricket", 0, "single", [A, B], T(20), T(20), T(20));
    expect(facts("cricket", m, A, { [A]: null, [B]: null })).toEqual(["180"]);
  });
});
