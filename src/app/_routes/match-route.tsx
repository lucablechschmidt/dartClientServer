import { notFound } from "next/navigation";
import { Suspense } from "react";
import { historyFilter, historyHref, historyStatsHref } from "@/components/screens/history-href";
import { ScoreboardScreen } from "@/components/screens/scoreboard-screen";
import { de } from "@/i18n/de";
import {
  cancelMatchAction,
  commitVisitAction,
  loadMatchAction,
  restartMatchAction,
  setPlayOutAction,
  setStarterAction,
  reorderPlayersAction,
  decideWinnerAction,
  newAchievementsAction,
  undoVisitAction,
} from "@/server/match-actions";
import { loadMatchView } from "@/server/match-service";
import { tournamentOfMatch } from "@/server/tournament-service";
import { requireSession } from "@/server/request";

export type MatchParams = Promise<{ id: string }>;
/** The history's filter, carried along by a game opened from there. */
export type HistorySearch = Promise<{ mode?: string; n?: string }>;

type Props = { params: MatchParams; history?: HistorySearch };

async function Match({ params, history }: Props) {
  const { id } = await params;
  const { deps, session } = await requireSession();
  const view = loadMatchView(deps, id, session);
  if (!view) notFound();
  const tournamentId = tournamentOfMatch(deps, id);
  const filter = history ? historyFilter(await history) : null;
  return (
    <ScoreboardScreen
      initial={view}
      texts={de.game}
      onCommitVisit={commitVisitAction}
      onUndoVisit={undoVisitAction}
      onPlayOut={setPlayOutAction}
      onSetStarter={setStarterAction}
      onReorder={reorderPlayersAction}
      onDecideWinner={decideWinnerAction}
      tournamentHref={tournamentId ? `/tournaments/${tournamentId}` : undefined}
      backHref={filter ? historyHref(filter) : undefined}
      statsHref={filter ? historyStatsHref(id, filter) : undefined}
      onLoad={loadMatchAction}
      onRestart={restartMatchAction}
      onCancel={cancelMatchAction}
      onLoadAchievements={newAchievementsAction}
      achievementTexts={de.achievements}
    />
  );
}

/** The scoreboard of `/match/[id]` and, with `history`, of `/history/match/[id]` (back leads to the history). */
export function MatchRoute({ params, history }: Props) {
  return (
    <Suspense fallback={<div className="score-grid" />}>
      <Match params={params} history={history} />
    </Suspense>
  );
}
