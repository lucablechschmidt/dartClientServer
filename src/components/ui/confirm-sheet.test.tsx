import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { de } from "@/i18n/de";
import { ConfirmSheet } from "./confirm-sheet";

const props = { text: de.game.cancelQuestion, confirmLabel: de.game.cancelConfirm, cancelLabel: de.game.cancelBack };

describe("ConfirmSheet", () => {
  it("renders nothing while closed, confirms only on the red button, cancels on the other and on Escape", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { rerender } = render(<ConfirmSheet open={false} {...props} onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(<ConfirmSheet open {...props} onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByRole("dialog")).toHaveTextContent(props.text);
    await user.click(screen.getByRole("button", { name: props.cancelLabel }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole("button", { name: props.confirmLabel }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
