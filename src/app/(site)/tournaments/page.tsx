import { Suspense } from "react";
import { TournamentList } from "@/components/screens/tournament/tournament-list";
import { de } from "@/i18n/de";
import { requireSession } from "@/server/request";
import { listTournaments } from "@/server/tournament-service";

async function List() {
  const { deps } = await requireSession();
  return <TournamentList items={listTournaments(deps)} texts={de.tournaments} />;
}

/** Tournaments (M9): running and finished, newest first. */
export default function TournamentsPage() {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={null}>
        <List />
      </Suspense>
    </main>
  );
}
