import { ThemePicker } from "@/components/ui/theme-picker";
import { de } from "@/i18n/de";
import { TokenTable } from "../theme/page";

export default function TokensPage() {
  return (
    <main className="p-3">
      <div className="flex items-center justify-between">
        <h1 className="text-fluid-lg">Tokens</h1>
        <ThemePicker labels={de.theme} />
      </div>
      <TokenTable />
    </main>
  );
}
