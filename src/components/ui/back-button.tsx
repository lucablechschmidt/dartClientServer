import Link from "next/link";
import { ChevronLeftCircleIcon } from "./icons";

/** The back button of all legacy screens: `chevron.left.circle` in `.title`, top left. */
export function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} className="grid min-h-touch min-w-touch place-items-center text-fg">
      <ChevronLeftCircleIcon className="h-8 w-8" />
    </Link>
  );
}
