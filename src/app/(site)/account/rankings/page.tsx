import { Suspense } from "react";
import { SubPage } from "@/components/screens/account/sub-page";
import { RankingsSection } from "@/components/screens/stats/rankings";
import { de } from "@/i18n/de";
import { requireSession } from "@/server/request";
import { leaderboards } from "@/server/stats-service";

async function Rankings() {
  const { deps, session } = await requireSession();
  return <RankingsSection rankings={leaderboards(deps, session)} playerId={session.playerId} texts={de.stats} />;
}

/** M8: the rankings per mode, for everyone, below the account tab. */
export default function RankingsPage() {
  return (
    <main className="flex flex-1 flex-col">
      <SubPage title={de.account.pages.rankings} back={de.ui.back} width="wide">
        <Suspense fallback={null}>
          <Rankings />
        </Suspense>
      </SubPage>
    </main>
  );
}
