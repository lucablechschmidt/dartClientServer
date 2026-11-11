import { dartLabel, dartScore } from "./game/scoring";
import { MAX_DARTS_PER_VISIT, type Dart, type OutRule } from "./game/types";

/**
 * Checkout routes, double-out (single-out shows the same routes, triple-out only one-dart finishes: Luca
 * 11.11.2026, docs/fragen.md). Ported from Legacy/Dart/Classes/ClassicGame/Checkouts.swift, then checked
 * at the board (7.11.2026, M6 practice test): one table instead of three, because a rest is always
 * finished with the fewest darts (50 is Bull, not 10 D20; 110 is T20 Bull), and four legacy entries
 * did not add up (10, 53, 86, 143). A route is written as thrown: setup darts first, the double last.
 * `checkouts.test.ts` proves every entry adds up and no shorter route exists.
 */
const ROUTES: Readonly<Record<number, string>> = {
  170: "T20, T20, DBull",
  167: "T20, T19, DBull",
  164: "T20, T18, DBull",
  161: "T20, T17, DBull",
  160: "T20, T20, D20",
  158: "T20, T20, D19",
  157: "T20, T19, D20",
  156: "T20, T20, D18",
  155: "T20, T19, D19",
  154: "T20, T18, D20",
  153: "T20, T19, D18",
  152: "T20, T20, D16",
  151: "T20, T17, D20",
  150: "T20, T20, D15",
  149: "T20, T19, D16",
  148: "T20, T16, D20",
  147: "T20, T17, D18",
  146: "T20, T18, D16",
  145: "T20, T19, D14",
  144: "T20, T20, D12",
  143: "T20, T17, D16",
  142: "T20, T14, D20",
  141: "T20, T19, D12",
  140: "T20, T20, D10",
  139: "T19, T14, D20",
  138: "T20, T18, D12",
  137: "T20, T19, D10",
  136: "T20, T20, D8",
  135: "T20, T17, D12",
  134: "T20, T14, D16",
  133: "T20, T19, D8",
  132: "T20, T16, D12",
  131: "T20, T13, D16",
  130: "T20, T18, D8",
  129: "T19, T16, D12",
  128: "T18, T14, D16",
  127: "T20, T17, D8",
  126: "T20, T14, D12",
  125: "T19, T10, D19",
  124: "T20, T16, D8",
  123: "T19, T14, D12",
  122: "T20, T10, D16",
  121: "T19, T16, D8",
  120: "T20, 20, D20",
  119: "T19, T10, D16",
  118: "T20, 18, D20",
  117: "T19, 20, D20",
  116: "T20, 16, D20",
  115: "T19, 18, D20",
  114: "T20, 14, D20",
  113: "T19, 16, D20",
  112: "T20, 12, D20",
  111: "T19, 14, D20",
  110: "T20, DBull",
  109: "T20, 9, D20",
  108: "T20, 8, D20",
  107: "T19, DBull",
  106: "T20, 6, D20",
  105: "T19, 8, D20",
  104: "T18, DBull",
  103: "T19, 14, D16",
  102: "T20, 10, D16",
  101: "T17, DBull",
  100: "T20, D20",
  99: "T19, 10, D16",
  98: "T20, D19",
  97: "T19, D20",
  96: "T20, D18",
  95: "T19, D19",
  94: "T18, D20",
  93: "T19, D18",
  92: "T20, D16",
  91: "T17, D20",
  90: "T20, D15",
  89: "T19, D16",
  88: "T16, D20",
  87: "T17, D18",
  86: "T18, D16",
  85: "T19, D14",
  84: "T20, D12",
  83: "T17, D16",
  82: "T14, D20",
  81: "T19, D12",
  80: "T20, D10",
  79: "T13, D20",
  78: "T18, D12",
  77: "T19, D10",
  76: "T20, D8",
  75: "T17, D12",
  74: "T14, D16",
  73: "T19, D8",
  72: "T16, D12",
  71: "T13, D16",
  70: "T18, D8",
  69: "T19, D6",
  68: "T20, D4",
  67: "T17, D8",
  66: "T14, D12",
  65: "T19, D4",
  64: "T16, D8",
  63: "T13, D12",
  62: "T10, D16",
  61: "T15, D8",
  60: "20, D20",
  59: "19, D20",
  58: "18, D20",
  57: "17, D20",
  56: "16, D20",
  55: "15, D20",
  54: "14, D20",
  53: "13, D20",
  52: "12, D20",
  51: "19, D16",
  50: "DBull",
  49: "9, D20",
  48: "8, D20",
  47: "15, D16",
  46: "6, D20",
  45: "13, D16",
  44: "4, D20",
  43: "11, D16",
  42: "10, D16",
  41: "9, D16",
  40: "D20",
  39: "7, D16",
  38: "D19",
  37: "5, D16",
  36: "D18",
  35: "3, D16",
  34: "D17",
  33: "1, D16",
  32: "D16",
  31: "7, D12",
  30: "D15",
  29: "13, D8",
  28: "D14",
  27: "11, D8",
  26: "D13",
  25: "9, D8",
  24: "D12",
  23: "7, D8",
  22: "D11",
  21: "5, D8",
  20: "D10",
  19: "3, D8",
  18: "D9",
  17: "13, D2",
  16: "D8",
  15: "7, D4",
  14: "D7",
  13: "5, D4",
  12: "D6",
  11: "3, D4",
  10: "D5",
  9: "1, D4",
  8: "D4",
  7: "3, D2",
  6: "D3",
  5: "1, D2",
  4: "D2",
  3: "1, D1",
  2: "D1",
};

