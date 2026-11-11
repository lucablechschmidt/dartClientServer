import Link from "next/link";
import { Fragment } from "react";
import { CardLinkRow, CardList, CardRow } from "@/components/ui/card-list";
import { SectionHeading } from "@/components/ui/form-controls";
import { PillLinks } from "@/components/ui/pill-links";
import type { Texts } from "@/i18n/de";
import { relativeTime } from "./relative-time";

type Mode = keyof Texts["gameMenu"]["modes"];
export const HISTORY_MODES: readonly Mode[] = ["x01", "cricket", "elimination", "splitscore"];

/** A closed match for the history (M5), names already resolved. */
export type RecentMatchItem = {
  id: string;
  mode: Mode;
  /** X01 start score ("Classic 501"). */
  startScore: number;
  names: string[];
  /** Shown in bold; none when cancelled. */
  winners: string[];
  endedAt: number;
  result:
    | { kind: "abandoned" }
    | { kind: "places"; order: { player: string; place: number }[] }
    | { kind: "score"; winner: string; unit: "legs" | "sets"; score: [number, number] }
    | { kind: "winner"; winner: string };
};

type T = Texts["overview"];
type ModeNames = Texts["gameMenu"]["modes"];

/** "Classic 501" for X01, the other modes by name. */
export const modeLabel = (m: Pick<RecentMatchItem, "mode" | "startScore">, t: T, modes: ModeNames) =>
  m.mode === "x01" ? t.classic.replace("{n}", String(m.startScore)) : modes[m.mode];

/** "A, B und C". */
const list = (names: string[], t: T) =>
  names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} ${t.and} ${names.at(-1) ?? ""}`;

/** The latest game in one sentence: "admin gewinnt gegen Wanda 2:1", "A gewinnt vor B und C", "A, B · abgebrochen". */
export function summary(m: RecentMatchItem, t: T): string {
  const r = m.result;
  if (r.kind === "abandoned") return `${m.names.join(", ")} · ${t.abandoned}`;
  const winner = list(m.winners, t);
  const others =
    r.kind === "places" ? r.order.filter((p) => p.place !== 1).map((p) => p.player) : m.names.filter((n) => !m.winners.includes(n));
  if (others.length === 0) return t.winner.replace("{name}", winner);
  const text = (r.kind === "places" ? t.ahead : t.beats).replace("{winner}", winner).replace("{others}", list(others, t));
  return r.kind === "score" ? `${text} ${r.score.join(":")}` : text;
}

/** The detail under the names in the history: score, places or cancelled; nothing for a plain win (the bold name says it). */
function resultDetail(r: RecentMatchItem["result"], t: T): string | null {
  switch (r.kind) {
    case "abandoned":
      return t.abandoned;
    case "places":
      return r.order.map((p) => `${p.place}. ${p.player}`).join(" · ");
    case "score":
      return `${t[r.unit]} ${r.score.join(":")}`;
    case "winner":
      return null;
  }
}

/** Start screen (Design/last-games.png): one row with the latest game and the count, opening the history. */
export function LatestGameRow({ latest, count, texts, modes }: { latest: RecentMatchItem; count: number; texts: T; modes: ModeNames }) {
  return (
    <CardList tone="fill" label={texts.recent}>
      <CardLinkRow
        href="/history"
        label={texts.recent}
        subtitle={texts.latest.replace("{text}", `${summary(latest, texts)} · ${modeLabel(latest, texts, modes)}`)}
        detail={count === 1 ? texts.gameCount.one : texts.gameCount.other.replace("{n}", String(count))}
      />
    </CardList>
  );
}

type HistoryProps = {
  games: RecentMatchItem[];
  /** The mode filtered by, or all. */
  mode: Mode | null;
  /** Start of "Diese Woche" (Monday 00:00 local time). */
  weekStart: number;
  /** Link to the next page ("Weitere laden"), when there are more games. */
  moreHref: string | null;
  now: number;
  texts: T;
  modes: ModeNames;
};

/** `/history`: filter by mode, the games of this week and the older ones, winner in bold, more on request. */
export function HistoryScreen({ games, mode, weekStart, moreHref, now, texts: t, modes }: HistoryProps) {
  const groups = [
    { title: t.thisWeek, games: games.filter((g) => g.endedAt >= weekStart) },
    { title: t.older, games: games.filter((g) => g.endedAt < weekStart) },
  ].filter((g) => g.games.length > 0);
  return (
    <div className="flex flex-col gap-4">
      <PillLinks
        label={t.filter}
        items={[
          { href: "/history", label: t.all, current: mode === null },
          ...HISTORY_MODES.map((m) => ({ href: `/history?mode=${m}`, label: t.modesShort[m], current: m === mode })),
        ]}
      />
      {groups.length === 0 && <p className="px-4 text-sm text-fg-muted">{t.none}</p>}
      {groups.map((g) => (
        <section key={g.title} className="flex flex-col gap-2">
          <SectionHeading>{g.title}</SectionHeading>
          <CardList label={g.title}>
            {g.games.map((m) => (
              <CardRow key={m.id}>
                <Link href={`/match/${m.id}`} className="tap-row flex min-h-touch flex-col justify-center tap-feedback py-1">
                  <span className="truncate">
                    {m.names.map((n, i) => (
                      <Fragment key={n}>
                        {i > 0 && " · "}
                        {m.winners.includes(n) ? <strong className="font-semibold">{n}</strong> : n}
                      </Fragment>
                    ))}
                  </span>
                  <span className="truncate text-sm text-fg-muted">
                    {[resultDetail(m.result, t), modeLabel(m, t, modes), relativeTime(m.endedAt, now, t)].filter(Boolean).join(" · ")}
                  </span>
                </Link>
              </CardRow>
            ))}
          </CardList>
        </section>
      ))}
      {moreHref && (
        <Link href={moreHref} scroll={false} className="min-h-touch self-center px-4 py-3 font-medium text-accent">
          {t.more}
        </Link>
      )}
    </div>
  );
}
