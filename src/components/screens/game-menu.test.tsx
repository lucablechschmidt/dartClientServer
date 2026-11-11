import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { de } from "@/i18n/de";
import { GameMenu, relativeTime } from "./game-menu";

const now = 10_000_000;
const o = de.overview;
const modes = de.gameMenu.modes;

describe("GameMenu overview", () => {
  it("lists open matches with players, mode and age; hides the block when empty", () => {
    const { rerender } = render(
      <GameMenu
        texts={de.gameMenu}
        overviewTexts={de.overview}
        now={now}
        matches={[
          { id: "m1", mode: "x01", names: ["Luca", "Mara"], perPlayer: true, startedAt: now - 12 * 60_000 },
          { id: "m2", mode: "cricket", names: ["Finn", "Gast"], perPlayer: false, startedAt: now - 3 * 3_600_000 },
        ]}
      />,
    );
    const rows = screen.getAllByRole("link", { name: /Luca · Mara|Finn · Gast/ });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute("href", "/match/m1");
    expect(rows[0]).toHaveTextContent(`${o.perPlayer} · ${o.minutesAgo.replace("{n}", "12")}`);
    expect(rows[1]).toHaveTextContent(`${modes.cricket} · ${o.hoursAgo.replace("{n}", "3")}`);
    expect(rows[1]).not.toHaveTextContent(o.perPlayer);
    rerender(<GameMenu texts={de.gameMenu} overviewTexts={de.overview} now={now} matches={[]} />);
    expect(screen.queryByText(o.title)).toBeNull();
    expect(screen.getByRole("link", { name: modes.x01 })).toHaveAttribute("href", "/new/x01");
    expect(screen.getByRole("link", { name: modes.cricket })).toHaveAttribute("href", "/new/cricket");
    expect(screen.getByRole("link", { name: modes.splitscore })).toHaveAttribute("href", "/new/splitscore");
  });
  it("relativeTime rounds to minutes and hours", () => {
    expect(relativeTime(now - 20_000, now, de.overview)).toBe(o.justNow);
    expect(relativeTime(now - 90_000, now, de.overview)).toBe(o.minutesAgo.replace("{n}", "2"));
    expect(relativeTime(now - 2 * 3_600_000, now, de.overview)).toBe(o.hoursAgo.replace("{n}", "2"));
  });
  it("one row to the last games: the latest one in a sentence, the count, to /history (Design/last-games.png)", () => {
    render(
      <GameMenu
        texts={de.gameMenu}
        overviewTexts={de.overview}
        now={now}
        matches={[]}
        recent={{
          latest: {
            id: "r1",
            mode: "x01",
            startScore: 501,
            names: ["admin", "Wanda"],
            winners: ["admin"],
            endedAt: now,
            result: { kind: "winner", winner: "admin" },
          },
          count: 5,
        }}
      />,
    );
    const row = screen.getByRole("link", { name: new RegExp(`^${o.recent}`) });
    expect(row).toHaveAttribute("href", "/history");
    expect(row).toHaveTextContent("Zuletzt: admin gewinnt gegen Wanda · Classic 501");
    expect(row).toHaveTextContent("5 Spiele");
  });
});
