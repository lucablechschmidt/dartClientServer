import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { de } from "@/i18n/de";
import { MatchDetailScreen, type MatchDetailView } from "./match-detail";

const t = de.stats;
const visit = (darts: string[], points: number, rest: number, bust = false) => ({ darts, points, rest, bust });
const detail: MatchDetailView = {
  id: "m1",
  finishedAt: 0,
  startScore: 301,
  players: [
    { id: "a", name: "Casey" },
    { id: "b", name: "Sam" },
  ],
  legs: [
    {
      setNo: 1,
      legNo: 1,
      winner: "a",
      rows: [
        { player: "a", visits: [visit(["T20", "T20", "T20"], 180, 121), visit(["T20", "T20", "1"], 121, 0)], average: 150.5 },
        { player: "b", visits: [visit(["20", "20", "✕"], 0, 301, true)], average: 0 },
      ],
    },
  ],
};

describe("MatchDetailScreen (M8)", () => {
  it("per leg a table: one column per player, every visit with points and rest, a bust named, averages at the bottom", () => {
    render(<MatchDetailScreen detail={detail} texts={t} back={de.ui.back} backHref="/account" />);
    const table = screen.getByRole("table", { name: t.detail.leg.replace("{n}", "1") });
    const rows = within(table).getAllByRole("row");
    expect(rows[0]).toHaveTextContent("CaseySam");
    expect(rows[1]).toHaveTextContent("180");
    expect(rows[1]).toHaveTextContent(t.detail.rest.replace("{n}", "121"));
    expect(rows[1]).toHaveTextContent(t.detail.bust);
    expect(rows[2]).toHaveTextContent("121");
    expect(rows.at(-1)).toHaveTextContent("150.50");
    expect(screen.getByText(t.detail.wonBy.replace("{name}", "Casey"))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: de.ui.back })).toHaveAttribute("href", "/account");
  });
});
