import type { Dart, DartType, Visit } from "./types";

const MULTIPLIER: Record<DartType, number> = { single: 1, double: 2, triple: 3, overthrown: 0 };

export function dartScore(dart: Dart): number {
  return dart.field * MULTIPLIER[dart.type];
}

/** Port of getDartThrowScore; a busted visit scores 0 (DartThrow.faulty). */
export function visitScore(visit: Visit): number {
  if (visit.isBust) return 0;
  return visit.darts.reduce((sum, d) => sum + dartScore(d), 0);
}

/** Structural validity of a dart, independent of the game state. */
export function isDart(dart: Dart): boolean {
  if (!Number.isInteger(dart.field)) return false;
  if (dart.type === "overthrown") return false; // only produced by the domain
  if (dart.field === 0) return dart.type === "single";
  if (dart.field === 25) return dart.type !== "triple";
  return dart.field >= 1 && dart.field <= 20;
}

/** Display as in legacy: T20, D16, 20, Bull, DBull. */
export function dartLabel(dart: Dart): string {
  if (dart.type === "overthrown") return "✕";
  const name = dart.field === 25 ? "Bull" : String(dart.field);
  const prefix = dart.type === "double" ? "D" : dart.type === "triple" ? "T" : "";
  return prefix + name;
}
