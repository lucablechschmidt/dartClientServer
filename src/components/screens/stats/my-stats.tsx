import Link from "next/link";
import { Dartboard } from "@/components/darts/dartboard";
import { CardList, CardRow } from "@/components/ui/card-list";
import { SectionHeading } from "@/components/ui/form-controls";
import { PillLinks } from "@/components/ui/pill-links";
import { StatTile } from "@/components/ui/stat-tile";
import type { ModeId } from "@/domain/game";
import type { ModeRecord, StatsRange } from "@/domain/stats/aggregate";
import type { X01Stats } from "@/domain/stats/x01";
import type { Texts } from "@/i18n/de";
import { relativeTime } from "../game-menu";
import { AverageChart } from "./average-chart";

/** What the page gets from the server's myStats (structural, no server import). */
export type MyStatsView = {
  range: StatsRange;
  records: Partial<Record<ModeId, ModeRecord>>;
  x01: X01Stats;
  history: { matchId: string; finishedAt: number; average: number }[];
  fieldHits: [number, number][];
  recent: { id: string; mode: ModeId; names: string[]; finishedAt: number; place: number | null; detail: boolean }[];
};

const RANGES: readonly StatsRange[] = ["all", "year", "30d"];
const two = (n: number) => n.toFixed(2);

type Props = {
  view: MyStatsView;
  texts: Texts["stats"];
  overviewTexts: Texts["overview"];
  now: number;
};

/**
 * The own statistics on /account/stats (M8): range pills, tiles with the figures, the average per match,
 * the field hits on a dartboard and the last
 * games with a link to the X01 match page. Only the own statistics, for everyone (m8-plan §2).
 */
export function MyStatsSection({ view, texts: t, overviewTexts, now }: Props) {
  const all = Object.values(view.records);
  const games = all.reduce((n, r) => n + r.games, 0);
  const wins = all.reduce((n, r) => n + r.wins, 0);
  const x = view.x01;
  const tiles: [string, string][] = [
    [t.games, String(games)],
    [t.wins, String(wins)],
    ...(x.visits > 0
      ? ([
          [t.average, two(x.average)],
          [t.first9, two(x.first9)],
          [t.count180, String(x.count180)],
          [t.count140, String(x.count140)],
          [t.count100, String(x.count100)],
          [t.highestScore, String(x.highestScore ?? 0)],
          [t.highestFinish, x.highestFinish === null ? "–" : String(x.highestFinish)],
          ...Object.entries(x.bestLeg)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([start, darts]): [string, string] => [t.bestLeg.replace("{start}", start), t.darts.replace("{n}", String(darts))]),
        ] as [string, string][])
      : []),
  ];

  return (
    <div className="flex flex-col gap-3">
      <PillLinks
        label={t.range}
        items={RANGES.map((r) => ({ href: `/account/stats?range=${r}`, label: t.ranges[r], current: r === view.range }))}
      />
      {games === 0 ? (
        <p className="px-4 text-sm text-fg-muted">{t.none}</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 rounded-panel bg-card-bg p-3">
            {tiles.map(([label, value]) => (
              <StatTile key={label} label={label} value={value} />
            ))}
          </div>
          {view.history.length > 0 && (
            <>
              <SectionHeading>{t.history}</SectionHeading>
              <div className="rounded-panel bg-card-bg p-3">
                <AverageChart points={view.history} texts={t} overviewTexts={overviewTexts} now={now} />
              </div>
            </>
          )}
          {view.fieldHits.length > 0 && (
            <>
              <SectionHeading>{t.fieldHits}</SectionHeading>
              <div className="rounded-panel bg-card-bg p-3">
                <Dartboard hits={view.fieldHits} texts={t} />
              </div>
            </>
          )}
          <SectionHeading>{t.recent}</SectionHeading>
          <CardList label={t.recent}>
            {view.recent.map((m) => {
              const line = (
                <span className="flex w-full flex-col py-1">
                  <span className="truncate font-medium">{m.names.join(" · ")}</span>
                  <span className="truncate text-sm text-fg-muted">
                    {[
                      t.modes[m.mode],
                      m.place === null ? null : t.place.replace("{n}", String(m.place)),
                      relativeTime(m.finishedAt, now, overviewTexts),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              );
              return (
                <CardRow key={m.id}>
                  {m.detail ? (
                    <Link href={`/match/${m.id}/stats`} className="flex min-h-touch w-full items-center">
                      {line}
                    </Link>
                  ) : (
                    line
                  )}
                </CardRow>
              );
            })}
          </CardList>
        </>
      )}
    </div>
  );
}
