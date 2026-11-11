import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRightIcon } from "./icons";
import { PageFrame, type PageWidth } from "./page-frame";

/** Gray page area that holds cards (iOS `List` on systemGroupedBackground); `className` styles the centred column inside. */
export function GroupedSection({ children, className = "", width }: { children: ReactNode; className?: string; width?: PageWidth }) {
  return (
    <section className="flex-1 bg-bg-grouped px-4 py-5">
      <PageFrame width={width} className={className}>
        {children}
      </PageFrame>
    </section>
  );
}

const cardTones = { card: "bg-card-bg", fill: "bg-fill" } as const;

/**
 * Card with rounded corners; its children are `CardRow`s. `card`: white on the gray page area
 * (GroupedSection); `fill`: gray on the plain page (victory screen).
 */
export function CardList({
  children,
  label,
  tone = "card",
  className = "",
}: {
  children: ReactNode;
  label?: string;
  tone?: keyof typeof cardTones;
  className?: string;
}) {
  return (
    <ul aria-label={label} className={`w-full rounded-panel px-4 text-fg ${cardTones[tone]} ${className}`}>
      {children}
    </ul>
  );
}

/**
 * A row of facts: an optional lead (place), a title with a muted line below, a value on the right
 * (players on the victory screen).
 */
export function DetailRow({ lead, title, detail, value }: { lead?: ReactNode; title: string; detail?: string; value?: ReactNode }) {
  return (
    <CardRow>
      <span className="flex min-w-0 items-center gap-4">
        {lead !== undefined && <span className="w-4 shrink-0 text-sm text-fg-muted tabular-nums">{lead}</span>}
        <span className="flex min-w-0 flex-col">
          <span className="truncate">{title}</span>
          {detail && <span className="text-sm text-fg-muted tabular-nums">{detail}</span>}
        </span>
      </span>
      {value !== undefined && <span className="shrink-0 font-semibold tabular-nums">{value}</span>}
    </CardRow>
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

/** A row that opens another page: label, optional detail on the right, a chevron (account → statistics …). */
export function CardLinkRow({ href, label, detail }: { href: string; label: string; detail?: string }) {
  return (
    <li className="list-none border-b border-separator last:border-b-0">
      <Link href={href} className="tap-row flex min-h-row items-center justify-between gap-3 tap-feedback py-2">
        <span className="font-medium">{label}</span>
        <span className="flex items-center gap-2 text-sm text-fg-muted">
          {detail}
          <ChevronRightIcon className="size-icon-sm" />
        </span>
      </Link>
    </li>
  );
}
