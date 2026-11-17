"use client";

import { useLayoutEffect, useState } from "react";
import { useElementSize } from "@/components/ui/use-element-size";

/** Clean y ticks (steps of 10, 20, 50 or 100, at most about six lines) around [min, max]; one step either side when equal. */
export function niceTicks(min: number, max: number): number[] {
  const span = Math.max(1, max - min);
  const step = span > 250 ? 100 : span > 100 ? 50 : span > 40 ? 20 : 10;
  let lo = Math.floor(min / step) * step;
  let hi = Math.ceil(max / step) * step;
  if (lo === hi) [lo, hi] = [lo - step, hi + step];
  return Array.from({ length: (hi - lo) / step + 1 }, (_, i) => lo + i * step);
}

/**
 * The categorical series colours (theme.md §1, `--series-1` … `--series-5`) as literal classes, in their
 * fixed order; a series keeps its slot for as long as it is shown.
 */
export const SERIES_COLORS = [
  { stroke: "stroke-series-1", fill: "fill-series-1", bg: "bg-series-1" },
  { stroke: "stroke-series-2", fill: "fill-series-2", bg: "bg-series-2" },
  { stroke: "stroke-series-3", fill: "fill-series-3", bg: "bg-series-3" },
  { stroke: "stroke-series-4", fill: "fill-series-4", bg: "bg-series-4" },
  { stroke: "stroke-series-5", fill: "fill-series-5", bg: "bg-series-5" },
] as const;

/** The colour dot of a series (legend, ranking row); without a colour an empty ring: not shown in the chart. */
export function SeriesDot({ color }: { color: number | null }) {
  return (
    <span className={`size-swatch shrink-0 rounded-full ${color === null ? "border-icon border-separator" : SERIES_COLORS[color].bg}`} />
  );
}

/** One line: a value per slot, `null` where the series has none (the line runs on to its next value). */
export type TrendSeries = { id: string; name: string; color: number; values: (number | null)[] };

/**
 * The chart's geometry in SVG pixels (the viewBox is the measured size, so these are CSS pixels). Colours,
 * line widths and type come from theme classes; only coordinates live here, as they cannot be classes.
 */
const CHART = {
  /** Size before the first measurement (server render); the height matches the `h-chart` token. */
  fallback: { width: 320, height: 160 },
  /** Room above the top and below the bottom grid line, so a picked point is not cut off. */
  padY: 10,
  /** Margin at the left and right edge of the SVG. */
  edge: 4,
  /** Between a y label and the plot; between the last point and its value. */
  labelGap: 6,
  valueGap: 8,
  /** Point radius (an 8px mark, dataviz skill) and a picked point's. */
  point: 4,
  pointPicked: 6,
  /** Width of one `text-xs` digit, only until the labels have been measured (server render, tests). */
  digitEstimate: 7,
} as const;

/** Rendered widths of the widest y label and of the last-value label; `null` until measured. */
type LabelWidths = { tick: number; value: number } | null;

/** Width of the widest `<text>` matching `selector` in `svg`; 0 where the browser cannot measure text. */
function textWidth(svg: SVGSVGElement, selector: string): number {
  const texts = [...svg.querySelectorAll<SVGTextElement>(selector)];
  return Math.max(0, ...texts.map((t) => (typeof t.getComputedTextLength === "function" ? t.getComputedTextLength() : 0)));
}

type Props = {
  /** Names the chart and its table. */
  label: string;
  /** Heading of the slot column in the table. */
  slotHeader: string;
  /** The x positions, evenly spaced (one per match), oldest first. */
  slots: { key: string; caption: string }[];
  series: TrendSeries[];
  format: (value: number) => string;
  /** The line below the chart for the picked slot. */
  describe: (slot: number) => string;
};

/**
 * Values per match over time (M8): 2px lines with ringed points on a hairline grid. One series needs no
 * legend (the heading names it) and gets its last value labelled; several get a legend below. Pointing or
 * tapping picks the nearest slot and describes it below; a table carries the values for screen readers
 * (dataviz skill). The height is fixed and the viewBox is the measured size in pixels, so text and lines
 * keep their size on wide screens instead of growing with the width.
 */
