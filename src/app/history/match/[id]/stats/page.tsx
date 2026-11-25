import type { Metadata } from "next";
import { MatchStatsRoute, type StatsParams, type StatsSearch } from "@/app/_routes/match-stats-route";
import { de } from "@/i18n/de";

export const metadata: Metadata = { title: de.stats.detail.title };

/** The X01 match page of a game opened from the history: back leads to that game, then to the history. */
export default function HistoryMatchStatsPage({ params, searchParams }: { params: StatsParams; searchParams: StatsSearch }) {
  return <MatchStatsRoute params={params} searchParams={searchParams} history />;
}
