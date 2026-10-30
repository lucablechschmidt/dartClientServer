import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TournamentScreen } from "@/components/screens/tournament/tournament-screen";
import { de } from "@/i18n/de";
import { requireSession } from "@/server/request";
import { deleteTournamentAction, redrawTournamentAction, startFixtureAction } from "@/server/tournament-actions";
import { loadTournamentView } from "@/server/tournament-service";

async function Tournament({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { deps, session } = await requireSession();
  const view = loadTournamentView(deps, session, id);
  if (!view) notFound();
  return (
    <TournamentScreen
      view={view}
      texts={de.tournaments}
      back={de.ui.back}
      onStart={startFixtureAction.bind(null, id)}
      onRedraw={redrawTournamentAction.bind(null, id)}
      onDelete={deleteTournamentAction.bind(null, id)}
    />
  );
}

/** One tournament (M9): tables, schedule, "Spielen". */
export default function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="flex min-h-dvh flex-col bg-bg-grouped pt-safe pb-safe">
      <Suspense fallback={null}>
        <Tournament params={params} />
      </Suspense>
    </main>
  );
}
