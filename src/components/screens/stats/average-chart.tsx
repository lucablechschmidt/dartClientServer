"use client";

import type { Texts } from "@/i18n/de";
import { relativeTime } from "../game-menu";
import { TrendChart } from "./trend-chart";

type Point = { matchId: string; finishedAt: number; average: number };

type Props = { points: Point[]; texts: Texts["stats"]; overviewTexts: Texts["overview"]; now: number };

const two = (n: number) => n.toFixed(2);

/** The 3-dart average per X01 match over time (M8): one series in the accent colour, see `TrendChart`. */
export function AverageChart({ points, texts: t, overviewTexts, now }: Props) {
  const when = (p: Point) => relativeTime(p.finishedAt, now, overviewTexts);
  return (
    <TrendChart
      label={t.history}
      slotHeader={t.match}
      slots={points.map((p) => ({ key: p.matchId, caption: when(p) }))}
      series={[{ id: "average", name: t.average, color: 0, values: points.map((p) => p.average) }]}
      format={two}
      describe={(i) => t.historyPoint.replace("{when}", when(points[i])).replace("{average}", two(points[i].average))}
    />
  );
}
