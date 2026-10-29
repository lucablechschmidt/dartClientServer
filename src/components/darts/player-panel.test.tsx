import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PlayerPanelData } from "@/domain/game";
import { PlayerPanel } from "./player-panel";

const texts = { darts: "Darts", average: "Ø", visit: "Aufnahme" };
const base: PlayerPanelData = {
  id: "a",
  name: "Casey",
  score: 121,
  darts: 9,
  average: 60,
  isActive: false,
  isWinner: false,
  slots: [],
  isBust: false,
  placement: null,
  isOut: false,
};

describe("PlayerPanel", () => {
  it("shows the rest while the player is in the leg", () => {
    const { container } = render(<PlayerPanel player={base} texts={texts} />);
    expect(container.querySelector("[data-score]")).toHaveTextContent("121");
  });
  it("shows the place instead of the rest once checked out, dimmed (M5)", () => {
    const { container } = render(<PlayerPanel player={{ ...base, score: 0, placement: 1, isOut: true }} texts={texts} />);
    expect(container.querySelector("[data-score]")).toHaveTextContent("1.");
    expect(container.firstElementChild).toHaveClass("opacity-60");
  });
  it("small panel: place too", () => {
    render(<PlayerPanel player={{ ...base, placement: 3 }} size="small" texts={texts} />);
    expect(screen.getByText("3.")).toBeInTheDocument();
  });
  it("cricket: the row of marks with /, X, Ⓧ and gray fields closed by everyone (M7)", () => {
    const marks = [20, 19, 18, 17, 16, 15, 25].map((field, i) => ({ field, marks: Math.min(3, i), closed: field === 18 }));
    const { container } = render(<PlayerPanel player={{ ...base, marks }} texts={{ ...texts, marks: "Marks", bull: "Bull" }} />);
    const row = screen.getByRole("list", { name: "Marks" });
    expect([...row.querySelectorAll("[data-marks]")].map((e) => e.textContent)).toEqual(["", "/", "X", "Ⓧ", "Ⓧ", "Ⓧ", "Ⓧ"]);
    expect(screen.getByLabelText("18: 2")).toHaveClass("bg-cricket-closed");
    expect(screen.getByLabelText("Bull: 3")).toBeInTheDocument();
    expect(container.querySelector("[data-score]")).toHaveTextContent("121");
  });
});
