import { describe, expect, it } from "vitest";
import { newLeg } from "../game/state";
import type { Dart, LegState } from "../game/types";
import { cricket } from "./mode";
import { tally } from "./tally";

const [A, B, C] = ["a", "b", "c"];
const rules = { startScore: 0, inRule: "single", outRule: "single" } as const;
const S = (field: number): Dart => ({ field, type: "single" });
const D = (field: number): Dart => ({ field, type: "double" });
const T = (field: number): Dart => ({ field, type: "triple" });
const MISS = [S(0), S(0), S(0)];
const leg = (...players: string[]) => newLeg(players.length ? players : [A, B], rules, 0, "cricket");
const play = (state: LegState, ...darts: Dart[]): LegState =>
  darts.reduce((s, d) => {
    const r = cricket.applyDart(s, d);
    if (!r.ok) throw new Error(`applyDart failed: ${r.reason}`);
    return r.value;
  }, state);
const undo = (state: LegState, times = 1): LegState => {
  for (let i = 0; i < times; i++) {
    const r = cricket.undoDart(state);
    if (!r.ok) throw new Error(r.reason);
    state = r.value;
  }
  return state;
};

describe("cricket (M7, legacy §4)", () => {
  it("T20 as the first dart: 3 marks on 20, no points", () => {
    const t = tally(play(leg(), T(20)));
    expect(t.marks[A][20]).toBe(3);
    expect(t.points[A]).toBe(0);
  });

  it("the fourth mark scores: T20 then S20 = 20 points", () => {
    expect(tally(play(leg(), T(20), S(20))).points[A]).toBe(20);
  });

  it("D20 on 2 marks: one closes, one scores 20", () => {
    expect(tally(play(leg(), S(20), S(20), S(0), ...MISS, D(20))).points[A]).toBe(20);
  });

  it("a field closed by every player scores nothing more, not even with the closing dart", () => {
    let s = play(leg(), T(20), T(20)); // A: 6 marks, 60 points
    s = play(s, S(0), T(20)); // A's third dart; B closes 20 with 3 marks → closed for all
    s = play(s, S(0), S(0)); // B ends the visit
    s = play(s, T(20)); // A again: field closed for all
    expect(tally(s).points[A]).toBe(60);
    expect(tally(s).points[B]).toBe(0);
  });

  it("a dart on 14 counts as a dart, but nothing else", () => {
    const s = play(leg(), S(14));
    expect(tally(s).marks[A]).toEqual({ 15: 0, 16: 0, 17: 0, 18: 0, 19: 0, 20: 0, 25: 0 });
    expect(s.visits[0].darts).toEqual([S(14)]);
    expect(cricket.currentPlayer(s)).toBe(A);
  });

  it("bull: single 1 mark, double 2 marks, surplus scores 25 per mark", () => {
    const t = tally(play(leg(), D(25), D(25)));
    expect(t.marks[A][25]).toBe(4); // counted beyond 3; the panel shows at most 3
    expect(t.points[A]).toBe(25);
  });

  /** A closes all seven fields: 20, 19, 18 | 17, 16, 15 | Bull, Bull (B misses in between). */
  const allClosedByA = (extraForA: Dart[] = []) =>
    play(leg(), T(20), T(19), T(18), ...MISS, T(17), T(16), T(15), ...MISS, D(25), S(25), ...extraForA);

  it("win: every field closed and the most points; checked after each dart", () => {
    const s = allClosedByA([]); // 0:0 → no win yet
    expect(cricket.isLegFinished(s)).toBe(false);
    const won = play(s, S(20)); // third dart: 20 points, all closed
    expect(cricket.isLegFinished(won)).toBe(true);
    expect(cricket.standings(won)[0]).toEqual([A]);
    expect(cricket.applyDart(won, S(1))).toEqual({ ok: false, reason: "leg-finished" });
  });

  it("all closed at 0:0 is no win, not after the dart and not at the player switch", () => {
    const s = allClosedByA([S(0)]); // D25, S25, S0: visit over
    expect(cricket.isLegFinished(s)).toBe(false);
    expect(cricket.currentPlayer(s)).toBe(B);
  });

  it("a player with everything closed but fewer points plays on; leading wins", () => {
    let s = play(leg(), T(20), S(0), S(0)); // A closes 20
    s = play(s, T(16), S(16), S(0)); // B: 16 points (A has not closed 16)
    s = play(s, T(19), T(18), T(17)); // A
    s = play(s, ...MISS);
    s = play(s, T(16), T(15), D(25)); // A closes 16 (now closed for all), 15, bull 2 marks
    s = play(s, ...MISS);
    const behind = play(s, S(25), S(0), S(0)); // A: all closed, 0 vs 16 → goes on
    expect(cricket.isLegFinished(behind)).toBe(false);
    expect(cricket.currentPlayer(behind)).toBe(B);
    const ahead = play(behind, ...MISS, S(20)); // A: 20 vs 16 → wins with this dart
    expect(cricket.isLegFinished(ahead)).toBe(true);
    expect(cricket.standings(ahead)).toEqual([[A], [B]]);
  });

  it("undo of a mark that scored takes back mark and points", () => {
    const s = undo(play(leg(), T(20), S(20)));
    expect(tally(s).points[A]).toBe(0);
    expect(tally(s).marks[A][20]).toBe(3);
  });

  it("undo across the player switch reopens the previous visit", () => {
    const s = undo(play(leg(), ...MISS, S(20)), 2);
    expect(cricket.currentPlayer(s)).toBe(A);
    expect(cricket.isOpenVisit(s, 0)).toBe(true);
    expect(s.visits[0].darts).toHaveLength(2);
  });

  it("3 players: places = winner first, then by points, then by closed fields", () => {
    let s = leg(A, B, C);
    s = play(s, T(20), T(19), T(18)); // A
    s = play(s, T(17), S(0), S(0)); // B: 1 field
    s = play(s, ...MISS); // C: nothing
    s = play(s, T(17), T(16), T(15)); // A
    s = play(s, ...MISS, ...MISS);
    s = play(s, D(25), S(25), S(20)); // A wins with 20
    expect(cricket.standings(s)).toEqual([[A], [B], [C]]);
  });

  it("board: points as score, marks per field (15 to Bull) with closed-by-all, the next player", () => {
    const s = play(leg(), T(20), S(19));
    const v = cricket.board(s, { a: "Casey", b: "Sam" });
    expect(v.mode).toBe("cricket");
    expect(v.players[0].score).toBe(0);
    expect(v.players[0].marks?.find((m) => m.field === 20)).toEqual({ field: 20, marks: 3, closed: false });
    expect(v.hint).toBeNull(); // Figma: no hint line in Cricket
    expect(v.nextPlayerId).toBe(B);
    expect(v.players[0].marks?.map((m) => m.field)).toEqual([15, 16, 17, 18, 19, 20, 25]);
    expect(v.dartsLeft).toBe(1);
    expect(v.players[0].average).toBeNull(); // no average in Cricket
  });

  it("replay of 3 players equals the sequence of applyDart (random darts)", () => {
    let seed = 5;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed % n;
    };
    let s = leg(A, B, C);
    for (let i = 0; i < 300 && !cricket.isLegFinished(s); i++) {
      const field = rand(4) === 0 ? 25 : 12 + rand(9);
      s = play(s, field === 25 ? (rand(2) ? S(25) : D(25)) : [S, D, T][rand(3)](field));
    }
    const again = play(leg(A, B, C), ...s.visits.flatMap((v) => v.darts));
    expect(again).toEqual(s);
  });
});
