import type { Dart, DartType, Visit } from "@/domain/game";
import type { VisitRow } from "./schema";

/** DartThrow (3 slots) ↔ row with d1..d3. Empty slot = both columns NULL. */

type Slot = { field: number | null; type: DartType | null };

const slotToDart = (s: Slot): Dart | null => (s.field === null || s.type === null ? null : { field: s.field, type: s.type });

export function rowToVisit(row: VisitRow): Visit {
  const slots: Slot[] = [
    { field: row.d1Field, type: row.d1Type },
    { field: row.d2Field, type: row.d2Type },
    { field: row.d3Field, type: row.d3Type },
  ];
  const darts: Dart[] = [];
  for (const s of slots) {
    const d = slotToDart(s);
    if (!d) break;
    darts.push(d);
  }
  return { playerId: row.playerId, darts, isBust: row.isBust };
}

export type VisitSlots = Pick<VisitRow, "d1Field" | "d1Type" | "d2Field" | "d2Type" | "d3Field" | "d3Type" | "isBust">;

export function visitToSlots(visit: Visit): VisitSlots {
  const [a, b, c] = visit.darts;
  return {
    d1Field: a?.field ?? null,
    d1Type: a?.type ?? null,
    d2Field: b?.field ?? null,
    d2Type: b?.type ?? null,
    d3Field: c?.field ?? null,
    d3Type: c?.type ?? null,
    isBust: visit.isBust,
  };
}
