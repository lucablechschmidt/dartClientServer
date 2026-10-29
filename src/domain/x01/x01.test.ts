import { describe, expect, it } from "vitest";
import { checkoutHint } from "../checkouts";
import { applyDart, undoDart } from "./apply";
import { newLeg } from "./state";
import { currentPlayer, dartsThrown, openVisit, scoreOf, threeDartAverage, winnerOf } from "./selectors";
import { dartScore, visitScore } from "./scoring";
import { isValidDart } from "./rules";
import { replay } from "./replay";
import type { Dart, LegState, Rules } from "./types";

const A = "a";
const B = "b";
const C = "c";

const rules = (over: Partial<Rules> = {}): Rules => ({
  startScore: 501,
  inRule: "single",
  outRule: "double",
  ...over,
});

const S = (field: number): Dart => ({ field, type: "single" });
const D = (field: number): Dart => ({ field, type: "double" });
const T = (field: number): Dart => ({ field, type: "triple" });

/** Throws a sequence of valid darts; throws on an error so tests do not silently carry on. */
const play = (state: LegState, ...darts: Dart[]): LegState =>
  darts.reduce((s, d) => {
    const r = applyDart(s, d);
    if (!r.ok) throw new Error(`applyDart failed: ${r.reason}`);
    return r.value;
  }, state);

/** Brings A to a rest and leaves A on turn with a fresh visit; B throws only zeros. */
const legAtRest = (rest: number, r: Rules = rules()): LegState => {
  let s = newLeg([A, B], r);
  let remaining = r.startScore - rest;
  while (remaining > 0) {
    const d = remaining >= 60 ? T(20) : remaining >= 20 ? S(20) : S(remaining);
    s = play(s, d);
    remaining -= dartScore(d);
    if (currentPlayer(s) === B) s = play(s, S(0), S(0), S(0));
  }
  while (openVisit(s)) s = play(s, S(0));
  if (currentPlayer(s) === B) s = play(s, S(0), S(0), S(0));
  expect(currentPlayer(s)).toBe(A);
  expect(scoreOf(s, A)).toBe(rest);
  return s;
};

describe("scoring", () => {
  it("scores single, double, triple, bull and misses", () => {
    expect(dartScore(S(20))).toBe(20);
    expect(dartScore(D(20))).toBe(40);
    expect(dartScore(T(19))).toBe(57);
    expect(dartScore(S(25))).toBe(25);
    expect(dartScore(D(25))).toBe(50);
    expect(dartScore(S(0))).toBe(0);
    expect(dartScore({ field: 20, type: "overthrown" })).toBe(0);
  });
  it("a bust visit scores 0 regardless of its darts", () => {
    expect(visitScore({ playerId: A, darts: [S(20), S(20), { field: 0, type: "overthrown" }], isBust: true })).toBe(0);
    expect(visitScore({ playerId: A, darts: [T(20), T(20), T(20)], isBust: false })).toBe(180);
  });
});

describe("isValidDart (rules)", () => {
  it("rejects malformed darts", () => {
    expect(isValidDart(501, rules(), { field: 21, type: "single" })).toBe(false);
    expect(isValidDart(501, rules(), { field: 25, type: "triple" })).toBe(false);
    expect(isValidDart(501, rules(), { field: 0, type: "double" })).toBe(false);
  });
  it("double-in: needs a double while still on the start score, a miss is not a bust", () => {
    const r = rules({ inRule: "double" });
    expect(isValidDart(501, r, S(20))).toBe(false);
    expect(isValidDart(501, r, D(20))).toBe(true);
    expect(isValidDart(501, r, S(0))).toBe(true);
    expect(isValidDart(461, r, S(20))).toBe(true);
  });
  it("double-out: the finishing dart must be a double, rest 1 is a bust", () => {
    const r = rules();
    expect(isValidDart(40, r, S(20))).toBe(true);
    expect(isValidDart(40, r, D(20))).toBe(true);
    expect(isValidDart(20, r, S(20))).toBe(false);
    expect(isValidDart(3, r, S(2))).toBe(false);
    expect(isValidDart(3, r, S(1))).toBe(true);
  });
  it("single-out allows rest 1 and any finishing dart", () => {
    const r = rules({ outRule: "single" });
    expect(isValidDart(3, r, S(2))).toBe(true);
    expect(isValidDart(20, r, S(20))).toBe(true);
    expect(isValidDart(20, r, S(25))).toBe(false);
  });
  it("triple-out: finishing dart must be a triple, rest below 3 is a bust", () => {
    const r = rules({ outRule: "triple" });
    expect(isValidDart(60, r, T(20))).toBe(true);
    expect(isValidDart(60, r, D(20))).toBe(true);
    expect(isValidDart(40, r, D(20))).toBe(false);
    expect(isValidDart(5, r, S(3))).toBe(false);
  });
});

