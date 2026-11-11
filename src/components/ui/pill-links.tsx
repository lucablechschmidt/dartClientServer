import Link from "next/link";
import { segmentClass, segmentTrack } from "./segmented";

/** A row of pills that are links (a filter the server renders, e.g. ?range=30d); the current one is filled. */
export function PillLinks({ label, items }: { label: string; items: { href: string; label: string; current: boolean }[] }) {
  return (
    <nav aria-label={label} className={segmentTrack}>
      {items.map((item) => (
        <Link key={item.href} href={item.href} aria-current={item.current ? "page" : undefined} className={segmentClass(item.current)}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
