import type { Metadata } from "next";
import { Suspense } from "react";
import { TournamentList } from "@/components/screens/tournament/tournament-list";
import { de } from "@/i18n/de";
import { requireSession } from "@/server/request";
import { listTournaments } from "@/server/tournament-service";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: de.tournaments.title };

async function List() {
  const { deps } = await requireSession();
  return <TournamentList items={listTournaments(deps)} texts={de.tournaments} back={de.ui.back} />;
}

/** Tournaments (M9): running and finished, newest first. */
export default function TournamentsPage() {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<Skeleton label={de.ui.loading} />}>
        <List />
      </Suspense>
    </main>
  );
}
