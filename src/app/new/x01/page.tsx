import { Suspense } from "react";
import { NewMatchForm } from "@/components/screens/new-match-form";
import { de } from "@/i18n/de";
import { createMatchAction } from "@/server/match-actions";
import { createGuestAction } from "@/server/player-actions";
import { listPlayers } from "@/server/player-service";
import { requireSession } from "@/server/request";

async function Setup() {
  const { deps } = await requireSession();
  const players = listPlayers(deps);
  return (
    <NewMatchForm
      players={players}
      texts={de.newGame}
      commonTexts={{ back: de.ui.back, save: de.players.save, cancel: de.players.cancel }}
      onStart={createMatchAction}
      onAddGuest={createGuestAction}
    />
  );
}

/** Setup for X01 (ClassicGameSetUpView). No tab bar, as in legacy. */
export default function NewX01Page() {
  return (
    <main className="flex min-h-dvh flex-col pt-safe pb-safe">
      <h1 className="sr-only">{de.newGame.title}</h1>
      <Suspense fallback={null}>
        <Setup />
      </Suspense>
    </main>
  );
}
