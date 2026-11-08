import { screen } from "@testing-library/react";

/**
 * Test queries that follow the visible strings (WCAG 2.5.3 label in name, m13-plan R-29): controls are
 * named by what they show, so tests find them the same way.
 */

/** A player's row in a setup: the button that shows the name (selected ones also show their position). */
export function playerRow(name: string): HTMLElement {
  const row = queryPlayerRow(name);
  if (!row) throw new Error(`no player row for ${name}`);
  return row;
}

export const queryPlayerRow = (name: string): HTMLElement | null => screen.queryByText(name, { exact: true })?.closest("button") ?? null;

/** Name of a choice menu trigger: its label and the chosen value, as both are shown ("Startpunktzahl 501"). */
export const choiceName = (label: string, value: string | number) => `${label} ${String(value)}`;
