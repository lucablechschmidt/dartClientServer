"use client";

import { useState } from "react";
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

type Props = { hits: [number, number][]; texts: Texts["stats"] };

/**
 * Field hits as a heatmap on a dartboard (M8, m8-plan §9.4): one wedge per field (all rings together,
 * hits count single 1, double 2, triple 3) and the bull, coloured on a one-hue sequential scale; the
 * rings are drawn as thin lines only for orientation. Tapping a field names its hits; a table carries
 * the same numbers for screen readers.
 */
export function Dartboard({ hits, texts: t }: Props) {
  const byField = new Map(hits);
  const max = Math.max(0, ...byField.values());
  const [picked, setPicked] = useState<number | null>(null);
  const name = (field: number) => (field === BULL ? t.bull : `${t.field} ${field}`);
  const label = (field: number) => `${name(field)}: ${t.hits.replace("{n}", String(byField.get(field) ?? 0))}`;
  const pick = (field: number) => ({
    role: "button",
    tabIndex: 0,
    "aria-label": label(field),
    onClick: () => setPicked(field),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setPicked(field);
      }
    },
    className: `${HEAT[heatStep(byField.get(field) ?? 0, max)]} cursor-pointer stroke-card-bg stroke-2 outline-none ${picked === field ? "stroke-fg" : ""}`,
  });
  const rows = [...byField].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1] || a[0] - b[0]);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="-116 -116 232 232" className="w-full max-w-xs" aria-hidden="false">
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
              className="pointer-events-none fill-fg-muted text-xs"
            >
              {field}
            </text>
          );
        })}
      </svg>
      <p className="text-sm text-fg" aria-live="polite">
        {picked === null ? (
          <span className="text-fg-muted">{t.tapField}</span>
        ) : (
          `${name(picked)} · ${t.hits.replace("{n}", String(byField.get(picked) ?? 0))}`
        )}
      </p>
      <div className="flex items-center gap-2 text-xs text-fg-muted" aria-hidden="true">
        {t.few}
        {HEAT.slice(1).map((c) => (
          <svg key={c} viewBox="0 0 12 12" className="size-3">
            <rect width="12" height="12" rx="3" className={c} />
          </svg>
        ))}
        {t.many}
      </div>
      <table aria-label={t.fieldHits} className="sr-only">
        <thead>
          <tr>
            <th>{t.field}</th>
            <th>{t.hitsColumn}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([field, n]) => (
            <tr key={field}>
              <td>{field === BULL ? t.bull : field}</td>
              <td>{n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
