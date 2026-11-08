import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FoldCard } from "./fold-card";

describe("FoldCard", () => {
  it("the toggle says it is folded and which content it controls (R-29)", async () => {
    const user = userEvent.setup();
    render(
      <FoldCard title="Spiele" summary="3">
        <p>Inhalt</p>
      </FoldCard>,
    );
    const toggle = screen.getByRole("button", { name: /^Spiele/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Inhalt")).toBeNull();
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const id = toggle.getAttribute("aria-controls");
    expect(id).toBeTruthy();
    expect(document.getElementById(id ?? "")).toContainElement(screen.getByText("Inhalt"));
  });
});
