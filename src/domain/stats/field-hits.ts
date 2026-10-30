import type { Dart, Visit } from "@/domain/game";

/**
 * Field hits (E12, M8): how often a field was hit. Single 1, double 2, triple 3.
 * Misses (field 0) and overthrown slots do not count; a busted visit does not count at all.
 */
export type FieldHits = Map<number, number>;

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

export function fieldHits(visits: Visit[]): FieldHits {
  const hits: FieldHits = new Map();
  for (const visit of visits) {
    if (visit.isBust) continue;
    for (const dart of visit.darts) {
      const n = hitsOfDart(dart);
      if (n > 0) hits.set(dart.field, (hits.get(dart.field) ?? 0) + n);
    }
  }
  return hits;
}

/** Adds `extra` to `base` (for player_field_hits plus existing visits). */
export function addFieldHits(base: FieldHits, extra: FieldHits): FieldHits {
  const out = new Map(base);
  for (const [field, n] of extra) out.set(field, (out.get(field) ?? 0) + n);
  return out;
}
