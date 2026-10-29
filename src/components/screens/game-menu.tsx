import Link from "next/link";
import { CardList, CardRow } from "@/components/ui/card-list";
import { SectionHeading } from "@/components/ui/form-controls";
import type { Texts } from "@/i18n/de";

type Mode = keyof Texts["gameMenu"]["modes"];
const MODES: readonly { mode: Mode; href: string | null }[] = [
  { mode: "x01", href: "/new/x01" },
  { mode: "cricket", href: null },
  { mode: "elimination", href: null },
  { mode: "splitscore", href: null },
];

/** A running match for the overview (E13): ready for display, no DB types. */
export type OpenMatchItem = { id: string; names: string[]; perPlayer: boolean; startedAt: number };

/** A closed match for the history (M5), names already resolved. */
export type RecentMatchItem = {
  id: string;
  names: string[];
  endedAt: number;
  result:
    | { kind: "abandoned" }
    | { kind: "places"; order: string[] }
    | { kind: "score"; winner: string; unit: "legs" | "sets"; score: [number, number] }
    | { kind: "winner"; winner: string };
};

type Props = { texts: Texts["gameMenu"]; overviewTexts: Texts["overview"]; matches: OpenMatchItem[]; recent?: RecentMatchItem[]; now: number };

/** "vor 12 min", computed from server time so server and client render the same. */
export function relativeTime(startedAt: number, now: number, t: Texts["overview"]): string {
  const minutes = Math.max(0, Math.round((now - startedAt) / 60_000));
  if (minutes < 1) return t.justNow;
  if (minutes < 60) return t.minutesAgo.replace("{n}", String(minutes));
  if (minutes < 24 * 60) return t.hoursAgo.replace("{n}", String(Math.round(minutes / 60)));
  return t.daysAgo.replace("{n}", String(Math.round(minutes / (24 * 60))));
}

/** "Casey Legs 2:1", "1. C · 2. A · 3. B", "Casey gewinnt" or "abgebrochen". */
export function resultText(result: RecentMatchItem["result"], t: Texts["overview"]): string {
  switch (result.kind) {
    case "abandoned":
      return t.abandoned;
    case "places":
      return result.order.map((name, i) => `${i + 1}. ${name}`).join(" · ");
    case "score":
      return `${result.winner} ${t[result.unit]} ${result.score.join(":")}`;
    case "winner":
      return t.winner.replace("{name}", result.winner);
  }
}

/** Port of NewGameView (GameSelection): four titles centered; the running games below (M4), then the last ones (M5). */
export function GameMenu({ texts, overviewTexts, matches, recent = [], now }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <nav aria-label={texts.title} className="flex flex-1 flex-col items-center justify-center gap-6 py-8 fluid-text-xl">
        {MODES.map(({ mode, href }) =>
          href ? (
            <Link key={mode} href={href} className="min-h-touch px-4 py-1 text-fg">
              {texts.modes[mode]}
            </Link>
          ) : (
            <span key={mode} className="px-4 py-1 text-fg-muted" title={texts.soon} aria-disabled="true">
              {texts.modes[mode]}
            </span>
          ),
        )}
      </nav>
      {matches.length > 0 && (
        <section className="flex flex-col gap-2 px-4 pb-4">
          <SectionHeading>{overviewTexts.title}</SectionHeading>
          <CardList label={overviewTexts.title}>
            {matches.map((m) => (
              <CardRow key={m.id}>
                <Link href={`/match/${m.id}`} className="flex min-h-touch w-full items-center justify-between gap-3">
                  <span className="truncate">{m.names.join(" · ")}</span>
                  <span className="shrink-0 text-sm text-fg-muted">
                    {m.perPlayer ? `${overviewTexts.perPlayer} · ` : ""}
                    {relativeTime(m.startedAt, now, overviewTexts)}
                  </span>
                </Link>
              </CardRow>
            ))}
          </CardList>
        </section>
      )}
      {recent.length > 0 && (
        <section className="flex flex-col gap-2 px-4 pb-4">
          <SectionHeading>{overviewTexts.recent}</SectionHeading>
          <CardList label={overviewTexts.recent}>
            {recent.map((m) => (
              <CardRow key={m.id}>
                <Link href={`/match/${m.id}`} className="flex min-h-touch w-full flex-col justify-center py-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate">{m.names.join(" · ")}</span>
                    <span className="shrink-0 text-sm text-fg-muted">{relativeTime(m.endedAt, now, overviewTexts)}</span>
                  </span>
                  <span className={`truncate text-sm ${m.result.kind === "abandoned" ? "text-fg-muted" : ""}`}>{resultText(m.result, overviewTexts)}</span>
                </Link>
              </CardRow>
            ))}
          </CardList>
        </section>
      )}
    </div>
  );
}
