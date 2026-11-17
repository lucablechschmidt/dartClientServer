import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { de } from "@/i18n/de";
import { MAX_SHOWN } from "./ranking-detail";
import { RankingsSection, type ModeRankingView } from "./rankings";

const t = de.stats;
const DAY = 24 * 60 * 60 * 1000;
const NOW = 400 * DAY;
const row = (player: string, name: string, place: number, elo: number, games: number) => ({ player, name, place, elo, games, wins: 0 });
const point = (matchId: string, daysAgo: number, elo: number) => ({ matchId, finishedAt: NOW - daysAgo * DAY, elo });
const rankings: ModeRankingView[] = [
  {
    mode: "x01",
    rows: [row("c", "Kim", 1, 1017, 2), row("b", "Sam", 2, 984, 1), row("d", "Alex", 3, 1000, 1)],
    own: row("b", "Sam", 2, 984, 1),
    history: {
      c: [point("m1", 100, 1016), point("m2", 3, 1017)],
      b: [point("m1", 100, 984)],
    },
  },
  { mode: "cricket", rows: [], own: null, history: {} },
  { mode: "elimination", rows: [row("c", "Kim", 1, 1000, 1)], own: null, history: {} },
  { mode: "splitscore", rows: [], own: null, history: {} },
];
const title = (mode: keyof typeof t.modes) => t.ranking.replace("{mode}", t.modes[mode]);
const card = (mode: keyof typeof t.modes) => screen.getByRole("button", { name: new RegExp(`^${t.modes[mode]}`) });
const show = (list = rankings) => render(<RankingsSection rankings={list} playerId="b" texts={t} overviewTexts={de.overview} now={NOW} />);
const chart = () => screen.getByRole("img", { name: t.eloHistory });

describe("RankingsSection (M8)", () => {
  it("one folded card per mode; folded it shows only the own place and Elo", () => {
    show();
    expect(card("x01")).toHaveTextContent(t.ownRank.replace("{place}", "2").replace("{elo}", "984"));
    expect(card("cricket")).toHaveTextContent(t.notRanked);
    expect(card("elimination")).toHaveTextContent(t.notRanked);
    expect(screen.queryByText("Kim")).toBeNull();
  });

  it("open: place, name, Elo and games of everyone, the own row marked", async () => {
    const user = userEvent.setup();
    show();
    await user.click(card("x01"));
    const list = screen.getByRole("table", { name: title("x01") });
    const rows = within(list).getAllByRole("row");
    expect(rows.map((r) => r.textContent)).toEqual([
      `${t.columns.place}${t.columns.name}${t.columns.elo}${t.columns.games}`,
      "1Kim10172",
      "2Sam9841",
      "3Alex10001",
    ]);
    expect(rows[2]).toHaveAttribute("aria-current", "true");
    await user.click(card("cricket"));
    expect(screen.getByText(t.nobody)).toBeInTheDocument();
  });

  it("Elo over time: at first only the own line; tapping a name in the table adds or removes a player", async () => {
    const user = userEvent.setup();
    show();
    await user.click(card("x01"));
    const list = screen.getByRole("table", { name: title("x01") });
    const name = (n: string) => within(list).queryByRole("button", { name: n });
    expect(name("Sam")).toHaveAttribute("aria-pressed", "true");
    expect(name("Kim")).toHaveAttribute("aria-pressed", "false");
    // without a rated 1-vs-1 match there is no line to show
    expect(name("Alex")).toBeNull();
    expect(chart().querySelectorAll("path")).toHaveLength(1);
    expect(chart().querySelectorAll("circle")).toHaveLength(1);

    await user.click(name("Kim")!);
    expect(chart().querySelectorAll("path")).toHaveLength(2);
    // two matches on the x axis: Sam and Kim at the first, Kim alone at the second
    expect(chart().querySelectorAll("circle")).toHaveLength(3);
    const values = within(screen.getByRole("table", { name: t.eloHistory })).getAllByRole("row");
    expect(values.map((r) => [...r.children].map((c) => c.textContent))).toEqual([
      [t.match, "Sam", "Kim"],
      [de.overview.daysAgo.replace("{n}", "100"), "984", "1016"],
      [de.overview.daysAgo.replace("{n}", "3"), "", "1017"],
    ]);

    await user.click(name("Sam")!);
    expect(name("Sam")).toHaveAttribute("aria-pressed", "false");
    expect(chart().querySelectorAll("path")).toHaveLength(1);
    // Kim keeps the second colour although Sam's line is gone
    expect(chart().querySelector("path")).toHaveClass("stroke-series-2");
  });

  it("the range filters the points: all, this year, 30 days", async () => {
    const user = userEvent.setup();
    show();
    await user.click(card("x01"));
    const range = within(screen.getByRole("group", { name: t.range }));
    await user.click(range.getByRole("button", { name: t.ranges["30d"] }));
    // Sam's only match is older than 30 days
    expect(screen.queryByRole("img", { name: t.eloHistory })).toBeNull();
    expect(screen.getByText(t.eloNone)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Kim" }));
    expect(chart().querySelectorAll("circle")).toHaveLength(1);
    await user.click(range.getByRole("button", { name: t.ranges.all }));
    expect(chart().querySelectorAll("circle")).toHaveLength(3);
  });

  it(`at most ${MAX_SHOWN} lines: further names are disabled until one is removed; no chart without rated matches`, async () => {
    const user = userEvent.setup();
    const ids = ["b", "c", "d", "e", "f", "g"];
    const many: ModeRankingView = {
      mode: "x01",
      rows: ids.map((id, i) => row(id, `P-${id}`, i + 1, 1000, 1)),
      own: null,
      history: Object.fromEntries(ids.map((id, i) => [id, [point(`m${i}`, i + 1, 1000 + i)]])),
    };
    show([many, rankings[2]]);
    await user.click(card("x01"));
    for (const id of ids.slice(1, MAX_SHOWN)) await user.click(screen.getByRole("button", { name: `P-${id}` }));
    expect(chart().querySelectorAll("path")).toHaveLength(MAX_SHOWN);
    expect(screen.getByRole("button", { name: "P-g" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "P-c" }));
    expect(screen.getByRole("button", { name: "P-g" })).toBeEnabled();

    await user.click(card("elimination"));
    expect(screen.getByRole("table", { name: title("elimination") })).toBeInTheDocument();
    expect(screen.getAllByText(t.eloHistory)).toHaveLength(1);
  });
});
