import type { Dart, Visit } from "@/domain/game";

/**
 * Field hits (E12, M8): how often a field was hit, split by ring (11.11.2026: the dartboard shows the
 * split after a tap). Misses (field 0) and overthrown slots do not count; a busted visit does not count
 * at all. The board's colour uses the weighted sum `hitsOf` (single 1, double 2, triple 3), as before.
 */
export type FieldCount = {
  single: number;
  double: number;
  triple: number;
  /** Weighted hits saved from guest games before the split existed (player_field_hits before 11.11.2026). */
  unsplit: number;
};
export type FieldHits = Map<number, FieldCount>;

export const NO_HITS: FieldCount = { single: 0, double: 0, triple: 0, unsplit: 0 };

/** Weighted hits of a field: single 1, double 2, triple 3, plus the unsplit ones. */
export const hitsOf = (c: FieldCount): number => c.single + 2 * c.double + 3 * c.triple + c.unsplit;

export function hitsOfDart(dart: Dart): number {
  if (dart.field === 0) return 0;
  switch (dart.type) {
    case "single":
      return 1;
    case "double":
      return 2;
    case "triple":
      return 3;
    case "overthrown":
      return 0;
  }
}

const plus = (a: FieldCount, b: FieldCount): FieldCount => ({
  single: a.single + b.single,
  double: a.double + b.double,
  triple: a.triple + b.triple,
  unsplit: a.unsplit + b.unsplit,
});

export function fieldHits(visits: Visit[]): FieldHits {
  const hits: FieldHits = new Map();
  for (const visit of visits) {
    if (visit.isBust) continue;
    for (const dart of visit.darts) {
      if (hitsOfDart(dart) === 0 || dart.type === "overthrown") continue;
      hits.set(dart.field, plus(hits.get(dart.field) ?? NO_HITS, { ...NO_HITS, [dart.type]: 1 }));
    }
  }
  return hits;
}

/** Adds `extra` to `base` (for player_field_hits plus existing visits). */
export function addFieldHits(base: FieldHits, extra: FieldHits): FieldHits {
  const out = new Map(base);
  for (const [field, c] of extra) out.set(field, plus(out.get(field) ?? NO_HITS, c));
  return out;
}
