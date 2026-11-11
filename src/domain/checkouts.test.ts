import { describe, expect, it } from "vitest";
import { CHECKOUT_RESTS, checkoutHint, checkoutRoute, visitCheckoutHint } from "./checkouts";
import { dartScore } from "./game/scoring";
import type { Dart } from "./game/types";

const S = (field: number): Dart => ({ field, type: "single" });
const D = (field: number): Dart => ({ field, type: "double" });
const T = (field: number): Dart => ({ field, type: "triple" });

/** Every dart that scores: singles, doubles and triples 1–20, Bull and DBull. */
const SCORES = [...Array.from({ length: 20 }, (_, i) => [i + 1, 2 * (i + 1), 3 * (i + 1)]).flat(), 25, 50];
const DOUBLES = [...Array.from({ length: 20 }, (_, i) => 2 * (i + 1)), 50];

/** Fewest darts to finish `rest` double-out, brute force; null if more than three are needed. */
function fewestDarts(rest: number): number | null {
  if (DOUBLES.includes(rest)) return 1;
  for (const a of SCORES) if (DOUBLES.includes(rest - a)) return 2;
  for (const a of SCORES) for (const b of SCORES) if (DOUBLES.includes(rest - a - b)) return 3;
  return null;
}

describe("checkout table", () => {
  it("every route adds up to its rest and ends on a double", () => {
    for (const rest of CHECKOUT_RESTS) {
      const route = checkoutRoute(rest);
      expect(route, `${rest}`).not.toBeNull();
      expect(
        route!.reduce((sum, d) => sum + dartScore(d), 0),
        `${rest}: ${checkoutHint(rest, 3)}`,
      ).toBe(rest);
      expect(route!.at(-1)?.type, `${rest} ends on a double`).toBe("double");
    }
  });

  it("uses the fewest darts and knows every rest up to 170 that can be finished", () => {
    for (let rest = 1; rest <= 180; rest++) {
      expect(checkoutRoute(rest)?.length ?? null, `${rest}`).toBe(fewestDarts(rest));
    }
  });

  it("corrects the legacy entries that did not add up", () => {
    expect(checkoutHint(86, 3)).toBe("T18, D16");
    expect(checkoutHint(143, 3)).toBe("T20, T17, D16");
    expect(checkoutHint(53, 2)).toBe("13, D20");
    expect(checkoutHint(10, 1)).toBe("D5");
  });

  it("only suggests a route that fits into the darts left", () => {
    expect(checkoutHint(170, 3)).toBe("T20, T20, DBull");
    expect(checkoutHint(170, 2)).toBeNull();
    expect(checkoutHint(40, 1)).toBe("D20");
    expect(checkoutHint(1, 3)).toBeNull();
    expect(checkoutHint(32, 0)).toBeNull();
  });
});

describe("visitCheckoutHint", () => {
  it("starts with the route for the rest before the visit", () => {
    expect(visitCheckoutHint(125, [])).toBe("T19, T10, D19");
  });

  it("keeps the route when a setup dart is hit, in any order", () => {
    // Fresh, 68 would be T20 D4; the route started with T10 D19 stays.
    expect(visitCheckoutHint(125, [T(19)])).toBe("T10, D19");
    expect(visitCheckoutHint(125, [T(10)])).toBe("T19, D19");
    expect(visitCheckoutHint(125, [T(10), T(19)])).toBe("D19");
  });

  it("starts afresh after a dart off the route", () => {
    expect(visitCheckoutHint(125, [S(25)])).toBe("T20, D20");
    expect(visitCheckoutHint(125, [S(25), S(20)])).toBeNull(); // 80 with one dart
    expect(visitCheckoutHint(100, [D(20)])).toBe("20, D20");
  });

  it("the final double is not a setup dart", () => {
    // D16 first leaves 54 with two darts: a new route, not "T18".
    expect(visitCheckoutHint(86, [D(16)])).toBe("14, D20");
  });

  it("nothing once the visit is over or the rest is unreachable", () => {
    expect(visitCheckoutHint(100, [T(20), D(20)])).toBeNull();
    expect(visitCheckoutHint(100, [S(1), S(1), S(1)])).toBeNull();
    expect(visitCheckoutHint(169, [])).toBeNull();
  });
});

describe("checkout hint per out rule (Luca, 11.11.2026)", () => {
  it("single out shows the double-out routes", () => {
    expect(visitCheckoutHint(170, [], "single")).toBe("T20, T20, DBull");
    expect(visitCheckoutHint(40, [], "single")).toBe("D20");
  });
  it("triple out shows only a one-dart finish: a triple of 1–20", () => {
    expect(visitCheckoutHint(3, [], "triple")).toBe("T1");
    expect(visitCheckoutHint(12, [], "triple")).toBe("T4");
    expect(visitCheckoutHint(60, [], "triple")).toBe("T20");
    expect(visitCheckoutHint(40, [], "triple")).toBeNull();
    expect(visitCheckoutHint(63, [], "triple")).toBeNull();
    expect(visitCheckoutHint(170, [], "triple")).toBeNull();
  });
  it("triple out follows the darts of the visit and stops after the third", () => {
    const S = (field: number): Dart => ({ field, type: "single" });
    expect(visitCheckoutHint(70, [S(10)], "triple")).toBe("T20");
    expect(visitCheckoutHint(70, [S(5), S(5)], "triple")).toBe("T20");
    expect(visitCheckoutHint(75, [S(5), S(5), S(5)], "triple")).toBeNull();
  });
});
