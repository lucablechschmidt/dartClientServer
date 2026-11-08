import { Suspense } from "react";
import { AdminScreen } from "@/components/screens/admin-screen";
import { de } from "@/i18n/de";
import {
  createPasswordInviteAction,
  createRegisterInviteAction,
  deleteMatchAdminAction,
  deleteTournamentAdminAction,
  loadMoreMatchesAction,
  promoteGuestAction,
} from "@/server/admin-actions";
import { listAllMatches } from "@/server/cleanup-service";
import { deletePlayerAction } from "@/server/player-actions";
import { listPlayers } from "@/server/player-service";
import { requireAdmin } from "@/server/request";
import { listTournaments } from "@/server/tournament-service";
import { Skeleton } from "@/components/ui/skeleton";

async function Admin() {
  const { deps, session } = await requireAdmin();
  const matches = listAllMatches(deps, session, 0);
  if (!matches.ok) throw new Error("admin session refused by listAllMatches");
  return (
    <AdminScreen
      session={session}
      players={listPlayers(deps)}
      tournaments={listTournaments(deps)}
      matches={{ items: matches.items, hasMore: matches.hasMore }}
      now={deps.now()}
      texts={de.account}
      listTexts={{ overview: de.overview, modes: de.gameMenu.modes, formats: de.tournaments.formats }}
      onCreateInvite={createRegisterInviteAction}
      onCreatePasswordInvite={createPasswordInviteAction}
      onDeletePlayer={deletePlayerAction}
      onPromoteGuest={promoteGuestAction}
      onDeleteMatch={deleteMatchAdminAction}
      onDeleteTournament={deleteTournamentAdminAction}
      onLoadMoreMatches={loadMoreMatchesAction}
    />
  );
}

/** Admin tab ("Verwaltung"): invites, players and today's guests. Others are sent to their account. */
export default function AdminPage() {
  return (
    <main className="flex flex-1 flex-col">
      <h1 className="sr-only">{de.nav.admin}</h1>
      <Suspense fallback={<Skeleton label={de.ui.loading} />}>
        <Admin />
      </Suspense>
    </main>
  );
}
