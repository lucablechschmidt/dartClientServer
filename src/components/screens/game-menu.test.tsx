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
          { id: "m1", names: ["Luca", "Mara"], perPlayer: true, startedAt: now - 12 * 60_000 },
          { id: "m2", names: ["Finn", "Gast"], perPlayer: false, startedAt: now - 3 * 3_600_000 },
        ]}
      />,
    );
    const rows = screen.getAllByRole("link", { name: /Luca · Mara|Finn · Gast/ });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute("href", "/match/m1");
    expect(rows[0]).toHaveTextContent("jeder selbst · vor 12 min");
    expect(rows[1]).toHaveTextContent("vor 3 h");
    expect(rows[1]).not.toHaveTextContent("jeder selbst");
    rerender(<GameMenu texts={de.gameMenu} overviewTexts={de.overview} now={now} matches={[]} />);
    expect(screen.queryByText("Laufende Spiele")).toBeNull();
    expect(screen.getByRole("link", { name: "Classic Game" })).toHaveAttribute("href", "/new/x01");
  });
  it("relativeTime rounds to minutes and hours", () => {
    expect(relativeTime(now - 20_000, now, de.overview)).toBe("gerade eben");
    expect(relativeTime(now - 90_000, now, de.overview)).toBe("vor 2 min");
    expect(relativeTime(now - 2 * 3_600_000, now, de.overview)).toBe("vor 2 h");
  });
});
