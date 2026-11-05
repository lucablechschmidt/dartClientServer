import type { ReactNode } from "react";

/**
 * The keypad area of the scoring screen with an optional line below it (the next player, or whose
 * turn it is on another device); the keypad gives up the height of that line.
 */
export function KeypadArea({ keypad, note }: { keypad: ReactNode; note: string | null }) {
  if (note === null) return <div className="h-full px-3 pb-3">{keypad}</div>;
  return (
    <div className="flex h-full flex-col gap-2 px-3 pb-3">
      <div className="min-h-0 flex-1">{keypad}</div>
      <p className="text-center text-fluid-sm text-fg-muted">{note}</p>
    </div>
  );
}
