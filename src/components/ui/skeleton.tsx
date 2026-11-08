import { PageFrame, type PageWidth } from "./page-frame";

type Props = {
  /** Announced once as busy (de.ui.loading). */
  label: string;
  rows?: number;
  width?: PageWidth;
  /** Only the card, inside a page that already has its frame and heading (SubPage). */
  inline?: boolean;
};

/**
 * R-04 (m13-plan.md): what a page shows while its data loads (session check and SQLite reads), instead
 * of an empty area: a heading bar and a card of rows in the page column, pulsing. It fades in only
 * after --delay-skeleton, so a page that loads quickly shows nothing instead of a flicker; with reduced
 * motion it is there at once and does not pulse (theme.md §5).
 */
export function Skeleton({ label, rows = 4, width = "narrow", inline = false }: Props) {
  const status = { role: "status", "aria-label": label, "aria-busy": true } as const;
  const card = (
    <span className="flex flex-col rounded-panel bg-card-bg px-4">
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="flex min-h-touch items-center">
          <span className="h-4 w-2/3 rounded-box bg-fill" />
        </span>
      ))}
    </span>
  );
  if (inline)
    return (
      <div {...status} className="flex flex-col motion-safe:animate-skeleton-in">
        <div className="flex flex-col motion-safe:animate-pulse">{card}</div>
      </div>
    );
  return (
    <div {...status} className="flex flex-1 flex-col px-4 pt-2 motion-safe:animate-skeleton-in">
      <PageFrame width={width} className="gap-3 motion-safe:animate-pulse">
        <span className="h-8 w-1/2 rounded-box bg-fill-strong" />
        {card}
      </PageFrame>
    </div>
  );
}
