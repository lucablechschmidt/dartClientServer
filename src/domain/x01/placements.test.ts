import { describe, expect, it } from "vitest";
import { applyDart, resign, startPlayOut, undoDart } from "./apply";
import { newLeg } from "../game/state";
import { checkoutOrder, currentPlayer, isLegFinished, placements, placementsFixed, scoreOf, winnerOf } from "./selectors";
import type { Dart, LegState, Rules } from "../game/types";

const [A, B, C, D] = ["a", "b", "c", "d"];
/** Short legs: 40 single-out, so D20 or S20 S20 checks out. */
const rules: Rules = { startScore: 40, inRule: "single", outRule: "single" };
const S = (field: number): Dart => ({ field, type: "single" });
const Db = (field: number): Dart => ({ field, type: "double" });
const MISS = [S(0), S(0), S(0)];
const OUT = [Db(20)];

const play = (state: LegState, ...darts: Dart[]): LegState =>
  darts.reduce((s, d) => {
    const r = applyDart(s, d);
    if (!r.ok) throw new Error(`applyDart failed: ${r.reason}`);
    return r.value;
  }, state);
const undo = (state: LegState, times = 1): LegState => {
  for (let i = 0; i < times; i++) {
    const r = undoDart(state);
    if (!r.ok) throw new Error(`undoDart failed: ${r.reason}`);
    state = r.value;
  }
  return state;
};
const ok = <T,>(r: { ok: true; value: T } | { ok: false; reason: string }): T => {
  if (!r.ok) throw new Error(r.reason);
  return r.value;
};

/** 4 players, C checks out first (A and B miss before). */
const cOut = () => play(newLeg([A, B, C, D], rules), ...MISS, ...MISS, ...OUT);

describe("placements with 3+ players", () => {
  it("first checkout gets place 1, the leg goes on with the next player still in", () => {
    const s = cOut();
    expect(checkoutOrder(s)).toEqual([C]);
    expect(winnerOf(s)).toBe(C);
    expect(isLegFinished(s)).toBe(false);
    expect(currentPlayer(s)).toBe(D);
  });

  it("players who are out are skipped", () => {
    const s = play(cOut(), ...MISS, ...MISS, ...MISS); // D, A, B
    expect(currentPlayer(s)).toBe(D);
  });

  it("with all but one out the leg is finished and the last gets the last place without throwing", () => {
    const s = play(cOut(), ...OUT, ...OUT); // D, A
    expect(placementsFixed(s)).toBe(true);
    expect(isLegFinished(s)).toBe(true);
    expect(placements(s)).toEqual([C, D, A, B]);
    expect(applyDart(s, S(1))).toEqual({ ok: false, reason: "leg-finished" });
  });

  it("undo after the first checkout reopens place 1 and gives the turn back", () => {
    const s = undo(cOut());
    expect(checkoutOrder(s)).toEqual([]);
    expect(currentPlayer(s)).toBe(C);
    expect(scoreOf(s, C)).toBe(40);
  });

  it("two players: the first checkout ends the leg (unchanged)", () => {
    const s = play(newLeg([A, B], rules), ...OUT);
    expect(isLegFinished(s)).toBe(true);
    expect(placements(s)).toEqual([A, B]);
  });

  it("one player: the leg ends with the checkout", () => {
    const s = play(newLeg([A], rules), ...MISS, ...OUT);
    expect(isLegFinished(s)).toBe(true);
    expect(placements(s)).toEqual([A]);
  });
});

describe("last player plays out (M5 plan §9.2)", () => {
  /** 3 players: A and B are out, C is last. */
  const fixed = () => play(newLeg([A, B, C], rules), ...OUT, ...OUT);

  it("play out reopens the leg for the last player only; his checkout ends it, place stays", () => {
    let s = ok(startPlayOut(fixed()));
    expect(isLegFinished(s)).toBe(false);
    expect(currentPlayer(s)).toBe(C);
    s = play(s, ...MISS);
    expect(currentPlayer(s)).toBe(C);
    s = play(s, ...OUT);
    expect(isLegFinished(s)).toBe(true);
    expect(placements(s)).toEqual([A, B, C]);
  });

  it("resign ends the leg, keeps his visits, drops an open visit, place stays", () => {
    let s = play(ok(startPlayOut(fixed())), ...MISS, S(5));
    s = ok(resign(s));
    expect(isLegFinished(s)).toBe(true);
    expect(s.visits.at(-1)?.darts).toEqual(MISS);
    expect(placements(s)).toEqual([A, B, C]);
  });

  it("is refused with 2 players, before the places are fixed, twice, or after everyone is out", () => {
    expect(startPlayOut(play(newLeg([A, B], rules), ...OUT)).ok).toBe(false);
    expect(startPlayOut(play(newLeg([A, B, C], rules), ...OUT)).ok).toBe(false);
    const playing = ok(startPlayOut(fixed()));
    expect(startPlayOut(playing).ok).toBe(false);
    expect(startPlayOut(play(playing, ...OUT)).ok).toBe(false);
    expect(resign(fixed()).ok).toBe(false);
  });

  it("undo walks back step by step: last checkout, resign, own visits, the choice, the fixing checkout", () => {
    const start = fixed();
    const playing = ok(startPlayOut(start));
    const thrown = play(playing, ...MISS);
    const resigned = ok(resign(thrown));
    // undo of a resign reopens play-out without touching the visits
    expect(undo(resigned)).toEqual(thrown);
    // undo of the last player's dart
    expect(undo(thrown, 3)).toEqual(playing);
    // with no own visit yet, undo takes back the choice (back to the victory screen)
    expect(undo(playing)).toEqual(start);
    // then the fixing checkout: B's place opens again
    const reopened = undo(start);
    expect(isLegFinished(reopened)).toBe(false);
    expect(checkoutOrder(reopened)).toEqual([A]);
    expect(reopened.playOut).toBe(false);
  });

  it("undo of the last player's checkout reopens play-out", () => {
    const done = play(ok(startPlayOut(fixed())), ...OUT);
    const s = undo(done);
    expect(s.playOut).toBe(true);
    expect(isLegFinished(s)).toBe(false);
    expect(currentPlayer(s)).toBe(C);
  });
});
