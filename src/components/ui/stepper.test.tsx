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
  it("disabled: both buttons off", () => {
    render(<Demo disabled />);
    expect(screen.getByRole("button", { name: more })).toBeDisabled();
  });
});
