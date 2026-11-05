import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { de } from "@/i18n/de";
import { RankingsSection, type ModeRankingView } from "./rankings";

const t = de.stats;
const row = (player: string, name: string, place: number, elo: number, games: number) => ({ player, name, place, elo, games, wins: 0 });
const rankings: ModeRankingView[] = [
  { mode: "x01", rows: [row("c", "Kim", 1, 1017, 2), row("b", "Sam", 2, 984, 1)], own: row("b", "Sam", 2, 984, 1) },
  { mode: "cricket", rows: [], own: null },
  { mode: "elimination", rows: [row("c", "Kim", 1, 1000, 1)], own: null },
  { mode: "splitscore", rows: [], own: null },
];
const title = (mode: keyof typeof t.modes) => t.ranking.replace("{mode}", t.modes[mode]);
const card = (mode: keyof typeof t.modes) => screen.getByRole("button", { name: new RegExp(`^${t.modes[mode]}`) });

describe("RankingsSection (M8)", () => {
  it("one folded card per mode; folded it shows only the own place and Elo", () => {
    render(<RankingsSection rankings={rankings} playerId="b" texts={t} />);
    expect(card("x01")).toHaveTextContent(t.ownRank.replace("{place}", "2").replace("{elo}", "984"));
    expect(card("cricket")).toHaveTextContent(t.notRanked);
    expect(card("elimination")).toHaveTextContent(t.notRanked);
    expect(screen.queryByText("Kim")).toBeNull();
  });

  it("open: place, name, Elo and games of everyone, the own row marked", async () => {
    const user = userEvent.setup();
    render(<RankingsSection rankings={rankings} playerId="b" texts={t} />);
    await user.click(card("x01"));
    const list = screen.getByRole("table", { name: title("x01") });
    const rows = within(list).getAllByRole("row");
    expect(rows.map((r) => r.textContent)).toEqual([
      `${t.columns.place}${t.columns.name}${t.columns.elo}${t.columns.games}`,
      "1Kim10172",
      "2Sam9841",
    ]);
    expect(rows[2]).toHaveAttribute("aria-current", "true");
    await user.click(card("cricket"));
    expect(screen.getByText(t.nobody)).toBeInTheDocument();
  });
});
