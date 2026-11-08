import { FoldCard } from "@/components/ui/fold-card";
import type { Texts } from "@/i18n/de";
import type { ModeRanking } from "@/server/stats-service";

/** One ranking per mode as the server builds it. */
export type ModeRankingView = ModeRanking;

/**
 * The rankings per mode on /account/rankings (M8): a folded card each, showing only the own place and
 * Elo; open, everyone with place, name, Elo and games, the own row marked. Visible to everyone.
 */
export function RankingsSection({
  rankings,
  playerId,
  texts: t,
}: {
  rankings: ModeRankingView[];
  playerId: string;
  texts: Texts["stats"];
}) {
  const cell = "px-2 py-2 text-left";
  const num = "px-2 py-2 text-right tabular-nums";
  return (
    <div className="flex flex-col gap-3">
      {rankings.map(({ mode, rows, own }) => {
        const title = t.ranking.replace("{mode}", t.modes[mode]);
        return (
          <FoldCard
            key={mode}
            title={t.modes[mode]}
            summary={own ? t.ownRank.replace("{place}", String(own.place)).replace("{elo}", String(own.elo)) : t.notRanked}
          >
            {rows.length === 0 ? (
              <p className="px-4 text-sm text-fg-muted">{t.nobody}</p>
            ) : (
              <div className="rounded-panel bg-card-bg px-2">
                <table aria-label={title} className="w-full text-sm">
                  <thead className="text-xs text-fg-muted">
                    <tr>
                      <th className={cell}>{t.columns.place}</th>
                      <th className={`${cell} w-full`}>{t.columns.name}</th>
                      <th className={num}>{t.columns.elo}</th>
                      <th className={num}>{t.columns.games}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.player}
                        aria-current={r.player === playerId ? "true" : undefined}
                        className={`border-t border-separator ${r.player === playerId ? "font-semibold text-accent" : ""}`}
                      >
                        <td className={num}>{r.place}</td>
                        <td className={`${cell} max-w-0 truncate`}>{r.name}</td>
                        <td className={num}>{r.elo}</td>
                        <td className={num}>{r.games}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </FoldCard>
        );
      })}
    </div>
  );
}
