import type { ReactNode } from "react";

/**
 * An earned or open award (M10): icon, name and a line below (when earned, or how to get it); open ones
 * are muted. Extra content (a progress bar) follows below the line.
 */
export function Badge({
  icon,
  name,
  line,
  earned,
  children,
}: {
  icon: ReactNode;
  name: string;
  line: string;
  earned: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span
        className={`grid size-icon-box shrink-0 place-items-center rounded-full ${earned ? "bg-accent-soft text-accent" : "bg-fill text-fg-muted"}`}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={`font-semibold ${earned ? "text-fg" : "text-fg-muted"}`}>{name}</span>
        <span className="text-sm text-fg-muted">{line}</span>
        {children}
      </span>
    </div>
  );
}
