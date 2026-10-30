import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PlayerPanelData } from "@/domain/game";
import { de } from "@/i18n/de";
import { CricketTable } from "./cricket-table";

const fields = [15, 16, 17, 18, 19, 20, 25];
/** marks per field in table order; 18 closed by everyone. */
const player = (id: string, name: string, marks: number[]): PlayerPanelData => ({
  id, name, score: 0, darts: 0, average: null, isActive: false, isWinner: false, slots: [], isBust: false, placement: null, isOut: false,
  marks: fields.map((field, i) => ({ field, marks: marks[i], closed: field === 18 })),
});
const players = [player("m", "Mosch", [0, 0, 0, 3, 3, 0, 0]), player("l", "Lena", [1, 0, 0, 3, 0, 2, 0])];

describe("CricketTable (Figma)", () => {
  it("one row per field from 15 to Bull, marks as —, /, X and the circled cross", () => {
    render(<CricketTable players={players} activePlayerId="m" texts={de.game} />);
    expect(screen.getAllByRole("rowheader").map((r) => r.textContent)).toEqual(["15", "16", "17", "18", "19", "20", "Bull"]);
    expect(screen.getByLabelText("Lena, 15: 1")).toHaveTextContent("/");
    expect(screen.getByLabelText("Lena, 20: 2")).toHaveTextContent("X");
    expect(screen.getByLabelText("Mosch, 19: 3").querySelector("svg")).not.toBeNull();
    expect(screen.getByLabelText("Mosch, 15: 0")).toHaveTextContent("—");
  });

  it("closed by everyone gray and struck through; closed by one green; the row label green where the player on turn can score", () => {
    render(<CricketTable players={players} activePlayerId="m" texts={de.game} />);
    expect(screen.getByRole("rowheader", { name: "18" })).toHaveClass("line-through", "bg-cricket-closed");
    expect(screen.getByLabelText("Lena, 18: 3")).toHaveClass("bg-cricket-closed");
    expect(screen.getByLabelText("Mosch, 19: 3")).toHaveClass("bg-cricket-scoring");
    expect(screen.getByRole("rowheader", { name: "19" })).toHaveClass("bg-cricket-scoring");
    expect(screen.getByRole("rowheader", { name: "20" })).not.toHaveClass("bg-cricket-scoring"); // Lena has 2 marks, Mosch none
  });

  it("marks the player on turn; ToStart by tapping a column head", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<CricketTable players={players} activePlayerId="m" texts={de.game} onSelect={onSelect} />);
    expect(screen.getByRole("columnheader", { current: true })).toHaveTextContent("Am Wurf");
    await user.click(screen.getByRole("button", { name: "Anwurf: Lena" }));
    expect(onSelect).toHaveBeenCalledWith("l");
  });
});
