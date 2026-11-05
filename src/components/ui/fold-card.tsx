"use client";

import { useState, type ReactNode } from "react";
import { DisclosureChevron } from "./choice-menu";

/**
 * A card that folds to one line: title left, a short summary (e.g. "3 ausgewählt") and the chevron
 * right; open, its content follows below. Tournament players, the admin's games and tournaments.
 */
export function FoldCard({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-touch items-center justify-between gap-3 rounded-panel bg-card-bg px-4 py-3 text-left"
      >
        <span className="font-semibold">{title}</span>
        <span className="flex items-center gap-2 text-sm text-fg-muted">
          {summary}
          <DisclosureChevron open={open} />
        </span>
      </button>
      {open && children}
    </div>
  );
}