describe("applyDart", () => {
  it("180 in one visit, then the other player is up", () => {
    const s = play(newLeg([A, B], rules()), T(20), T(20), T(20));
    expect(scoreOf(s, A)).toBe(321);
    expect(currentPlayer(s)).toBe(B);
    expect(s.visits).toHaveLength(1);
    expect(visitScore(s.visits[0])).toBe(180);
  });
  it("three players rotate A → B → C → A", () => {
    let s = newLeg([A, B, C], rules());
    expect(currentPlayer(s)).toBe(A);
    s = play(s, S(1), S(1), S(1));
    expect(currentPlayer(s)).toBe(B);
    s = play(s, S(1), S(1), S(1));
    expect(currentPlayer(s)).toBe(C);
    s = play(s, S(1), S(1), S(1));
    expect(currentPlayer(s)).toBe(A);
  });
  it("a miss counts as a dart and leaves the score", () => {
    const s = play(newLeg([A, B], rules()), S(0));
    expect(dartsThrown(s, A)).toBe(1);
    expect(scoreOf(s, A)).toBe(501);
    expect(currentPlayer(s)).toBe(A);
  });
  it("double-in: a single before being in busts the visit", () => {
    const s = play(newLeg([A, B], rules({ inRule: "double" })), S(20));
    expect(s.visits[0].isBust).toBe(true);
    expect(scoreOf(s, A)).toBe(501);
    expect(currentPlayer(s)).toBe(B);
  });
  it("double-in: a double gets the player in", () => {
    const s = play(newLeg([A, B], rules({ inRule: "double" })), D(20));
    expect(scoreOf(s, A)).toBe(461);
  });
  it("double-out: rest 40, single 20 is fine", () => {
    const s = play(legAtRest(40), S(20));
    expect(scoreOf(s, A)).toBe(20);
    expect(winnerOf(s)).toBeNull();
  });
  it("double-out: rest 40, D20 wins without a player switch", () => {
    const s = play(legAtRest(40), D(20));
    expect(scoreOf(s, A)).toBe(0);
    expect(winnerOf(s)).toBe(A);
    expect(s.visits.at(-1)?.darts).toHaveLength(1);
    expect(currentPlayer(s)).toBe(A);
  });
  it("double-out: rest 20, single 20 is a bust (rest 0 without a double)", () => {
    const s = play(legAtRest(20), S(20));
    expect(s.visits.at(-1)?.isBust).toBe(true);
    expect(scoreOf(s, A)).toBe(20);
    expect(currentPlayer(s)).toBe(B);
  });
  it("double-out: rest 3, single 2 is a bust (rest 1)", () => {
    const s = play(legAtRest(3), S(2));
    expect(s.visits.at(-1)?.isBust).toBe(true);
    expect(scoreOf(s, A)).toBe(3);
  });
  it("single-out: rest 3, single 2 leaves 1", () => {
    const s = play(legAtRest(3, rules({ outRule: "single" })), S(2));
    expect(scoreOf(s, A)).toBe(1);
  });
  it("triple-out: rest 60, T20 wins", () => {
    const s = play(legAtRest(60, rules({ outRule: "triple" })), T(20));
    expect(winnerOf(s)).toBe(A);
  });
  it("bust after two darts keeps them, fills with overthrown and restores the score", () => {
    const s = play(legAtRest(50), S(20), S(20), S(20));
    const v = s.visits.at(-1)!;
    expect(v.isBust).toBe(true);
    expect(v.darts.map((d) => d.type)).toEqual(["single", "single", "overthrown"]);
    expect(scoreOf(s, A)).toBe(50);
    expect(currentPlayer(s)).toBe(B);
  });
  it("double bull finishes 50", () => {
    const s = play(legAtRest(50), D(25));
    expect(winnerOf(s)).toBe(A);
  });
  it("refuses darts after the leg is won", () => {
    const s = play(legAtRest(40), D(20));
    const r = applyDart(s, S(1));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("leg-finished");
  });
  it("refuses malformed darts without changing state", () => {
    const s = newLeg([A, B], rules());
    const r = applyDart(s, { field: 25, type: "triple" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("invalid-dart");
  });
});

describe("undoDart", () => {
  const undo = (s: LegState): LegState => {
    const r = undoDart(s);
    if (!r.ok) throw new Error(r.reason);
    return r.value;
  };
  it("does nothing on an empty leg", () => {
    const r = undoDart(newLeg([A, B], rules()));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("nothing-to-undo");
  });
  it("removes the last dart of the open visit", () => {
    const s = undo(play(newLeg([A, B], rules()), S(20), S(5)));
    expect(scoreOf(s, A)).toBe(481);
    expect(dartsThrown(s, A)).toBe(1);
    expect(currentPlayer(s)).toBe(A);
  });
  it("removes an empty visit entirely", () => {
    const s = undo(play(newLeg([A, B], rules()), S(20)));
    expect(s.visits).toHaveLength(0);
    expect(currentPlayer(s)).toBe(A);
  });
  it("crosses the player switch: previous player's visit reopens", () => {
    let s = play(newLeg([A, B], rules()), T(20), T(20), T(20));
    expect(currentPlayer(s)).toBe(B);
    s = undo(s);
    expect(currentPlayer(s)).toBe(A);
    expect(scoreOf(s, A)).toBe(381);
    expect(dartsThrown(s, A)).toBe(2);
  });
  it("after a bust removes all overthrown slots at once and restores the real darts", () => {
    let s = play(legAtRest(50), S(20), S(20), S(20)); // bust on the third
    s = undo(s);
    const v = s.visits.at(-1)!;
    expect(v.isBust).toBe(false);
    expect(v.darts).toHaveLength(2);
    expect(scoreOf(s, A)).toBe(10);
    expect(currentPlayer(s)).toBe(A);
  });
  it("after a bust on the first dart the visit disappears and the player is up again", () => {
    let s = play(newLeg([A, B], rules({ inRule: "double" })), S(20));
    s = undo(s);
    expect(s.visits).toHaveLength(0);
    expect(currentPlayer(s)).toBe(A);
  });
  it("undoes a win: winner gone, score restored, same player at the oche", () => {
    let s = play(legAtRest(40), D(20));
    s = undo(s);
    expect(winnerOf(s)).toBeNull();
    expect(scoreOf(s, A)).toBe(40);
    expect(currentPlayer(s)).toBe(A);
  });
});

describe("selectors", () => {
  it("three-dart average: non-bust points over closed visits, open visit excluded", () => {
    let s = play(newLeg([A, B], rules()), S(20), S(20), S(20)); // 60
    s = play(s, S(0), S(0), S(0)); // B
    s = play(s, T(20), T(20), T(20)); // 180 → A: 240/2
    expect(threeDartAverage(s, A)).toBe(120);
    s = play(s, S(0), S(0), S(0)); // B
    s = play(s, S(20)); // open
    expect(threeDartAverage(s, A)).toBe(120);
    expect(dartsThrown(s, A)).toBe(7);
  });
  it("bust visits count in the denominator but not the numerator", () => {
    const s = play(legAtRest(50), S(20), S(20), S(20)); // bust
    const own = s.visits.filter((v) => v.playerId === A);
    const points = own.reduce((sum, v) => sum + visitScore(v), 0);
    expect(own.at(-1)?.isBust).toBe(true);
    expect(threeDartAverage(s, A)).toBe(points / own.length);
    expect(threeDartAverage(s, A)).toBeLessThan(
      own.slice(0, -1).reduce((sum, v) => sum + visitScore(v), 0) / (own.length - 1),
    );
  });
  it("zero average before any closed visit", () => {
    expect(threeDartAverage(newLeg([A, B], rules()), A)).toBe(0);
  });
});

describe("replay", () => {
  it("rebuilding from the visit list gives the same state", () => {
    let s = newLeg([A, B, C], rules({ inRule: "double" }));
    const darts: Dart[] = [S(20), D(20), T(20), S(0), D(25), T(19), S(5), S(5), S(5), D(20), S(1), S(1)];
    for (const d of darts) {
      const r = applyDart(s, d);
      if (r.ok) s = r.value;
    }
    const rebuilt = replay(s.players, s.rules, s.visits, s.starter);
    expect(rebuilt).toEqual(s);
    for (const p of [A, B, C]) expect(scoreOf(rebuilt, p)).toBe(scoreOf(s, p));
  });
});

describe("checkoutHint", () => {
  it("knows 170 with three darts but not with two", () => {
    expect(checkoutHint(170, 3)).toBe("T20, T20, Bullseye");
    expect(checkoutHint(170, 2)).toBeNull();
    expect(checkoutHint(40, 1)).toBe("D20");
    expect(checkoutHint(1, 3)).toBeNull();
    expect(checkoutHint(32, 0)).toBeNull();
  });
});
