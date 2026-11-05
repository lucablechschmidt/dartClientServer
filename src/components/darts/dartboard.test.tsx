import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { de } from "@/i18n/de";
import { BOARD_ORDER, Dartboard, heatStep } from "./dartboard";

const t = de.stats;

describe("Dartboard heatmap (M8)", () => {
  it("board order clockwise from the top, every field once", () => {
    expect(BOARD_ORDER[0]).toBe(20);
    expect([...BOARD_ORDER].sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it("heat steps: none 0, then 1–5 by share of the most hit field", () => {
    expect([heatStep(0, 10), heatStep(1, 10), heatStep(5, 10), heatStep(10, 10), heatStep(3, 0)]).toEqual([0, 1, 3, 5, 0]);
  });

  it("a table with every hit field for screen readers; tapping a field names its hits", async () => {
    const user = userEvent.setup();
    render(
      <Dartboard
        hits={[
          [20, 15],
          [25, 2],
          [1, 1],
        ]}
        texts={t}
      />,
    );
    const table = screen.getByRole("table", { name: t.fieldHits });
    expect(within(table).getAllByRole("row")).toHaveLength(4); // header + three fields, most hits first
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent("2015");
    await user.click(screen.getByRole("button", { name: `${t.field} 20: ${t.hits.replace("{n}", "15")}` }));
    expect(screen.getByText(`${t.field} 20 · ${t.hits.replace("{n}", "15")}`)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: `${t.bull}: ${t.hits.replace("{n}", "2")}` }));
    expect(screen.getByText(`${t.bull} · ${t.hits.replace("{n}", "2")}`)).toBeInTheDocument();
  });
});