export function TrendChart({ label, slotHeader, slots, series, format, describe }: Props) {
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [svgRef, { width: W, height: H }] = useElementSize<SVGSVGElement>(CHART.fallback);
  const [measured, setMeasured] = useState<LabelWidths>(null);
  const all = series.flatMap((s) => s.values.filter((v) => v !== null));
  const ticks = all.length === 0 ? [] : niceTicks(Math.min(...all), Math.max(...all));
  const lines = series.map((s) => ({ ...s, points: s.values.flatMap((v, i) => (v === null ? [] : [{ i, v }])) }));
  const single = lines.length === 1 ? lines[0] : null;
  const last = single?.points.at(-1);
  const labels = `${ticks.join(",")}|${last ? format(last.v) : ""}`;
  // Whenever the label texts change, measure them as drawn and lay the plot out around them (a second
  // render only when a width changed, e.g. four-digit Elo instead of three-digit averages).
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const next = { tick: textWidth(svg, "[data-label=tick]"), value: textWidth(svg, "[data-label=value]") };
    if (next.tick === 0) return;
    setMeasured((m) => (m?.tick === next.tick && m.value === next.value ? m : next));
  }, [svgRef, labels]);
  if (slots.length === 0 || all.length === 0) return null;
  const found = slots.findIndex((s) => s.key === pickedKey);
  const picked = found === -1 ? null : found;
  const [lo, hi] = [ticks[0], ticks[ticks.length - 1]];
  const estimate = (texts: string[]) => CHART.digitEstimate * Math.max(0, ...texts.map((s) => s.length));
  const tickW = measured?.tick ?? estimate(ticks.map(String));
  const valueW = last ? (measured?.value ?? estimate([format(last.v)])) : 0;
  const left = CHART.edge + tickW + CHART.labelGap;
  const right = CHART.edge + (last ? CHART.valueGap + valueW : CHART.pointPicked);
  const plotW = W - left - right;
  const x = (i: number) => left + (slots.length === 1 ? plotW / 2 : (i / (slots.length - 1)) * plotW);
  const y = (v: number) => CHART.padY + (1 - (v - lo) / (hi - lo)) * (H - 2 * CHART.padY);
  const path = (points: { i: number; v: number }[]) =>
    points.map((p, n) => `${n === 0 ? "M" : "L"} ${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const nearest = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - box.left) / box.width) * W;
    const i = slots.length === 1 ? 0 : Math.round(((vx - left) / plotW) * (slots.length - 1));
    setPickedKey(slots[Math.min(slots.length - 1, Math.max(0, i))].key);
  };

  return (
    <div className="flex flex-col gap-1">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={label}
        className="h-chart w-full touch-pan-y"
        onPointerMove={nearest}
        onPointerDown={nearest}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={left} x2={W - right} y1={y(v)} y2={y(v)} className="stroke-separator stroke-1" />
            <text
              data-label="tick"
              x={left - CHART.labelGap}
              y={y(v)}
              textAnchor="end"
              dominantBaseline="central"
              className="fill-fg-muted text-xs tabular-nums"
            >
              {v}
            </text>
          </g>
        ))}
        {picked !== null && <line x1={x(picked)} x2={x(picked)} y1={CHART.padY} y2={H - CHART.padY} className="stroke-fg-muted stroke-1" />}
        {lines.map((s) => (
          <g key={s.id}>
            <path
              d={path(s.points)}
              className={`fill-none stroke-2 ${SERIES_COLORS[s.color].stroke}`}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {s.points.map((p) => (
              <circle
                key={slots[p.i].key}
                cx={x(p.i)}
                cy={y(p.v)}
                r={picked === p.i ? CHART.pointPicked : CHART.point}
                className={`stroke-card-bg stroke-2 ${SERIES_COLORS[s.color].fill}`}
              />
            ))}
          </g>
        ))}
        {last && (
          <text
            data-label="value"
            x={x(last.i) + CHART.valueGap}
            y={y(last.v)}
            dominantBaseline="central"
            className="fill-fg text-xs font-semibold tabular-nums"
          >
            {format(last.v)}
          </text>
        )}
      </svg>
      {!single && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-fg-muted">
          {lines.map((s) => (
            <li key={s.id} className="flex min-w-0 items-center gap-1">
              <SeriesDot color={s.color} />
              <span className="truncate">{s.name}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="min-h-5 text-sm text-fg" aria-live="polite">
        {picked === null ? "" : describe(picked)}
      </p>
      <table aria-label={label} className="sr-only">
        <thead>
          <tr>
            <th>{slotHeader}</th>
            {series.map((s) => (
              <th key={s.id}>{s.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot, i) => (
            <tr key={slot.key}>
              <td>{slot.caption}</td>
              {series.map((s) => {
                const v = s.values[i];
                return <td key={s.id}>{v === null ? "" : format(v)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
