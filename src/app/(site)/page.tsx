import { Suspense } from "react";
import { GameMenu } from "@/components/screens/game-menu";
import { de } from "@/i18n/de";
import { listOpenMatches, listRecentMatches } from "@/server/match-service";
import { requireSession } from "@/server/request";

async function Menu() {
  const { deps } = await requireSession();
  const matches = listOpenMatches(deps).map((m) => ({
    id: m.id,
    names: m.players.map((p) => p.name),
    perPlayer: m.inputMode === "per-player",
    startedAt: m.startedAt,
  }));
  return <GameMenu texts={de.gameMenu} overviewTexts={de.overview} matches={matches} recent={listRecentMatches(deps)} now={deps.now()} />;
}

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <h1 className="sr-only">{de.gameMenu.title}</h1>
      <Suspense fallback={null}>
        <Menu />
      </Suspense>
    </main>
  );
}
