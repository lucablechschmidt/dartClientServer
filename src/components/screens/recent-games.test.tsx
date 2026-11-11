import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { de } from "@/i18n/de";
import { HistoryScreen, summary, type RecentMatchItem } from "./recent-games";

const o = de.overview;
const now = 10_000_000_000;
const weekStart = now - 2 * 86_400_000;
const game = (g: Partial<RecentMatchItem> & Pick<RecentMatchItem, "id" | "result">): RecentMatchItem => ({
  mode: "x01",
  startScore: 501,
  names: ["Luca", "Mara"],
  winners: [],
  endedAt: now,
  ...g,
});

describe("summary (the start screen's 'Zuletzt: …')", () => {
  it("1 vs 1, best of, 3+ players, cancelled", () => {
    expect(summary(game({ id: "a", winners: ["Luca"], result: { kind: "winner", winner: "Luca" } }), o)).toBe("Luca gewinnt gegen Mara");
    expect(summary(game({ id: "b", winners: ["Mara"], result: { kind: "score", winner: "Mara", unit: "legs", score: [2, 1] } }), o)).toBe(
      "Mara gewinnt gegen Luca 2:1",
    );
    const places: RecentMatchItem["result"] = {
      kind: "places",
      order: [
        { player: "Finn", place: 1 },
        { player: "Luca", place: 2 },
        { player: "Mara", place: 3 },
      ],
    };
    expect(summary(game({ id: "c", names: ["Luca", "Mara", "Finn"], winners: ["Finn"], result: places }), o)).toBe(
      "Finn gewinnt vor Luca und Mara",
    );
    expect(summary(game({ id: "d", result: { kind: "abandoned" } }), o)).toBe("Luca, Mara · abgebrochen");
  });
});

describe("HistoryScreen", () => {
  const games = [
    game({ id: "new", winners: ["Mara"], endedAt: now - 3_600_000, result: { kind: "winner", winner: "Mara" } }),
    game({ id: "old", mode: "cricket", winners: ["Luca"], endedAt: weekStart - 1, result: { kind: "winner", winner: "Luca" } }),
  ];

  it("groups by this week and older, the winner in bold, mode and time below", () => {
    render(<HistoryScreen games={games} mode={null} weekStart={weekStart} moreHref={null} now={now} texts={o} modes={de.gameMenu.modes} />);
    const week = screen.getByRole("list", { name: o.thisWeek });
    const older = screen.getByRole("list", { name: o.older });
    expect(within(week).getByRole("link")).toHaveAttribute("href", "/match/new");
    expect([...within(week).getByRole("link").querySelectorAll("strong")].map((b) => b.textContent)).toEqual(["Mara"]);
    expect(within(week).getByRole("link")).toHaveTextContent("Classic 501");
    expect(within(older).getByRole("link")).toHaveTextContent(de.gameMenu.modes.cricket);
    expect(screen.queryByRole("link", { name: o.more })).toBeNull();
  });

  it("filter pills per mode, the current one marked; more on request; nothing found", () => {
    const { rerender } = render(
      <HistoryScreen
        games={games}
        mode="cricket"
        weekStart={weekStart}
        moreHref="/history?mode=cricket&n=50"
        now={now}
        texts={o}
        modes={de.gameMenu.modes}
      />,
    );
    const filter = screen.getByRole("navigation", { name: o.filter });
    expect(within(filter).getByRole("link", { name: o.modesShort.cricket })).toHaveAttribute("aria-current", "page");
    expect(within(filter).getByRole("link", { name: o.all })).toHaveAttribute("href", "/history");
    expect(screen.getByRole("link", { name: o.more })).toHaveAttribute("href", "/history?mode=cricket&n=50");
    rerender(<HistoryScreen games={[]} mode={null} weekStart={weekStart} moreHref={null} now={now} texts={o} modes={de.gameMenu.modes} />);
    expect(screen.getByText(o.none)).toBeInTheDocument();
  });
});
