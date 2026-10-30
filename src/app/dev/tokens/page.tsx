import { ThemeToggle } from "@/components/ui/theme-toggle";
import { de } from "@/i18n/de";
import { TokenTable } from "../theme/page";

export default function TokensPage() {
  return (
    <main className="p-3">
      <div className="flex items-center justify-between">
        <h1 className="text-fluid-lg">Tokens</h1>
        <ThemeToggle labels={{ label: de.theme.label, system: de.theme.system, light: de.theme.light, dark: de.theme.dark }} />
      </div>
      <TokenTable />
    </main>
  );
}
