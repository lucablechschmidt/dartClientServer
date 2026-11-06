import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MatchDetailScreen } from "@/components/screens/stats/match-detail";
import { de } from "@/i18n/de";
import { requireSession } from "@/server/request";
import { matchDetail } from "@/server/stats-service";

type Params = Promise<{ id: string }>;
type Search = Promise<{ from?: string }>;

async function Detail({ params, searchParams }: { params: Params; searchParams: Search }) {
  const [{ id }, { from }] = await Promise.all([params, searchParams]);
  const { deps, session } = await requireSession();
  const r = matchDetail(deps, session, id);
  // Not a player of the match (the admin included) or no X01 match: as if it did not exist.
  if (!r.ok) notFound();
  return (
    <MatchDetailScreen
      detail={r.detail}
      texts={de.stats}
      back={de.ui.back}
      backHref={from === "match" ? `/match/${id}` : "/account/stats"}
    />
  );
}

/** M8: statistics of one X01 match per leg, for its players; from the victory screen or the own recent games (back there). */
export default function MatchStatsPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  return (
    <main className="flex min-h-dvh flex-col bg-bg-grouped pt-safe">
      <Suspense fallback={null}>
        <Detail params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
