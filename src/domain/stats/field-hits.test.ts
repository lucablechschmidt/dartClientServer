import { describe, expect, it } from "vitest";
import type { Dart, Visit } from "@/domain/game";
import { addFieldHits, fieldHits, hitsOf, hitsOfDart, NO_HITS, type FieldCount } from "./field-hits";

const d = (field: number, type: Dart["type"] = "single"): Dart => ({ field, type });
const visit = (darts: Dart[], isBust = false): Visit => ({ playerId: "p", darts, isBust });
const c = (single = 0, double = 0, triple = 0, unsplit = 0): FieldCount => ({ single, double, triple, unsplit });
const weighted = (hits: Map<number, FieldCount>) => new Map([...hits].map(([f, n]) => [f, hitsOf(n)]));

describe("fieldHits (E12), split by ring", () => {
  it("T20 S20 T5 → 20: one single, one triple (weighted 4); 5: one triple (3)", () => {
    const hits = fieldHits([visit([d(20, "triple"), d(20), d(5, "triple")])]);
    expect(hits).toEqual(
      new Map([
        [20, c(1, 0, 1)],
        [5, c(0, 0, 1)],
      ]),
    );
    expect(weighted(hits)).toEqual(
      new Map([
        [20, 4],
        [5, 3],
      ]),
    );
  });
  it("D16, Bull, DBull, 0 → 16 double; Bull one single and one double; nothing for 0", () => {
    expect(fieldHits([visit([d(16, "double"), d(25), d(0)]), visit([d(25, "double")])])).toEqual(
      new Map([
        [16, c(0, 1)],
        [25, c(1, 1)],
      ]),
    );
  });
  it("a busted visit counts nothing, not even the darts before the bust", () => {
    expect(fieldHits([visit([d(20), d(20), d(0, "overthrown")], true)])).toEqual(new Map());
  });
  it("an open visit with one dart already counts", () => {
    expect(fieldHits([visit([d(19, "triple")])])).toEqual(new Map([[19, c(0, 0, 1)]]));
  });
  it("hitsOfDart: overthrown and field 0 are 0", () => {
    expect(hitsOfDart(d(20, "overthrown"))).toBe(0);
    expect(hitsOfDart(d(0, "triple"))).toBe(0);
  });
  it("addFieldHits merges without mutating; unsplit hits stay apart", () => {
    const base = new Map([[20, c(1, 0, 1)]]);
    expect(
      addFieldHits(
        base,
        new Map([
          [20, c(0, 0, 0, 5)],
          [5, c(0, 0, 1)],
        ]),
      ),
    ).toEqual(
      new Map([
        [20, c(1, 0, 1, 5)],
        [5, c(0, 0, 1)],
      ]),
    );
    expect(base).toEqual(new Map([[20, c(1, 0, 1)]]));
    expect(hitsOf(NO_HITS)).toBe(0);
  });
});
