import { Suspense } from "react";
import { PlayerList } from "@/components/screens/player-list";
import { de } from "@/i18n/de";
import { createGuestAction, deletePlayerAction, renamePlayerAction } from "@/server/player-actions";
import { listPlayers } from "@/server/player-service";
import { requireSession } from "@/server/request";

async function Players() {
  const { deps, session } = await requireSession();
  const players = listPlayers(deps);
  return (
    <PlayerList
      players={players}
      session={session}
      texts={de.players}
      onAddGuest={createGuestAction}
      onRename={renamePlayerAction}
      onDelete={deletePlayerAction}
    />
  );
}

export default function PlayersPage() {
  return (
    <main className="flex flex-1 flex-col">
      <h1 className="sr-only">{de.players.title}</h1>
      <Suspense fallback={null}>
        <Players />
      </Suspense>
    </main>
  );
}
