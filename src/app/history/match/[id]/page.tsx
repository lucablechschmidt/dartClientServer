import type { Metadata } from "next";
import { MatchRoute, type HistorySearch, type MatchParams } from "@/app/match/[id]/match-route";
import { de } from "@/i18n/de";

export const metadata: Metadata = { title: de.game.title };

/** A game opened from the history: the same scoreboard, back leads to `/history` with its filter. */
export default function HistoryMatchPage({ params, searchParams }: { params: MatchParams; searchParams: HistorySearch }) {
  return <MatchRoute params={params} history={searchParams} />;
}
