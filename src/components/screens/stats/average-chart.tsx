"use client";

import { useState } from "react";
import type { Texts } from "@/i18n/de";
import { relativeTime } from "../game-menu";

type Point = { matchId: string; finishedAt: number; average: number };

/** Clean y ticks (steps of 10, 20 or 50, at most about six lines) around [min, max]; one step either side when equal. */
export function niceTicks(min: number, max: number): number[] {
  const span = Math.max(1, max - min);
  const step = span > 100 ? 50 : span > 40 ? 20 : 10;
  let lo = Math.floor(min / step) * step;
  let hi = Math.ceil(max / step) * step;
  if (lo === hi) [lo, hi] = [lo - step, hi + step];
  return Array.from({ length: (hi - lo) / step + 1 }, (_, i) => lo + i * step);
}

const W = 320;
const H = 160;
const PAD = { left: 30, right: 44, top: 10, bottom: 10 } as const;

type Props = { points: Point[]; texts: Texts["stats"]; overviewTexts: Texts["overview"]; now: number };

/**
 * The 3-dart average per X01 match over time (M8): one series, so no legend (the heading names it);
 * a 2px line with ringed points, hairline grid, the last value labelled. Pointing or tapping picks the
 * nearest match and names it below; a table carries the values for screen readers (dataviz skill).
 */
export function AverageChart({ points, texts: t, overviewTexts, now }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  if (points.length === 0) return null;
  const ticks = niceTicks(Math.min(...points.map((p) => p.average)), Math.max(...points.map((p) => p.average)));
  const [lo, hi] = [ticks[0], ticks[ticks.length - 1]];
  const plotW = W - PAD.left - PAD.right;
  const x = (i: number) => PAD.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.average).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const describe = (p: Point) =>
    t.historyPoint.replace("{when}", relativeTime(p.finishedAt, now, overviewTexts)).replace("{average}", p.average.toFixed(2));
  const nearest = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - box.left) / box.width) * W;
    const i = points.length === 1 ? 0 : Math.round(((vx - PAD.left) / plotW) * (points.length - 1));
    setPicked(Math.min(points.length - 1, Math.max(0, i)));
  };

  return (
    <div className="flex flex-col gap-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={t.history}
        className="w-full touch-pan-y"
        onPointerMove={nearest}
        onPointerDown={nearest}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="stroke-separator stroke-1" />
            <text x={PAD.left - 6} y={y(v)} textAnchor="end" dominantBaseline="central" className="fill-fg-muted text-xs">
              {v}
            </text>
          </g>
        ))}
        {picked !== null && <line x1={x(picked)} x2={x(picked)} y1={PAD.top} y2={H - PAD.bottom} className="stroke-fg-muted stroke-1" />}
        <path d={line} className="fill-none stroke-accent stroke-2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={p.matchId} cx={x(i)} cy={y(p.average)} r={picked === i ? 6 : 4} className="fill-accent stroke-card-bg stroke-2" />
        ))}
        <text x={x(points.length - 1) + 8} y={y(last.average)} dominantBaseline="central" className="fill-fg text-xs font-semibold">
          {last.average.toFixed(2)}
        </text>
      </svg>
      <p className="min-h-5 text-sm text-fg" aria-live="polite">
        {picked === null ? "" : describe(points[picked])}
      </p>
      <table aria-label={t.history} className="sr-only">
        <thead>
          <tr>
            <th>{t.match}</th>
            <th>{t.average}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.matchId}>
              <td>{relativeTime(p.finishedAt, now, overviewTexts)}</td>
              <td>{p.average.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
