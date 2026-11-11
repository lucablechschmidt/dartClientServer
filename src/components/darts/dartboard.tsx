"use client";

import { useCallback, useRef, useState } from "react";
import { StatTile } from "@/components/ui/stat-tile";
import { useDismiss } from "@/components/ui/use-dismiss";
import { hitsOf, NO_HITS, type FieldCount } from "@/domain/stats/field-hits";
import type { Texts } from "@/i18n/de";

/** Fields clockwise from the top, as on a real board. */
export const BOARD_ORDER: readonly number[] = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const BULL = 25;
const STEPS = 5;
const HEAT = ["fill-fill-strong", "fill-heat-1", "fill-heat-2", "fill-heat-3", "fill-heat-4", "fill-heat-5"] as const;

/** Board radii in viewBox units (double ring outside = 100), from the regulation board (170 mm). */
const R = { bull: 9.4, trebleIn: 58, trebleOut: 63, doubleIn: 95, doubleOut: 100, numbers: 107 } as const;

/** Sequential step of a field: 0 without hits, else 1–5 by its share of the most hit field. */
export function heatStep(hits: number, max: number): number {
  if (hits <= 0 || max <= 0) return 0;
  return Math.min(STEPS, Math.max(1, Math.ceil((hits / max) * STEPS)));
}

/** Point on the board, angle in degrees clockwise from the top. */
const at = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a)).toFixed(2)}`;
};
/** A field's wedge from the bull to the double ring. */
const wedge = (i: number) => {
  const [from, to] = [i * 18 - 9, i * 18 + 9];
  return `M ${at(R.bull, from)} L ${at(R.doubleOut, from)} A ${R.doubleOut} ${R.doubleOut} 0 0 1 ${at(R.doubleOut, to)} L ${at(R.bull, to)} A ${R.bull} ${R.bull} 0 0 0 ${at(R.bull, from)} Z`;
};

type Props = { hits: [number, FieldCount][]; texts: Texts["stats"] };

/**
 * Field hits as a heatmap on a dartboard (M8, m8-plan §9.4): one wedge per field and the bull, coloured
 * by the weighted hits (single 1, double 2, triple 3) on a one-hue sequential scale; the rings are thin
 * lines for orientation. A tap on a field outlines it and shows its single, double and triple hits; a
 * tap on the same field, anywhere else or Escape goes back to the colours only. A table carries the
 * numbers for screen readers.
 */
export function Dartboard({ hits, texts: t }: Props) {
  const byField = new Map(hits);
  const count = (field: number) => byField.get(field) ?? NO_HITS;
  const max = Math.max(0, ...[...byField.values()].map(hitsOf));
  const [picked, setPicked] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const clear = useCallback(() => setPicked(null), []);
  useDismiss(picked !== null, root, clear);
  const name = (field: number) => (field === BULL ? t.bull : `${t.field} ${field}`);
  const total = (field: number) => t.hits.replace("{n}", String(hitsOf(count(field))));
  const toggle = (field: number) => setPicked((p) => (p === field ? null : field));
  const pick = (field: number) => ({
    role: "button",
    tabIndex: 0,
    "aria-label": `${name(field)}: ${total(field)}`,
    "aria-pressed": picked === field,
    onClick: () => toggle(field),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle(field);
      }
    },
    className: `${HEAT[heatStep(hitsOf(count(field)), max)]} cursor-pointer stroke-card-bg stroke-2 outline-none`,
  });
  const rows = [...byField].filter(([, c]) => hitsOf(c) > 0).sort((a, b) => hitsOf(b[1]) - hitsOf(a[1]) || a[0] - b[0]);
  const pickedIndex = picked === null ? -1 : BOARD_ORDER.indexOf(picked);

  return (
    <div ref={root} className="flex w-full flex-col items-center gap-3">
      {/* a tap on the board between the fields (or on a number) also goes back to the colours */}
      <svg viewBox="-116 -116 232 232" className="w-full max-w-xs" onClick={(e) => e.target === e.currentTarget && clear()}>
        {BOARD_ORDER.map((field, i) => (
          <path key={field} d={wedge(i)} {...pick(field)} />
        ))}
        {[R.trebleIn, R.trebleOut, R.doubleIn].map((r) => (
          <circle key={r} r={r} className="pointer-events-none fill-none stroke-card-bg stroke-1" />
        ))}
        <circle r={R.bull} {...pick(BULL)} />
        {BOARD_ORDER.map((field, i) => {
          const [x, y] = at(R.numbers, i * 18).split(" ");
          return (
            <text
              key={field}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className={`pointer-events-none text-xs ${picked === field ? "fill-fg font-semibold" : "fill-fg-muted"}`}
            >
              {field}
            </text>
          );
        })}
        {/* the outline of the picked field on top of everything, so neighbours and ring lines cannot cover it */}
        {pickedIndex >= 0 && <path d={wedge(pickedIndex)} className="pointer-events-none fill-none stroke-fg stroke-2" />}
        {picked === BULL && <circle r={R.bull} className="pointer-events-none fill-none stroke-fg stroke-2" />}
      </svg>
      <div className="flex w-full flex-col items-center gap-2" aria-live="polite">
        {picked === null ? (
          <>
            <p className="text-sm text-fg-muted">{t.tapField}</p>
            <div className="flex items-center gap-2 text-xs text-fg-muted" aria-hidden="true">
              {t.few}
              {HEAT.slice(1).map((c) => (
                <svg key={c} viewBox="0 0 12 12" className="size-3">
                  <rect width="12" height="12" rx="3" className={c} />
                </svg>
              ))}
              {t.many}
            </div>
          </>
        ) : (
          <FieldDetail name={name(picked)} total={total(picked)} count={count(picked)} bull={picked === BULL} texts={t} />
        )}
      </div>
      <table aria-label={t.fieldHits} className="sr-only">
        <thead>
          <tr>
            <th>{t.field}</th>
            <th>{t.rings.single}</th>
            <th>{t.rings.double}</th>
            <th>{t.rings.triple}</th>
            <th>{t.hitsColumn}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([field, c]) => (
            <tr key={field}>
              <td>{field === BULL ? t.bull : field}</td>
              <td>{c.single}</td>
              <td>{c.double}</td>
              <td>{field === BULL ? "–" : c.triple}</td>
              <td>{hitsOf(c)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One field after a tap: name and weighted hits, then single, double, triple (Bull: single and double bull). */
function FieldDetail({
  name,
  total,
  count,
  bull,
  texts: t,
}: {
  name: string;
  total: string;
  count: FieldCount;
  bull: boolean;
  texts: Texts["stats"];
}) {
  const tiles: [string, number][] = bull
    ? [
        [t.bullRings.single, count.single],
        [t.bullRings.double, count.double],
      ]
    : [
        [t.rings.single, count.single],
        [t.rings.double, count.double],
        [t.rings.triple, count.triple],
      ];
  return (
    <>
      <p className="text-sm font-semibold">
        {name} · {total}
      </p>
      <div className={`grid w-full max-w-xs gap-2 ${bull ? "grid-cols-2" : "grid-cols-3"}`}>
        {tiles.map(([label, n]) => (
          <StatTile key={label} label={label} value={String(n)} />
        ))}
      </div>
      {count.unsplit > 0 && <p className="text-xs text-fg-muted">{t.unsplit.replace("{n}", String(count.unsplit))}</p>}
    </>
  );
}
