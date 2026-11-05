import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { de } from "@/i18n/de";
import { MyStatsSection, type MyStatsView } from "./my-stats";

const t = de.stats;
const view: MyStatsView = {
  range: "30d",
  records: { x01: { games: 3, wins: 2 }, cricket: { games: 1, wins: 0 } },
  x01: {
    visits: 4,
    points: 441,
    average: 110.25,
    first9: 93.333,
    count180: 1,
    count140: 1,
    count100: 1,
    highestFinish: 161,
    highestScore: 180,
    bestLeg: { 501: 15, 301: 9 },
    legsWon: 2,
  },
  history: [],
  fieldHits: [],
  recent: [{ id: "m1", mode: "x01", names: ["Casey", "Sam"], finishedAt: 0, place: 1, detail: true }],
};
const props = { texts: t, overviewTexts: de.overview, now: 60_000 };

describe("MyStatsSection", () => {
  it("tiles with the figures, rounded, best leg per start score", () => {
    render(<MyStatsSection view={view} {...props} />);
    const tile = (label: string) => screen.getByRole("group", { name: label });
    expect(tile(t.games)).toHaveTextContent("4");
    expect(tile(t.wins)).toHaveTextContent("2");
    expect(tile(t.average)).toHaveTextContent("110.25");
    expect(tile(t.first9)).toHaveTextContent("93.33");
    expect(tile(t.highestFinish)).toHaveTextContent("161");
    expect(tile(t.bestLeg.replace("{start}", "501"))).toHaveTextContent(t.darts.replace("{n}", "15"));
    expect(tile(t.bestLeg.replace("{start}", "301"))).toHaveTextContent(t.darts.replace("{n}", "9"));
  });

  it("range pills as links, the chosen one marked", () => {
    render(<MyStatsSection view={view} {...props} />);
    const pills = screen.getByRole("navigation", { name: t.range });
    expect(within(pills).getByRole("link", { name: t.ranges["30d"] })).toHaveAttribute("aria-current", "page");
    expect(within(pills).getByRole("link", { name: t.ranges.all })).toHaveAttribute("href", "/account?range=all");
  });

  it("recent games link to the match page; without games a hint", () => {
    const { unmount } = render(<MyStatsSection view={view} {...props} />);
    expect(screen.getByRole("link", { name: /Casey · Sam/ })).toHaveAttribute("href", "/match/m1/stats");
    unmount();
    render(<MyStatsSection view={{ ...view, records: {}, recent: [], x01: { ...view.x01, visits: 0 } }} {...props} />);
    expect(screen.getByText(t.none)).toBeInTheDocument();
  });
});
