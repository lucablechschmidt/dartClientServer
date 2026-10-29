import type { ReactNode } from "react";

/** Gray page area that holds cards (iOS `List` on systemGroupedBackground). */
export function GroupedSection({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`flex-1 bg-bg-grouped px-4 py-5 ${className}`}>{children}</section>;
}

/** White card with rounded corners; its children are `CardRow`s. */
export function CardList({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <ul aria-label={label} className="mx-auto w-full max-w-xl rounded-panel bg-card-bg px-4 text-fg">
      {children}
    </ul>
  );
}

/**
 * A list row with a separator line to the next one. `interactive` turns the whole row into a button
 * (player selection); otherwise it is a container (player list with the wrench on the right).
 */
export function CardRow({
  children,
  onClick,
  pressed,
  label,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  pressed?: boolean;
  label?: string;
  className?: string;
}) {
  const row = `flex min-h-row w-full items-center justify-between gap-3 border-b border-separator py-2 last:border-b-0 ${className}`;
  if (onClick) {
    return (
      <li className="list-none">
        <button type="button" onClick={onClick} aria-pressed={pressed} aria-label={label} className={`${row} text-left`}>
          {children}
        </button>
      </li>
    );
  }
  return <li className={row}>{children}</li>;
}
