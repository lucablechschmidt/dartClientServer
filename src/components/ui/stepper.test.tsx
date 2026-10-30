import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Stepper } from "./stepper";

function Demo({ disabled = false }: { disabled?: boolean }) {
  const [v, setV] = useState(1);
  return <Stepper name="legs" label="Best of Legs" value={v} onChange={setV} min={1} max={5} step={2} disabled={disabled} decreaseLabel="weniger" increaseLabel="mehr" />;
}

describe("Stepper", () => {
  it("steps within min and max, the value goes with the form", async () => {
    const user = userEvent.setup();
    const { container } = render(<Demo />);
    const less = screen.getByRole("button", { name: "Best of Legs weniger" });
    const more = screen.getByRole("button", { name: "Best of Legs mehr" });
    expect(less).toBeDisabled();
    await user.click(more);
    await user.click(more);
    expect(container.querySelector('input[name="legs"]')).toHaveValue("5");
    expect(more).toBeDisabled();
    await user.click(less);
    expect(container.querySelector('input[name="legs"]')).toHaveValue("3");
  });
  it("disabled: both buttons off", () => {
    render(<Demo disabled />);
    expect(screen.getByRole("button", { name: "Best of Legs mehr" })).toBeDisabled();
  });
});
