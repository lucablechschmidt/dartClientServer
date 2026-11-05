import Link from "next/link";

/** A row of pills that are links (a filter the server renders, e.g. ?range=30d); the current one is filled. */
export function PillLinks({ label, items }: { label: string; items: { href: string; label: string; current: boolean }[] }) {
  return (
    <nav aria-label={label} className="flex gap-1 rounded-full bg-fill p-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.current ? "page" : undefined}
          className={`flex min-h-touch flex-1 items-center justify-center rounded-full px-3 text-sm font-medium whitespace-nowrap ${item.current ? "bg-card-bg text-fg shadow-floating" : "text-fg-muted"}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
