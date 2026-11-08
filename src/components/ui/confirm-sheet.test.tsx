import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
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

  it("keeps focus inside while open and gives it back on closing (R-28)", async () => {
    const user = userEvent.setup();
    function Demo() {
      const [open, setOpen] = useState(false);
      const [picked, setPicked] = useState(0);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            öffnen
          </button>
          <ConfirmSheet open={open} {...props} onConfirm={() => setOpen(false)} onCancel={() => setOpen(false)}>
            <button type="button" onClick={() => setPicked((n) => n + 1)}>
              wählen {picked}
            </button>
          </ConfirmSheet>
        </>
      );
    }
    render(<Demo />);
    const opener = screen.getByRole("button", { name: "öffnen" });
    await user.click(opener);
    const cancel = screen.getByRole("button", { name: props.cancelLabel });
    const confirm = screen.getByRole("button", { name: props.confirmLabel });
    expect(cancel).toHaveFocus();
    await user.tab();
    expect(confirm).toHaveFocus();
    await user.tab(); // wraps to the first element of the sheet, not out to the page
    expect(screen.getByRole("button", { name: /^wählen/ })).toHaveFocus();
    await user.tab({ shift: true });
    expect(confirm).toHaveFocus();
    await user.click(screen.getByRole("button", { name: /^wählen/ })); // a re-render keeps focus where it is
    expect(screen.getByRole("button", { name: "wählen 1" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
  });
});
