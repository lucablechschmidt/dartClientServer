import Link from "next/link";
import { segmentClass, segmentTrack } from "./segmented";

/**
 * A row of pills that are links (a filter the server renders, e.g. ?range=30d); the current one is filled.
 * More pills than fit (the history's five modes on a phone) scroll sideways instead of squeezing.
 */
export function PillLinks({ label, items }: { label: string; items: { href: string; label: string; current: boolean }[] }) {
  return (
    <nav aria-label={label} className={`${segmentTrack} overflow-x-auto`}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.current ? "page" : undefined}
          scroll={false}
          className={`shrink-0 ${segmentClass(item.current)}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
