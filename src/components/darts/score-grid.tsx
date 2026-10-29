import type { ReactNode } from "react";

export type ScoreGridProps = {
  header: ReactNode;
  panels: ReactNode;
  hint: ReactNode;
  keypad: ReactNode;
};

/**
 * The layout of the scoring screen (docs/theme.md §3): fills the viewport, never scrolls,
 * rearranges itself in landscape. Knows no game state.
 */
export function ScoreGrid({ header, panels, hint, keypad }: ScoreGridProps) {
  return (
    <div className="score-grid bg-bg text-fg">
      <div data-slot="header">{header}</div>
      <div data-slot="panels">{panels}</div>
      <div data-slot="hint">{hint}</div>
      <div data-slot="keypad">{keypad}</div>
    </div>
  );
}
