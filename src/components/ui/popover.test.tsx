import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Popover } from "./popover";

const show = () =>
  render(
    <div>
      <Popover label="Regeln" icon={<span>i</span>} title="Regeln: X01">
        <p>Regeln folgen</p>
      </Popover>
      <button type="button">outside</button>
    </div>,
  );

describe("Popover", () => {
  it("opens on a tap, shows title and content, closes on a tap outside", async () => {
    const user = userEvent.setup();
    show();
    const trigger = screen.getByRole("button", { name: "Regeln" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "Regeln: X01" })).toHaveTextContent("Regeln folgen");
    await user.click(screen.getByRole("button", { name: "outside" }));
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("Escape closes it and gives the focus back to the trigger", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: "Regeln" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("region")).toBeNull();
    expect(screen.getByRole("button", { name: "Regeln" })).toHaveFocus();
  });
});
