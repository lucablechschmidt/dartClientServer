import type { Metadata } from "next";
import { de } from "@/i18n/de";
import { MatchStatsRoute, type StatsParams, type StatsSearch } from "@/app/_routes/match-stats-route";

export const metadata: Metadata = { title: de.stats.detail.title };

export default function MatchStatsPage({ params, searchParams }: { params: StatsParams; searchParams: StatsSearch }) {
  return <MatchStatsRoute params={params} searchParams={searchParams} />;
}
