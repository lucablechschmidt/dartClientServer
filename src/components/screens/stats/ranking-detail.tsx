"use client";

import { useState } from "react";
import { SectionHeading } from "@/components/ui/form-controls";
import { SegmentedControl } from "@/components/ui/segmented";
import { inRange, STATS_RANGES, type StatsRange } from "@/domain/stats/aggregate";
import type { Texts } from "@/i18n/de";
import type { ModeRanking } from "@/server/stats-service";
import { relativeTime } from "../game-menu";
import { SERIES_COLORS, SeriesDot, TrendChart } from "./trend-chart";

/** Most lines the Elo chart shows at once: one colour each. */
export const MAX_SHOWN = SERIES_COLORS.length;

type Props = {
  ranking: ModeRanking;
  playerId: string;
  texts: Texts["stats"];
  overviewTexts: Texts["overview"];
  now: number;
};

/**
 * An open ranking card: the Elo over time of the chosen players (range all, this year, 30 days) and the
 * table with place, name, Elo and games, the own row marked. Tapping a name in the table shows or hides
 * that player's line; at first only the own one is shown. A player keeps their colour while shown; the
 * dot in the row is the legend. Players without a rated 1-vs-1 match have no line to show.
 */
export function RankingDetail({ ranking: { mode, rows, history }, playerId, texts: t, overviewTexts, now }: Props) {
  const [range, setRange] = useState<StatsRange>("all");
  /** Colour slot → player, so a line keeps its colour when others come and go. */
  const [shown, setShown] = useState<(string | null)[]>(() =>
    SERIES_COLORS.map((_, i) => (i === 0 && playerId in history ? playerId : null)),
  );
  const slotOf = (player: string) => shown.indexOf(player);
  const full = !shown.includes(null);
  const toggle = (player: string) =>
    setShown((slots) => {
      const at = slots.indexOf(player);
      const free = slots.indexOf(null);
      return slots.map((p, i) => (at !== -1 ? (i === at ? null : p) : i === free ? player : p));
    });

  const lines = shown.flatMap((player, color) => {
    const row = rows.find((r) => r.player === player);
    return row ? [{ id: row.player, name: row.name, color, points: inRange(history[row.player] ?? [], range, now) }] : [];
  });
  const matches = [...new Map(lines.flatMap((l) => l.points.map((p) => [p.matchId, p.finishedAt] as const)))].sort((a, b) => a[1] - b[1]);
  const slots = matches.map(([key, finishedAt]) => ({ key, caption: relativeTime(finishedAt, now, overviewTexts) }));
  const series = lines.map(({ points, ...line }) => {
    const elo = new Map(points.map((p) => [p.matchId, p.elo]));
    return { ...line, values: matches.map(([id]) => elo.get(id) ?? null) };
  });
  const describe = (i: number) =>
    t.eloPoint
      .replace("{when}", slots[i].caption)
      .replace(
        "{values}",
        series
          .flatMap((s) => (s.values[i] === null ? [] : [t.eloValue.replace("{name}", s.name).replace("{elo}", String(s.values[i]))]))
          .join(" · "),
      );

  const title = t.ranking.replace("{mode}", t.modes[mode]);
  const cell = "px-2 py-2 text-left";
  const num = "px-2 py-2 text-right tabular-nums";
  const hasHistory = Object.keys(history).length > 0;
  return (
    <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
      {hasHistory && (
        <section className="flex min-w-0 flex-col gap-3">
          <SectionHeading>{t.eloHistory}</SectionHeading>
          <SegmentedControl
            label={t.range}
            options={STATS_RANGES.map((r) => ({ value: r, label: t.ranges[r] }))}
            value={range}
            onChange={setRange}
          />
          <div className="flex flex-col gap-1 rounded-panel bg-card-bg p-3">
            {slots.length === 0 ? (
              <p className="text-sm text-fg-muted">{t.eloNone}</p>
            ) : (
              <TrendChart label={t.eloHistory} slotHeader={t.match} slots={slots} series={series} format={String} describe={describe} />
            )}
            <p className="text-xs text-fg-muted">{t.eloHint.replace("{n}", String(MAX_SHOWN))}</p>
          </div>
        </section>
      )}
      <div className="rounded-panel bg-card-bg px-2">
        <table aria-label={title} className="w-full text-sm">
          <thead className="text-xs text-fg-muted">
            <tr>
              <th className={cell}>{t.columns.place}</th>
              <th className={`${cell} w-full`}>{t.columns.name}</th>
              <th className={num}>{t.columns.elo}</th>
              <th className={num}>{t.columns.games}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const slot = slotOf(r.player);
              const on = slot !== -1;
              return (
                <tr
                  key={r.player}
                  aria-current={r.player === playerId ? "true" : undefined}
                  className={`border-t border-separator ${r.player === playerId ? "font-semibold text-accent" : ""}`}
                >
                  <td className={num}>{r.place}</td>
                  {r.player in history ? (
                    <td className="max-w-0 px-2">
                      <button
                        type="button"
                        aria-pressed={on}
                        disabled={!on && full}
                        onClick={() => toggle(r.player)}
                        className="tap-row flex min-h-touch items-center gap-2 tap-feedback text-left disabled:opacity-50"
                      >
                        <SeriesDot color={on ? slot : null} />
                        <span className="truncate">{r.name}</span>
                      </button>
                    </td>
                  ) : (
                    <td className={`${cell} max-w-0 truncate`}>{r.name}</td>
                  )}
                  <td className={num}>{r.elo}</td>
                  <td className={num}>{r.games}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
