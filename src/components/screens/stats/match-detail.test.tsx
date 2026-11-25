import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { de } from "@/i18n/de";
import { MatchDetailScreen, type MatchDetailView } from "./match-detail";

const t = de.stats;
const visit = (darts: string[], points: number, rest: number, bust = false) => ({ darts, points, rest, bust });
const detail: MatchDetailView = {
  mode: "x01",
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

  it("splitscore: one row per round with its target, per player the change or halved, the score and the darts", () => {
    const split: MatchDetailView = {
      mode: "splitscore",
      id: "s1",
      finishedAt: 0,
      startScore: 40,
      players: detail.players,
      winners: ["b"],
      rounds: [
        {
          target: "15",
          cells: {
            a: { darts: ["15", "D15", "✕"], hit: true, change: 45, score: 85 },
            b: { darts: ["✕", "✕", "✕"], hit: false, change: -20, score: 20 },
          },
        },
        { target: "double", cells: { a: { darts: ["D5", "D3", "D4"], hit: true, change: 24, score: 109 } } },
      ],
    };
    render(<MatchDetailScreen detail={split} texts={t} back={de.ui.back} backHref="/history" />);
    const rows = within(screen.getByRole("table", { name: t.detail.rounds })).getAllByRole("row");
    expect(rows[0]).toHaveTextContent(`${t.detail.target}CaseySam`);
    expect(rows[1]).toHaveTextContent("15");
    expect(rows[1]).toHaveTextContent(`+45${t.detail.score.replace("{n}", "85")}15 D15 ✕`);
    expect(rows[1]).toHaveTextContent(`${t.detail.halved}${t.detail.score.replace("{n}", "20")}`);
    expect(rows[2]).toHaveTextContent(`${t.detail.targets.double}+24`);
    // the final row: each player's last score, also when the last round has none of theirs
    expect(rows.at(-1)).toHaveTextContent(`${t.detail.final}10920`);
    expect(screen.getByText(t.detail.matchWonBy.replace("{name}", "Sam"))).toBeInTheDocument();
  });
});
