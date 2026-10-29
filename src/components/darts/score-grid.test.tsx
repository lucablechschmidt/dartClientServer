import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScoreGrid } from "./score-grid";

describe("ScoreGrid", () => {
  it("renders all four slots in order", () => {
    const { container } = render(
      <ScoreGrid header="H" panels="P" hint="I" keypad="K" />,
    );
    const slots = [...container.querySelectorAll("[data-slot]")].map((el) =>
      el.getAttribute("data-slot"),
    );
    expect(slots).toEqual(["header", "panels", "hint", "keypad"]);
    expect(screen.getByText("K")).toBeInTheDocument();
  });
});
