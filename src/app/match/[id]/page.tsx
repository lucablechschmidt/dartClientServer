import type { Metadata } from "next";
import { de } from "@/i18n/de";
import { MatchRoute, type MatchParams } from "@/app/_routes/match-route";

export const metadata: Metadata = { title: de.game.title };

export default function MatchPage({ params }: { params: MatchParams }) {
  return <MatchRoute params={params} />;
}
