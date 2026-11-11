import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountScreen } from "@/components/screens/account-screen";
import { de } from "@/i18n/de";
import { changePasswordAction, renameSelfAction } from "@/server/account-actions";
import { logoutAction } from "@/server/auth-actions";
import { requireSession } from "@/server/request";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: de.account.title };

async function Account() {
  const { session } = await requireSession();
  return (
    <AccountScreen
      session={session}
      texts={{ account: de.account, auth: de.auth, players: de.players, theme: de.theme }}
      onRename={renameSelfAction}
      onChangePassword={changePasswordAction}
      onLogout={logoutAction}
    />
  );
}

/** Account tab (M3): own name, password, logout, then the rows to rankings, statistics and achievements; the same for everyone. */
export default function AccountPage() {
  return (
    <main className="flex flex-1 flex-col">
      <h1 className="sr-only">{de.account.title}</h1>
      <Suspense fallback={<Skeleton label={de.ui.loading} />}>
        <Account />
      </Suspense>
    </main>
  );
}
