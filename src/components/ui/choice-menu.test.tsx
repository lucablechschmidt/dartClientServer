import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ChoiceMenu } from "./choice-menu";

function Demo() {
  const [v, setV] = useState("a");
  return (
    <form>
      <ChoiceMenu
        name="pick"
        label="Wahl"
        value={v}
        onChange={setV}
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ]}
      >
        {(current) => current}
      </ChoiceMenu>
      <button type="button">draußen</button>
    </form>
  );
}

describe("ChoiceMenu", () => {
  it("opens a list with the current option checked, picks, closes, keeps the value in a hidden input", async () => {
    const user = userEvent.setup();
    const { container } = render(<Demo />);
    await user.click(screen.getByRole("button", { name: "Wahl Alpha" }));
    expect(screen.getByRole("button", { name: "Alpha" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Beta" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Alpha" })).not.toHaveFocus(); // a tap leaves focus where it is
    await user.click(screen.getByRole("button", { name: "Beta" }));
    expect(screen.queryByRole("list", { name: "Wahl" })).toBeNull();
    expect(container.querySelector('input[name="pick"]')).toHaveValue("b");
    expect(screen.getByRole("button", { name: "Wahl Beta" })).toHaveAttribute("aria-expanded", "false");
  });
  it("closes on a tap outside and on Escape", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await user.click(screen.getByRole("button", { name: "Wahl Alpha" }));
    await user.click(screen.getByRole("button", { name: "draußen" }));
    expect(screen.queryByRole("list", { name: "Wahl" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Wahl Alpha" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("list", { name: "Wahl" })).toBeNull();
  });
  it("keyboard (R-27): Enter opens on the chosen option, Tab moves on, Escape returns to the trigger, tabbing out closes", async () => {
    const user = userEvent.setup();
    const { container } = render(<Demo />);
    const trigger = screen.getByRole("button", { name: "Wahl Alpha" });
    trigger.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Alpha" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Beta" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(container.querySelector('input[name="pick"]')).toHaveValue("b");
    const again = screen.getByRole("button", { name: "Wahl Beta" });
    expect(again).toHaveFocus(); // chosen from the keyboard: focus back on the trigger
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Beta" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("list", { name: "Wahl" })).toBeNull();
    expect(again).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.tab(); // from Beta (last) out to the next button
    expect(screen.queryByRole("list", { name: "Wahl" })).toBeNull();
    expect(screen.getByRole("button", { name: "draußen" })).toHaveFocus();
  });
});
