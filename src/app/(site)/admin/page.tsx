import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminScreen } from "@/components/screens/admin-screen";
import { de } from "@/i18n/de";
import { createPasswordInviteAction, createRegisterInviteAction, promoteGuestAction } from "@/server/admin-actions";
import { deletePlayerAction } from "@/server/player-actions";
import { listPlayers } from "@/server/player-service";
import { requireSession } from "@/server/request";

async function Admin() {
  const { deps, session } = await requireSession();
  if (!session.isAdmin) redirect("/account");
  return (
    <AdminScreen
      session={session}
      players={listPlayers(deps)}
      texts={de.account}
      onCreateInvite={createRegisterInviteAction}
      onCreatePasswordInvite={createPasswordInviteAction}
      onDeletePlayer={deletePlayerAction}
      onPromoteGuest={promoteGuestAction}
    />
  );
}

/** Admin tab ("Verwaltung"): invites, players and today's guests. Others are sent to their account. */
export default function AdminPage() {
  return (
    <main className="flex flex-1 flex-col">
      <h1 className="sr-only">{de.nav.admin}</h1>
      <Suspense fallback={null}>
        <Admin />
      </Suspense>
    </main>
  );
}
