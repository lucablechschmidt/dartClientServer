import Link from "next/link";
import { CardList, CardRow } from "@/components/ui/card-list";
import { PageFrame } from "@/components/ui/page-frame";
import { ButtonLink, SectionHeading } from "@/components/ui/form-controls";
import type { Texts } from "@/i18n/de";
import { LatestGameRow, type RecentMatchItem } from "./recent-games";
import { relativeTime } from "./relative-time";

export { relativeTime };
export type { RecentMatchItem };

type Mode = keyof Texts["gameMenu"]["modes"];
const MODES: readonly Mode[] = ["x01", "cricket", "elimination", "splitscore"];

/** A running match for the overview (E13): ready for display, no DB types. */
export type OpenMatchItem = { id: string; mode: Mode; names: string[]; perPlayer: boolean; startedAt: number };

type Props = {
  texts: Texts["gameMenu"];
  overviewTexts: Texts["overview"];
  matches: OpenMatchItem[];
  /** The latest closed game and how many the history has (Design/last-games.png). */
  recent?: { latest: RecentMatchItem; count: number } | null;
  now: number;
};

/** Mode name before the time; Classic Game (X01) stays unmarked as the usual case. */
const modePrefix = (mode: Mode, t: Texts["gameMenu"]) => (mode === "x01" ? "" : `${t.modes[mode]} · `);

/** Port of NewGameView (GameSelection): the four modes centered (all playable since M7); the running games below (M4), then one row to the last ones (M5, `/history`). */
export function GameMenu({ texts, overviewTexts, matches, recent = null, now }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      {/* gray buttons in one centred column of the page width (11.11.2026) */}
      <nav aria-label={texts.title} className="flex flex-1 flex-col justify-center px-4 py-8">
        <PageFrame className="gap-3">
          {MODES.map((mode) => (
            <ButtonLink key={mode} href={`/new/${mode}`} className="tap-feedback py-3 text-fluid-lg">
              {texts.modes[mode]}
            </ButtonLink>
          ))}
          <ButtonLink href="/tournaments" className="tap-feedback py-3 text-fluid-lg">
            {texts.tournaments}
          </ButtonLink>
        </PageFrame>
      </nav>
      {matches.length > 0 && (
        <section className="px-4 pb-4">
          <PageFrame className="gap-2">
            <SectionHeading>{overviewTexts.title}</SectionHeading>
            <CardList tone="fill" label={overviewTexts.title}>
              {matches.map((m) => (
                <CardRow key={m.id}>
                  <Link href={`/match/${m.id}`} className="tap-row flex min-h-touch items-center justify-between gap-3 tap-feedback">
                    <span className="truncate">{m.names.join(" · ")}</span>
                    <span className="shrink-0 text-sm text-fg-muted">
                      {modePrefix(m.mode, texts)}
                      {m.perPlayer ? `${overviewTexts.perPlayer} · ` : ""}
                      {relativeTime(m.startedAt, now, overviewTexts)}
                    </span>
                  </Link>
                </CardRow>
              ))}
            </CardList>
          </PageFrame>
        </section>
      )}
      {recent && (
        <section className="px-4 pb-4">
          <PageFrame>
            <LatestGameRow latest={recent.latest} count={recent.count} texts={overviewTexts} modes={texts.modes} />
          </PageFrame>
        </section>
      )}
    </div>
  );
}
