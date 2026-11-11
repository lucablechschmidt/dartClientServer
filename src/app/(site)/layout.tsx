import { Suspense } from "react";
import { GameControllerIcon, PersonCircleIcon, PersonIcon, WrenchIcon } from "@/components/ui/icons";
import { TabBar, type TabItem } from "@/components/ui/tab-bar";
import { de } from "@/i18n/de";
import { currentSession } from "@/server/request";

const TABS: TabItem[] = [
  { href: "/", label: de.nav.newGame, icon: <GameControllerIcon className="h-full w-full" /> },
  { href: "/players", label: de.nav.players, icon: <PersonIcon className="h-full w-full" /> },
  { href: "/account", label: de.nav.account, icon: <PersonCircleIcon className="h-full w-full" /> },
];
const ADMIN_TAB: TabItem = { href: "/admin", label: de.nav.admin, icon: <WrenchIcon className="h-full w-full" /> };

/** The admin tab only for admins; reads the session, so it waits for the request. */
async function MainTabs() {
  const session = await currentSession();
  return <TabBar label={de.nav.main} items={session?.isAdmin ? [...TABS, ADMIN_TAB] : TABS} />;
}

/** The two tabs of the legacy HomeView, the account tab (M3) and for admins "Verwaltung". Setup and scoring screen have no tab bar. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col pt-safe">
      {/* Only this area scrolls; the tab bar stays below it. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
      <Suspense fallback={<TabBar label={de.nav.main} items={TABS} />}>
        <MainTabs />
      </Suspense>
    </div>
  );
}
