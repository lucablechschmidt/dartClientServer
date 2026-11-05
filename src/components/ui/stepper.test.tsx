import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { de } from "@/i18n/de";
import { Stepper } from "./stepper";

const t = de.newGame;
const less = `${t.bestOfLegs} ${t.fewer}`;
const more = `${t.bestOfLegs} ${t.more}`;

function Demo({ disabled = false }: { disabled?: boolean }) {
  const [v, setV] = useState(1);
  return (
    <Stepper
      name="legs"
      label={t.bestOfLegs}
      value={v}
      onChange={setV}
      min={1}
      max={5}
      step={2}
      disabled={disabled}
      decreaseLabel={t.fewer}
      increaseLabel={t.more}
    />
  );
}

describe("Stepper", () => {
  it("steps within min and max, the value goes with the form", async () => {
    const user = userEvent.setup();
    const { container } = render(<Demo />);
    const lessButton = screen.getByRole("button", { name: less });
    const moreButton = screen.getByRole("button", { name: more });
    expect(lessButton).toBeDisabled();
    await user.click(moreButton);
    await user.click(moreButton);
    expect(container.querySelector('input[name="legs"]')).toHaveValue("5");
    expect(moreButton).toBeDisabled();
    await user.click(lessButton);
    expect(container.querySelector('input[name="legs"]')).toHaveValue("3");
  });
  it("disabled: both buttons and the field off", () => {
    render(<Demo disabled />);
    expect(screen.getByRole("button", { name: more })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: t.bestOfLegs })).toBeDisabled();
  });
  it("the number can be typed; on leaving it snaps to the steps (even rounds up) and stays within min and max", async () => {
    const user = userEvent.setup();
    const { container } = render(<Demo />);
    const field = screen.getByRole("textbox", { name: t.bestOfLegs });
    const hidden = () => container.querySelector('input[name="legs"]');
    await user.clear(field);
    await user.type(field, "4");
    await user.tab();
    expect(field).toHaveValue("5");
    expect(hidden()).toHaveValue("5");
    await user.clear(field);
    await user.type(field, "3{Enter}");
    expect(hidden()).toHaveValue("3");
    await user.clear(field);
    await user.type(field, "77");
    await user.tab();
    expect(hidden()).toHaveValue("5");
    await user.clear(field);
    await user.tab();
    expect(field).toHaveValue("5"); // empty: back to the last value
    await user.clear(field);
    await user.type(field, "x0");
    await user.tab();
    expect(hidden()).toHaveValue("1"); // only digits are taken, below min clamps up
  });
});
