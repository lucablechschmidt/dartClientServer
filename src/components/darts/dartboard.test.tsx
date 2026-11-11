import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { FieldCount } from "@/domain/stats/field-hits";
import { de } from "@/i18n/de";
import { BOARD_ORDER, Dartboard, heatStep } from "./dartboard";

const t = de.stats;
const c = (single = 0, double = 0, triple = 0, unsplit = 0): FieldCount => ({ single, double, triple, unsplit });
const hits: [number, FieldCount][] = [
  [20, c(3, 3, 2)], // weighted 15
  [25, c(1, 1)], // 3
  [1, c(0, 0, 0, 1)], // 1, saved before the split
];
const button = (label: string, n: number) => screen.getByRole("button", { name: `${label}: ${t.hits.replace("{n}", String(n))}` });

describe("Dartboard heatmap (M8)", () => {
  it("board order clockwise from the top, every field once", () => {
    expect(BOARD_ORDER[0]).toBe(20);
    expect([...BOARD_ORDER].sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it("heat steps: none 0, then 1–5 by share of the most hit field", () => {
    expect([heatStep(0, 10), heatStep(1, 10), heatStep(5, 10), heatStep(10, 10), heatStep(3, 0)]).toEqual([0, 1, 3, 5, 0]);
  });

  it("a table with every hit field and its split for screen readers, most hits first", () => {
    render(<Dartboard hits={hits} texts={t} />);
    const rows = within(screen.getByRole("table", { name: t.fieldHits })).getAllByRole("row");
    expect(rows).toHaveLength(4);
    expect(rows[1]).toHaveTextContent("2033215");
  });

  it("a tap shows single, double and triple; the same field again or a tap elsewhere goes back to the colours", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Dartboard hits={hits} texts={t} />
        <button type="button">elsewhere</button>
      </div>,
    );
    expect(screen.getByText(t.tapField)).toBeInTheDocument();
    await user.click(button(`${t.field} 20`, 15));
    expect(button(`${t.field} 20`, 15)).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("group", { name: t.rings.single })).toHaveTextContent("3");
    expect(screen.getByRole("group", { name: t.rings.double })).toHaveTextContent("3");
    expect(screen.getByRole("group", { name: t.rings.triple })).toHaveTextContent("2");
    await user.click(button(`${t.field} 20`, 15));
    expect(screen.getByText(t.tapField)).toBeInTheDocument();

    await user.click(button(t.bull, 3));
    expect(screen.getByRole("group", { name: t.bullRings.double })).toHaveTextContent("1");
    expect(screen.queryByRole("group", { name: t.rings.triple })).toBeNull();
    await user.click(screen.getByRole("button", { name: "elsewhere" }));
    expect(screen.getByText(t.tapField)).toBeInTheDocument();
  });

  it("hits saved before the split are named apart", async () => {
    const user = userEvent.setup();
    render(<Dartboard hits={hits} texts={t} />);
    await user.click(button(`${t.field} 1`, 1));
    expect(screen.getByText(t.unsplit.replace("{n}", "1"))).toBeInTheDocument();
  });
});
