import type { Metadata } from "next";
import { Suspense } from "react";
import { GameMenu } from "@/components/screens/game-menu";
import { de } from "@/i18n/de";
import { countRecentMatches, listOpenMatches, listRecentMatches } from "@/server/match-service";
import { shownName } from "@/server/player-names";
import { requireSession } from "@/server/request";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: de.gameMenu.title };

async function Menu() {
  const { deps } = await requireSession();
  const matches = listOpenMatches(deps).map((m) => ({
    id: m.id,
    mode: m.mode,
    names: m.players.map(shownName),
    perPlayer: m.inputMode === "per-player",
    startedAt: m.startedAt,
  }));
  const latest = listRecentMatches(deps, 1).at(0);
  const recent = latest ? { latest, count: countRecentMatches(deps) } : null;
  return <GameMenu texts={de.gameMenu} overviewTexts={de.overview} matches={matches} recent={recent} now={deps.now()} />;
}

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <h1 className="sr-only">{de.gameMenu.title}</h1>
      <Suspense fallback={<Skeleton label={de.ui.loading} />}>
        <Menu />
      </Suspense>
    </main>
  );
}
