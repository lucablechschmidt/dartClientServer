import type { Metadata } from "next";
import { Suspense } from "react";
import { SubPage } from "@/components/screens/account/sub-page";
import { MyStatsSection } from "@/components/screens/stats/my-stats";
import { STATS_RANGES, type StatsRange } from "@/domain/stats/aggregate";
import { de } from "@/i18n/de";
import { requireSession } from "@/server/request";
import { myStats } from "@/server/stats-service";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: de.account.pages.stats };

type Search = Promise<{ range?: string }>;
const rangeOf = (raw: string | undefined): StatsRange => STATS_RANGES.find((r) => r === raw) ?? "all";

async function Stats({ searchParams }: { searchParams: Search }) {
  const { deps, session } = await requireSession();
  const range = rangeOf((await searchParams).range);
  return <MyStatsSection view={myStats(deps, session, range)} texts={de.stats} overviewTexts={de.overview} now={deps.now()} />;
}

/** M8: the own statistics (?range=all|year|30d), below the account tab. */
export default function StatsPage({ searchParams }: { searchParams: Search }) {
  return (
    <main className="flex flex-1 flex-col">
      <SubPage title={de.account.pages.stats} back={de.ui.back} width="wide">
        <Suspense fallback={<Skeleton label={de.ui.loading} inline />}>
          <Stats searchParams={searchParams} />
        </Suspense>
      </SubPage>
    </main>
  );
}
