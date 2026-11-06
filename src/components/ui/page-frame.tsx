import type { ReactNode } from "react";

/** The two column widths of the tab pages (theme.md §4): lists and forms narrow, statistics wide. */
const WIDTH = { narrow: "max-w-page", wide: "max-w-page-wide" } as const;

export type PageWidth = keyof typeof WIDTH;

/** Classes of the centred page column, for parts that cannot be a `PageFrame` (the setup's sticky start button). */
export const pageColumn = (width: PageWidth = "narrow") => `mx-auto w-full ${WIDTH[width]}`;

/**
 * The centred column every tab page puts its content in: back button, heading, section labels and cards
 * share its edges, so nothing sits at the far left of a desktop window while the cards are centred.
 * The page around it keeps the background and the side padding.
 */
export function PageFrame({ width = "narrow", className = "", children }: { width?: PageWidth; className?: string; children: ReactNode }) {
  return <div className={`flex flex-col ${pageColumn(width)} ${className}`}>{children}</div>;
}
