import { GameControllerIcon, PersonCircleIcon, PersonIcon } from "@/components/ui/icons";
import { TabBar } from "@/components/ui/tab-bar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { de } from "@/i18n/de";

/** The two tabs of the legacy HomeView plus "Konto" (account, M3). Setup and scoring screen have no tab bar. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col pt-safe">
      {/* Only this area scrolls; the tab bar stays below it. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex justify-end px-3 pt-2">
          <ThemeToggle labels={{ label: de.theme.label, system: de.theme.system, light: de.theme.light, dark: de.theme.dark }} />
        </div>
        {children}
      </div>
      <TabBar
        label={de.nav.main}
        items={[
          { href: "/", label: de.nav.newGame, icon: <GameControllerIcon className="h-full w-full" /> },
          { href: "/players", label: de.nav.players, icon: <PersonIcon className="h-full w-full" /> },
          { href: "/account", label: de.nav.account, icon: <PersonCircleIcon className="h-full w-full" /> },
        ]}
      />
    </div>
  );
}
