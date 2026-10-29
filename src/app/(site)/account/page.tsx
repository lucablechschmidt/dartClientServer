import { Suspense } from "react";
import { AccountScreen } from "@/components/screens/account-screen";
import { de } from "@/i18n/de";
import { changePasswordAction, renameSelfAction } from "@/server/account-actions";
import { createPasswordInviteAction, createRegisterInviteAction, promoteGuestAction } from "@/server/admin-actions";
import { logoutAction } from "@/server/auth-actions";
import { deletePlayerAction } from "@/server/player-actions";
import { listPlayers } from "@/server/player-service";
import { requireSession } from "@/server/request";

async function Account() {
  const { deps, session } = await requireSession();
  return (
    <AccountScreen
      session={session}
      players={session.isAdmin ? listPlayers(deps) : []}
      texts={{ account: de.account, auth: de.auth, players: de.players }}
      onRename={renameSelfAction}
      onChangePassword={changePasswordAction}
      onLogout={logoutAction}
      admin={{
        onCreateInvite: createRegisterInviteAction,
        onCreatePasswordInvite: createPasswordInviteAction,
        onDeletePlayer: deletePlayerAction,
        onPromoteGuest: promoteGuestAction,
      }}
    />
  );
}

/** "Konto" (account) tab (M3): own name, password, logout; for the admin also invites and management. */
export default function AccountPage() {
  return (
    <main className="flex flex-1 flex-col">
      <h1 className="sr-only">{de.account.title}</h1>
      <Suspense fallback={null}>
        <Account />
      </Suspense>
    </main>
  );
}
