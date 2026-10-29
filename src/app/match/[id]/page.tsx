import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ScoreboardScreen } from "@/components/screens/scoreboard-screen";
import { de } from "@/i18n/de";
import { cancelMatchAction, commitVisitAction, loadMatchAction, restartMatchAction, setPlayOutAction, setStarterAction, undoVisitAction } from "@/server/match-actions";
import { loadMatchView } from "@/server/match-service";
import { requireSession } from "@/server/request";

async function Match({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { deps, session } = await requireSession();
  const view = loadMatchView(deps, id, session);
  if (!view) notFound();
  return (
    <ScoreboardScreen
      initial={view}
      texts={de.game}
      onCommitVisit={commitVisitAction}
      onUndoVisit={undoVisitAction}
      onPlayOut={setPlayOutAction}
      onSetStarter={setStarterAction}
      onLoad={loadMatchAction}
      onRestart={restartMatchAction}
      onCancel={cancelMatchAction}
    />
  );
}

export default function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="score-grid" />}>
      <Match params={params} />
    </Suspense>
  );
}
