"use client";

import { useState, type ReactNode } from "react";
import { DisclosureChevron } from "@/components/ui/choice-menu";

/**
 * Player choice that folds away (tournament setup): one card line "Spieler auswählen · n ausgewählt",
 * open it shows the picker below, guest row included. Open at first, the line toggles it.
 */
export function PlayersCard({ title, count, children }: { title: string; count: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
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
          {count}
          <DisclosureChevron open={open} />
        </span>
      </button>
      {open && children}
    </div>
  );
}
