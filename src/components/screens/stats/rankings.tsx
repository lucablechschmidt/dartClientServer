import { FoldCard } from "@/components/ui/fold-card";
import type { Texts } from "@/i18n/de";
import type { ModeRanking } from "@/server/stats-service";
import { RankingDetail } from "./ranking-detail";

/** One ranking per mode as the server builds it. */
export type ModeRankingView = ModeRanking;

type Props = {
  rankings: ModeRankingView[];
  playerId: string;
  texts: Texts["stats"];
  overviewTexts: Texts["overview"];
  now: number;
};

/**
 * The rankings per mode on /account/rankings (M8): a folded card each, showing only the own place and
 * Elo; open, the Elo over time and everyone with place, name, Elo and games (`RankingDetail`). Visible
 * to everyone.
 */
export function RankingsSection({ rankings, playerId, texts: t, overviewTexts, now }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {rankings.map((ranking) => {
        const { mode, rows, own } = ranking;
        return (
          <FoldCard
            key={mode}
            title={t.modes[mode]}
            summary={own ? t.ownRank.replace("{place}", String(own.place)).replace("{elo}", String(own.elo)) : t.notRanked}
          >
            {rows.length === 0 ? (
              <p className="px-4 text-sm text-fg-muted">{t.nobody}</p>
            ) : (
              <RankingDetail ranking={ranking} playerId={playerId} texts={t} overviewTexts={overviewTexts} now={now} />
            )}
          </FoldCard>
        );
      })}
    </div>
  );
}
