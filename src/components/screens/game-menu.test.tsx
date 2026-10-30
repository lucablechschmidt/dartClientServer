import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { de } from "@/i18n/de";
import { GameMenu, relativeTime } from "./game-menu";

const now = 10_000_000;

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
    expect(rows[0]).toHaveTextContent("jeder selbst · vor 12 min");
    expect(rows[1]).toHaveTextContent("Cricket · vor 3 h");
    expect(rows[1]).not.toHaveTextContent("jeder selbst");
    rerender(<GameMenu texts={de.gameMenu} overviewTexts={de.overview} now={now} matches={[]} />);
    expect(screen.queryByText("Laufende Spiele")).toBeNull();
    expect(screen.getByRole("link", { name: "Classic Game" })).toHaveAttribute("href", "/new/x01");
    expect(screen.getByRole("link", { name: "Cricket" })).toHaveAttribute("href", "/new/cricket");
    expect(screen.getByRole("link", { name: "SplitScore" })).toHaveAttribute("href", "/new/splitscore");
  });
  it("relativeTime rounds to minutes and hours", () => {
    expect(relativeTime(now - 20_000, now, de.overview)).toBe("gerade eben");
    expect(relativeTime(now - 90_000, now, de.overview)).toBe("vor 2 min");
    expect(relativeTime(now - 2 * 3_600_000, now, de.overview)).toBe("vor 2 h");
  });
  it("lists the last matches with their result below the running ones (M5)", () => {
    render(
      <GameMenu
        texts={de.gameMenu}
        overviewTexts={de.overview}
        now={now}
        matches={[]}
        recent={[
          {
            id: "r1",
            mode: "x01",
            names: ["Luca", "Mara"],
            endedAt: now - 5 * 60_000,
            result: { kind: "score", winner: "Mara", unit: "legs", score: [2, 1] },
          },
          {
            id: "r2",
            mode: "splitscore",
            names: ["Luca", "Mara", "Finn"],
            endedAt: now - 2 * 86_400_000,
            result: {
              kind: "places",
              order: [
                { player: "Finn", place: 1 },
                { player: "Luca", place: 1 },
                { player: "Mara", place: 3 },
              ],
            },
          },
          { id: "r3", mode: "x01", names: ["Luca", "Mara"], endedAt: now, result: { kind: "abandoned" } },
        ]}
      />,
    );
    expect(screen.getByText("Letzte Spiele")).toBeInTheDocument();
    const rows = screen.getAllByRole("link", { name: /Luca · Mara/ });
    expect(rows[0]).toHaveAttribute("href", "/match/r1");
    expect(rows[0]).toHaveTextContent("Mara Legs 2:1");
    expect(rows[1]).toHaveTextContent("1. Finn · 1. Luca · 3. Mara");
    expect(rows[1]).toHaveTextContent("SplitScore · vor 2 d");
    expect(rows[1]).toHaveTextContent("vor 2 d");
    expect(rows[2]).toHaveTextContent("abgebrochen");
  });
});
