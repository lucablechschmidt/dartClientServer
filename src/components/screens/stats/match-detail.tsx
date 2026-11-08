import { BackButton } from "@/components/ui/back-button";
import { PageFrame } from "@/components/ui/page-frame";
import { SectionHeading } from "@/components/ui/form-controls";
import type { Texts } from "@/i18n/de";
import type { MatchDetail } from "@/server/stats-service";

/** The server's match page view. */
export type MatchDetailView = MatchDetail;

/**
 * X01 match page (M8): per leg one column per player with every visit (darts, points, rest after it),
 * the average at the bottom. Only for the match's players (the service checks that).
 */
export function MatchDetailScreen({
  detail,
  texts: t,
  back,
  backHref,
}: {
  detail: MatchDetailView;
  texts: Texts["stats"];
  back: string;
  backHref: string;
}) {
  const name = (id: string) => detail.players.find((p) => p.id === id)?.name ?? id;
  const sets = new Set(detail.legs.map((l) => l.setNo)).size > 1;
  const cell = "px-1 py-1.5 align-top";
  return (
    <div className="flex flex-1 flex-col bg-bg-grouped px-4 pb-4 text-fg">
      <PageFrame width="wide" className="gap-4">
        <div className="flex">
          <BackButton href={backHref} label={back} />
        </div>
        <div>
          <h1 className="text-title font-bold tracking-tight">{t.detail.title}</h1>
          <p className="text-sm text-fg-muted">{detail.players.map((p) => p.name).join(" · ")}</p>
        </div>
        {detail.legs.map((leg, i) => {
          const title = sets
            ? t.detail.setLeg.replace("{set}", String(leg.setNo)).replace("{leg}", String(leg.legNo))
            : t.detail.leg.replace("{n}", String(i + 1));
          const depth = Math.max(0, ...leg.rows.map((r) => r.visits.length));
          return (
            <section key={`${leg.setNo}-${leg.legNo}`} className="flex flex-col gap-2">
              <SectionHeading>{title}</SectionHeading>
              {leg.winner && <p className="px-4 text-sm text-fg-muted">{t.detail.wonBy.replace("{name}", name(leg.winner))}</p>}
              <div className="rounded-panel bg-card-bg px-3 py-1">
                <table aria-label={title} className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="text-xs text-fg-muted">
                      {leg.rows.map((r) => (
                        <th
                          key={r.player}
                          className={`${cell} truncate text-left ${r.player === leg.winner ? "font-semibold text-fg" : ""}`}
                        >
                          {name(r.player)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: depth }, (_, v) => (
                      <tr key={v} className="border-t border-separator">
                        {leg.rows.map((r) => {
                          const x = r.visits.at(v);
                          return (
                            <td key={r.player} className={cell}>
                              {x && (
                                <span className="flex flex-col">
                                  <span className="font-semibold tabular-nums">
                                    {x.bust ? t.detail.bust : x.points}
                                    <span className="pl-2 text-xs font-normal text-fg-muted">
                                      {t.detail.rest.replace("{n}", String(x.rest))}
                                    </span>
                                  </span>
                                  <span className="text-xs text-fg-muted">{x.darts.join(" ")}</span>
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr className="border-t border-separator text-xs text-fg-muted">
                      {leg.rows.map((r) => (
                        <td key={r.player} className={cell}>
                          {t.detail.average} <span className="font-semibold text-fg tabular-nums">{r.average.toFixed(2)}</span>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </PageFrame>
    </div>
  );
}
