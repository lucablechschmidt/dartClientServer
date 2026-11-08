import type { Metadata } from "next";
import { Suspense } from "react";
import { TournamentSetup } from "@/components/screens/tournament/tournament-setup";
import { de } from "@/i18n/de";
import { createGuestAction } from "@/server/player-actions";
import { listPlayers } from "@/server/player-service";
import { requireSession } from "@/server/request";
import { createTournamentAction } from "@/server/tournament-actions";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: de.tournaments.newTournament };

async function Setup() {
  const { deps } = await requireSession();
  return (
    <TournamentSetup
      players={listPlayers(deps)}
      texts={de.newGame}
      tournamentTexts={de.tournaments}
      commonTexts={{ back: de.ui.back, save: de.players.save, cancel: de.players.cancel }}
      onStart={createTournamentAction}
      onAddGuest={createGuestAction}
    />
  );
}

/** New tournament (M9) in the setup layout; no tab bar, like the match setups. */
export default function NewTournamentPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-bg-grouped pt-safe">
      <Suspense fallback={<Skeleton label={de.ui.loading} />}>
        <Setup />
      </Suspense>
    </main>
  );
}
