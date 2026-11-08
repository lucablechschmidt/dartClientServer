import { Suspense } from "react";
import { SubPage } from "@/components/screens/account/sub-page";
import { AchievementsSection } from "@/components/screens/stats/achievements";
import { de } from "@/i18n/de";
import { myAchievements } from "@/server/achievement-service";
import { requireSession } from "@/server/request";
import { Skeleton } from "@/components/ui/skeleton";

async function Achievements() {
  const { deps, session } = await requireSession();
  return <AchievementsSection items={myAchievements(deps, session)} texts={de.achievements} overviewTexts={de.overview} now={deps.now()} />;
}

/** M10: the own achievements, below the account tab. */
export default function AchievementsPage() {
  return (
    <main className="flex flex-1 flex-col">
      <SubPage title={de.account.pages.achievements} back={de.ui.back}>
        <Suspense fallback={<Skeleton label={de.ui.loading} inline />}>
          <Achievements />
        </Suspense>
      </SubPage>
    </main>
  );
}
