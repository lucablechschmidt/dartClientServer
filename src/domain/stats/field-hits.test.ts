import { describe, expect, it } from "vitest";
import type { Dart, Visit } from "@/domain/x01";
import { addFieldHits, fieldHits, hitsOfDart } from "./field-hits";

const d = (field: number, type: Dart["type"] = "single"): Dart => ({ field, type });
const visit = (darts: Dart[], isBust = false): Visit => ({ playerId: "p", darts, isBust });

describe("fieldHits (E12)", () => {
  it("T20 S20 T5 → 4×20, 3×5", () => {
    expect(fieldHits([visit([d(20, "triple"), d(20), d(5, "triple")])])).toEqual(new Map([[20, 4], [5, 3]]));
  });
  it("D16, Bull, 0 → 2×16, 1×25, nothing for 0", () => {
    expect(fieldHits([visit([d(16, "double"), d(25), d(0)])])).toEqual(new Map([[16, 2], [25, 1]]));
  });
  it("a busted visit counts nothing, not even the darts before the bust", () => {
    expect(fieldHits([visit([d(20), d(20), d(0, "overthrown")], true)])).toEqual(new Map());
  });
  it("an open visit with one dart already counts", () => {
    expect(fieldHits([visit([d(19, "triple")])])).toEqual(new Map([[19, 3]]));
  });
  it("sums across visits", () => {
    const visits = [visit([d(20, "triple"), d(20, "triple"), d(20, "triple")]), visit([d(20), d(1), d(5, "double")]), visit([d(1)])];
    expect(fieldHits(visits)).toEqual(new Map([[20, 10], [1, 2], [5, 2]]));
  });
  it("hitsOfDart: overthrown and field 0 are 0", () => {
    expect(hitsOfDart(d(20, "overthrown"))).toBe(0);
    expect(hitsOfDart(d(0, "triple"))).toBe(0);
  });
  it("addFieldHits merges without mutating", () => {
    const base = new Map([[20, 4]]);
    expect(addFieldHits(base, new Map([[20, 1], [5, 3]]))).toEqual(new Map([[20, 5], [5, 3]]));
    expect(base).toEqual(new Map([[20, 4]]));
  });
});
