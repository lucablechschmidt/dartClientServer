import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PlayerPanelData } from "@/domain/x01";
import { PlayerPanel } from "./player-panel";

const texts = { darts: "Darts", average: "Ø", visit: "Aufnahme" };
const base: PlayerPanelData = {
  id: "a",
  name: "Casey",
  rest: 121,
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
    expect(container.querySelector("[data-rest]")).toHaveTextContent("121");
  });
  it("shows the place instead of the rest once checked out, dimmed (M5)", () => {
    const { container } = render(<PlayerPanel player={{ ...base, rest: 0, placement: 1, isOut: true }} texts={texts} />);
    expect(container.querySelector("[data-rest]")).toHaveTextContent("1.");
    expect(container.firstElementChild).toHaveClass("opacity-60");
  });
  it("small panel: place too", () => {
    render(<PlayerPanel player={{ ...base, placement: 3 }} size="small" texts={texts} />);
    expect(screen.getByText("3.")).toBeInTheDocument();
  });
});
