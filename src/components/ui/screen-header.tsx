import type { ReactNode } from "react";

type Props = { left?: ReactNode; title?: ReactNode; right?: ReactNode };

/**
 * Header row of the legacy screens: back button on the left, title or action in the middle,
 * an equally wide placeholder on the right so the middle is truly centered.
 */
export function ScreenHeader({ left, title, right }: Props) {
  return (
    <header className="header-grid min-h-touch px-3 py-1">
      <div className="justify-self-start">{left}</div>
      <div className="text-center text-fluid-lg">{title}</div>
      <div className="justify-self-end">{right}</div>
    </header>
  );
}
