import { Suspense } from "react";
import { AccountScreen } from "@/components/screens/account-screen";
import { MyStatsSection } from "@/components/screens/stats/my-stats";
import { AchievementsSection } from "@/components/screens/stats/achievements";
import { RankingsSection } from "@/components/screens/stats/rankings";
import type { StatsRange } from "@/domain/stats/aggregate";
import { de } from "@/i18n/de";
import { changePasswordAction, renameSelfAction } from "@/server/account-actions";
import { logoutAction } from "@/server/auth-actions";
import { requireSession } from "@/server/request";
import { myAchievements } from "@/server/achievement-service";
import { leaderboards, myStats } from "@/server/stats-service";

type Search = Promise<{ range?: string }>;
const RANGES: readonly StatsRange[] = ["all", "year", "30d"];
const rangeOf = (raw: string | undefined): StatsRange => RANGES.find((r) => r === raw) ?? "all";

async function Account({ searchParams }: { searchParams: Search }) {
  const { deps, session } = await requireSession();
  const range = rangeOf((await searchParams).range);
  return (
    <AccountScreen
      session={session}
      texts={{ account: de.account, auth: de.auth, players: de.players }}
      onRename={renameSelfAction}
      onChangePassword={changePasswordAction}
      onLogout={logoutAction}
      statistics={
        <>
          <MyStatsSection view={myStats(deps, session, range)} texts={de.stats} overviewTexts={de.overview} now={deps.now()} />
          <AchievementsSection items={myAchievements(deps, session)} texts={de.achievements} overviewTexts={de.overview} now={deps.now()} />
          <RankingsSection rankings={leaderboards(deps, session)} playerId={session.playerId} texts={de.stats} />
        </>
      }
    />
  );
}

/** Account tab (M3, M8): own statistics and rankings, own name, password, logout; the same for everyone. */
export default function AccountPage({ searchParams }: { searchParams: Search }) {
  return (
    <main className="flex flex-1 flex-col">
      <h1 className="sr-only">{de.account.title}</h1>
      <Suspense fallback={null}>
        <Account searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
