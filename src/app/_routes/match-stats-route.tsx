import { notFound } from "next/navigation";
import { Suspense } from "react";
import { historyFilter, historyMatchHref } from "@/components/screens/history-href";
import { MatchDetailScreen } from "@/components/screens/stats/match-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { de } from "@/i18n/de";
import { requireSession } from "@/server/request";
import { matchDetail } from "@/server/stats-service";

export type StatsParams = Promise<{ id: string }>;
export type StatsSearch = Promise<{ from?: string; mode?: string; n?: string }>;

type Props = { params: StatsParams; searchParams: StatsSearch; history?: boolean };

async function Detail({ params, searchParams, history = false }: Props) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const { deps, session } = await requireSession();
  const r = matchDetail(deps, session, id);
  // Not a player of the match (the admin included) or a mode without a match page: as if it did not exist.
  if (!r.ok) notFound();
  const backHref = history ? historyMatchHref(id, historyFilter(search)) : search.from === "match" ? `/match/${id}` : "/account/stats";
  return <MatchDetailScreen detail={r.detail} texts={de.stats} back={de.ui.back} backHref={backHref} />;
}

/**
 * M8: the match page of an X01 (per leg) or SplitScore match (per round), for its players; from the victory screen or the own recent
 * games (back there). With `history` the page below `/history/match/[id]`: back to the game opened from the history.
 */
export function MatchStatsRoute(props: Props) {
  return (
    <main className="flex min-h-dvh flex-col bg-bg-grouped pt-safe">
      <Suspense fallback={<Skeleton label={de.ui.loading} width="wide" />}>
        <Detail {...props} />
      </Suspense>
    </main>
  );
}
