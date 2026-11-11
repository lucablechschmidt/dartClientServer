import type { Metadata } from "next";
import { Suspense } from "react";
import { SubPage } from "@/components/screens/account/sub-page";
import { HISTORY_MODES, HistoryScreen } from "@/components/screens/recent-games";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfWeek } from "@/domain/calendar";
import { de } from "@/i18n/de";
import { countRecentMatches, HISTORY_PAGE, listRecentMatches } from "@/server/match-service";
import { requireSession } from "@/server/request";

export const metadata: Metadata = { title: de.overview.recent };

type Search = Promise<{ mode?: string; n?: string }>;

/** `?n=` shown games: a multiple of the page size, at least one page (a typed number is rounded up). */
const shownOf = (raw: string | undefined) => Math.max(1, Math.ceil((Number(raw) || 0) / HISTORY_PAGE)) * HISTORY_PAGE;

async function History({ searchParams }: { searchParams: Search }) {
  const { deps } = await requireSession();
  const params = await searchParams;
  const mode = HISTORY_MODES.find((m) => m === params.mode) ?? null;
  const shown = shownOf(params.n);
  const games = listRecentMatches(deps, shown, mode ?? undefined);
  const more = countRecentMatches(deps, mode ?? undefined) > shown;
  const query = (n: number) => `/history?${new URLSearchParams({ ...(mode ? { mode } : {}), n: String(n) }).toString()}`;
  return (
    <HistoryScreen
      games={games}
      mode={mode}
      weekStart={startOfWeek(deps.now())}
      moreHref={more ? query(shown + HISTORY_PAGE) : null}
      now={deps.now()}
      texts={de.overview}
      modes={de.gameMenu.modes}
    />
  );
}

/** The last games below the start screen (11.11.2026): filter by mode (?mode=), 25 at a time (?n=). */
export default function HistoryPage({ searchParams }: { searchParams: Search }) {
  return (
    <main className="flex flex-1 flex-col">
      <SubPage title={de.overview.recent} back={de.ui.back} backHref="/">
        <Suspense fallback={<Skeleton label={de.ui.loading} inline />}>
          <History searchParams={searchParams} />
        </Suspense>
      </SubPage>
    </main>
  );
}
