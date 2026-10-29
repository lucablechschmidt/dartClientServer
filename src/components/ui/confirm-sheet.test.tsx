import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmSheet } from "./confirm-sheet";

const props = { text: "Spiel abbrechen?", confirmLabel: "Abbrechen", cancelLabel: "Zurück" };

describe("ConfirmSheet", () => {
  it("renders nothing while closed, confirms only on the red button, cancels on the other and on Escape", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { rerender } = render(<ConfirmSheet open={false} {...props} onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(<ConfirmSheet open {...props} onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByRole("dialog")).toHaveTextContent("Spiel abbrechen?");
    await user.click(screen.getByRole("button", { name: "Zurück" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
