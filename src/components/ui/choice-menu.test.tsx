import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ChoiceMenu } from "./choice-menu";

function Demo() {
  const [v, setV] = useState("a");
  return (
    <form>
      <ChoiceMenu name="pick" label="Wahl" value={v} onChange={setV} options={[{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }]}>
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
    await user.click(screen.getByRole("button", { name: "Wahl: Alpha" }));
    expect(screen.getByRole("option", { name: "Alpha" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "Beta" })).toHaveAttribute("aria-selected", "false");
    await user.click(screen.getByRole("button", { name: "Beta" }));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(container.querySelector('input[name="pick"]')).toHaveValue("b");
    expect(screen.getByRole("button", { name: "Wahl: Beta" })).toHaveAttribute("aria-expanded", "false");
  });
  it("closes on a tap outside and on Escape", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await user.click(screen.getByRole("button", { name: "Wahl: Alpha" }));
    await user.click(screen.getByRole("button", { name: "draußen" }));
    expect(screen.queryByRole("listbox")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Wahl: Alpha" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
