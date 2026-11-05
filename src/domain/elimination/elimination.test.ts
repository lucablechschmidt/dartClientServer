import { describe, expect, it } from "vitest";
import { newLeg } from "../game/state";
import type { Dart, LegState, OutRule } from "../game/types";
import { elimination } from "./mode";
import { reachable, scores } from "./scores";

const [A, B, C] = ["a", "b", "c"];
const S = (field: number): Dart => ({ field, type: "single" });
const D = (field: number): Dart => ({ field, type: "double" });
const T = (field: number): Dart => ({ field, type: "triple" });
const MISS = [S(0), S(0), S(0)];
const OVER: Dart = { field: 0, type: "overthrown" };
const leg = (target = 301, outRule: OutRule = "double", players = [A, B]) =>
  newLeg(players, { startScore: target, inRule: "single", outRule }, 0, "elimination");
const play = (state: LegState, ...darts: Dart[]): LegState =>
  darts.reduce((s, d) => {
    const r = elimination.applyDart(s, d);
    if (!r.ok) throw new Error(`applyDart failed: ${r.reason}`);
    return r.value;
  }, state);
const undo = (state: LegState, times = 1): LegState => {
  for (let i = 0; i < times; i++) {
    const r = elimination.undoDart(state);
    if (!r.ok) throw new Error(r.reason);
    state = r.value;
  }
  return state;
};

describe("elimination (M7, legacy §5)", () => {
  it("counts up from 0; 180 like in X01", () => {
    const s = play(leg(), T(20), T(20), T(20));
    expect(scores(s).points[A]).toBe(180);
    expect(elimination.currentPlayer(s)).toBe(B);
  });

  it("a dart past the target: only this dart is overthrown, the earlier ones count, next player", () => {
    const s = play(leg(40), S(20), S(19), S(5)); // 39, then 44 > 40
    expect(scores(s).points[A]).toBe(39);
    expect(s.visits[0]).toEqual({ playerId: A, darts: [S(20), S(19), OVER], isBust: true });
    expect(elimination.currentPlayer(s)).toBe(B);
  });

  it("reaching the target with the wrong out rule busts the same way", () => {
    const s = play(leg(40, "double"), S(20), S(20));
    expect(scores(s).points[A]).toBe(20);
    expect(s.visits[0].isBust).toBe(true);
    expect(elimination.currentPlayer(s)).toBe(B);
  });

  it("reaching the target exactly with a double under double out wins", () => {
    const s = play(leg(40, "double"), D(20));
    expect(elimination.isLegFinished(s)).toBe(true);
    expect(elimination.standings(s)[0]).toEqual([A]);
    expect(elimination.applyDart(s, S(1))).toEqual({ ok: false, reason: "leg-finished" });
  });

  it("single out: any dart may finish", () => {
    expect(elimination.isLegFinished(play(leg(40, "single"), D(20)))).toBe(true);
    expect(elimination.isLegFinished(play(leg(40, "single"), S(20), S(20)))).toBe(true);
  });

  it("landing exactly on another player's score sends him back to 0; undo brings him back", () => {
    let s = play(leg(), S(20), S(0), S(0)); // A 20
    s = play(s, S(15), S(5)); // B lands on 20 → A back to 0
    expect(scores(s).points).toEqual({ [A]: 0, [B]: 20 });
    s = undo(s);
    expect(scores(s).points).toEqual({ [A]: 20, [B]: 15 });
  });

  it("everyone on that score goes back to 0 (only possible at 0, where it changes nothing)", () => {
    const s = play(leg(301, "double", [A, B, C]), S(0), S(0), S(0));
    expect(scores(s).points).toEqual({ [A]: 0, [B]: 0, [C]: 0 });
  });

  it("undo of a bust removes the overthrown dart and reopens the visit", () => {
    const s = undo(play(leg(40), S(20), S(19), S(5)));
    expect(s.visits[0]).toEqual({ playerId: A, darts: [S(20), S(19)], isBust: false });
    expect(elimination.currentPlayer(s)).toBe(A);
  });

  it("places: winner, then by points", () => {
    let s = play(leg(40, "double", [A, B, C]), S(10), S(0), S(0)); // A 10
    s = play(s, S(20), S(0), S(0)); // B 20
    s = play(s, ...MISS); // C 0
    s = play(s, S(10), S(0), S(0)); // A 20 → B back to 0
    s = play(s, S(5), S(0), S(0)); // B 5
    s = play(s, D(20)); // C wins
    expect(elimination.standings(s)).toEqual([[C], [A], [B]]);
  });

  it("board: points, the next elimination as hint", () => {
    let s = play(leg(), S(20), S(0), S(0)); // A 20
    s = play(s, S(5)); // B 5, on turn
    const v = elimination.board(s, { a: "Casey", b: "Sam" });
    expect(v.mode).toBe("elimination");
    expect(v.players.map((p) => p.score)).toEqual([20, 5]);
    expect(v.hint).toEqual({ kind: "elimination", points: 15 });
    expect(v.dartsLeft).toBe(2);
  });

  it("replay equals the sequence of applyDart (random darts)", () => {
    let seed = 3;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed % n;
    };
    let s = leg(101, "double", [A, B, C]);
    const thrown: Dart[] = [];
    for (let i = 0; i < 400 && !elimination.isLegFinished(s); i++) {
      const field = rand(21);
      const dart = field === 0 ? S(0) : [S, D, T][rand(3)](field);
      thrown.push(dart);
      s = play(s, dart);
    }
    expect(play(leg(101, "double", [A, B, C]), ...thrown)).toEqual(s);
  });

  it("the board names the next player in seat order", () => {
    const s = leg(301, "double", [A, B, C]);
    const next = (state: LegState) => elimination.board(state, {}).nextPlayerId;
    expect(next(s)).toBe(B);
    expect(next(play(s, ...MISS))).toBe(C);
    expect(next(play(s, ...MISS, ...MISS))).toBe(A);
  });

  it("the hint names only an elimination the darts left can reach; otherwise the gap to the next player above", () => {
    const hint = (state: LegState) => elimination.board(state, {}).hint;
    // A 0, B 31, C 32; A is up
    const s = play(leg(301, "single", [A, B, C]), ...MISS, S(20), S(11), S(0), S(20), S(12), S(0));
    expect(hint(s)).toEqual({ kind: "elimination", points: 31 }); // three darts: 31 is easy
    expect(hint(play(s, S(0), S(0)))).toEqual({ kind: "elimination", points: 32 }); // one dart: 31 no, D16 yes
    // two players: A 0, B 31, one dart left: nothing to eliminate, B is 31 ahead
    const two = play(leg(301, "single"), ...MISS, S(20), S(11), S(0), S(0), S(0));
    expect(hint(two)).toEqual({ kind: "gap", points: 31 });
    expect(hint(leg())).toBeNull(); // nobody ahead
  });

  it("reachable: which points the darts left can score", () => {
    expect([reachable(32, 1), reachable(31, 1), reachable(61, 1), reachable(50, 1)]).toEqual([true, false, false, true]);
    expect([reachable(120, 2), reachable(121, 2), reachable(180, 3), reachable(179, 3), reachable(5, 0)]).toEqual([
      true,
      false,
      true,
      false,
      false,
    ]);
  });
});