export type CheckoutRoute = readonly Dart[];

/** "T20" → triple 20, "DBull" → double 25, "7" → single 7 (the labels of `dartLabel`). */
function parseDart(label: string): Dart {
  const type = label.startsWith("T") ? "triple" : label.startsWith("D") ? "double" : "single";
  const name = type === "single" ? label : label.slice(1);
  return { field: name === "Bull" ? 25 : Number(name), type };
}

const TABLE = new Map<number, CheckoutRoute>(
  Object.entries(ROUTES).map(([rest, route]) => [Number(rest), route.split(", ").map(parseDart)]),
);

/** The rests a route exists for (for the tests). */
export const CHECKOUT_RESTS: readonly number[] = [...TABLE.keys()];

/** The route with the fewest darts for `rest`, double-out; null when it cannot be finished with three darts. */
export function checkoutRoute(rest: number): CheckoutRoute | null {
  return TABLE.get(rest) ?? null;
}

/** The route as shown: "T20, 20, D20". */
export const routeLabel = (route: CheckoutRoute): string => route.map(dartLabel).join(", ");

/** A route that fits into the darts left, else null. */
function routeFor(rest: number, dartsLeft: number): CheckoutRoute | null {
  const route = checkoutRoute(rest);
  return route && route.length <= dartsLeft ? route : null;
}

/** Hint for `rest` with `dartsLeft` darts, as a fresh route (no visit context). */
export function checkoutHint(rest: number, dartsLeft: number): string | null {
  const route = routeFor(rest, dartsLeft);
  return route ? routeLabel(route) : null;
}

const sameDart = (a: Dart, b: Dart): boolean => a.field === b.field && a.type === b.type;

/** Triple-out: only the finish with one dart, a triple of 1–20 (3: T1, 12: T4, 60: T20); longer routes are not shown. */
function tripleFinish(rest: number): string | null {
  return rest % 3 === 0 && rest >= 3 && rest <= 60 ? dartLabel({ field: rest / 3, type: "triple" }) : null;
}

/**
 * Hint during a visit: the route suggested at its start is kept as long as the darts thrown hit one
 * of its setup darts (in any order), so the hint never jumps to a different route halfway. A dart
 * off the route starts afresh from the new rest. `rest` is the rest before the visit, `thrown` the
 * darts of the visit so far. Single-out uses the double-out routes, triple-out only `tripleFinish`.
 */
export function visitCheckoutHint(rest: number, thrown: readonly Dart[], outRule: OutRule = "double"): string | null {
  if (outRule === "triple") {
    const now = rest - thrown.reduce((n, d) => n + dartScore(d), 0);
    return thrown.length < MAX_DARTS_PER_VISIT ? tripleFinish(now) : null;
  }
  let left = MAX_DARTS_PER_VISIT;
  let route = routeFor(rest, left);
  for (const dart of thrown) {
    rest -= dartScore(dart);
    left -= 1;
    const hit = route?.slice(0, -1).findIndex((d) => sameDart(d, dart)) ?? -1;
    route = route && hit >= 0 ? route.filter((_, i) => i !== hit) : routeFor(rest, left);
  }
  return route && left > 0 ? routeLabel(route) : null;
}
