"use client";

import { useCallback, useId, useRef, useState, type ReactNode } from "react";
import { useDismiss } from "./use-dismiss";

/**
 * A button that opens a small floating panel below it (rules in the setup). Not modal: a tap
 * outside or Escape closes it, Escape gives the focus back. The trigger is a disclosure
 * (aria-expanded/aria-controls), the panel a named region with its title as heading.
 */
export function Popover({
  label,
  icon,
  title,
  children,
}: {
  /** The trigger's accessible name (it only shows an icon). */
  label: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const titleId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, root, close, trigger);
  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="grid min-h-touch min-w-touch place-items-center text-accent"
      >
        {icon}
      </button>
      {open && (
        <section
          id={panelId}
          aria-labelledby={titleId}
          className="absolute top-full right-0 z-30 mt-1 flex max-h-popover-h w-popover origin-top-right flex-col gap-2 overflow-y-auto rounded-panel bg-card-bg p-4 text-fg shadow-floating motion-safe:animate-pop-in"
        >
          <h2 id={titleId} className="font-semibold">
            {title}
          </h2>
          <div className="text-sm">{children}</div>
        </section>
      )}
    </div>
  );
}
