import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { de } from "@/i18n/de";
import { AddRow } from "./add-row";

const t = de.players;
const props = { label: t.addGuest, placeholder: t.guestNamePlaceholder, saveLabel: t.save, cancelLabel: t.cancel };

describe("AddRow", () => {
  it("expands, shows the error from onSubmit and stays open; closes on success", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValueOnce(t.errors["name-taken"]).mockResolvedValueOnce(null);
    render(
      <ul>
        <AddRow {...props} onSubmit={onSubmit} />
      </ul>,
    );
    await user.click(screen.getByRole("button", { name: props.label }));
    await user.type(screen.getByPlaceholderText(props.placeholder), "Mara{Enter}");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(t.errors["name-taken"]));
    // the typed name survives the error, so it can be corrected
    expect(screen.getByPlaceholderText(props.placeholder)).toHaveValue("Mara");
    await user.click(screen.getByRole("button", { name: props.saveLabel }));
    await waitFor(() => expect(screen.queryByPlaceholderText(props.placeholder)).toBeNull());
    expect((onSubmit.mock.calls[1][0] as FormData).get("name")).toBe("Mara");
  });
  it("cancel closes without submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <ul>
        <AddRow {...props} onSubmit={onSubmit} />
      </ul>,
    );
    await user.click(screen.getByRole("button", { name: props.label }));
    await user.click(screen.getByRole("button", { name: props.cancelLabel }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: props.label })).toBeInTheDocument();
  });
  it("works inside another form: the name goes to onSubmit only, the outer form is not submitted", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(null);
    const outer = vi.fn((e: React.SyntheticEvent) => e.preventDefault());
    const { container } = render(
      <form onSubmit={outer}>
        <input name="name" defaultValue="Freitag" />
        <AddRow {...props} variant="button" onSubmit={onSubmit} />
      </form>,
    );
    await user.click(screen.getByRole("button", { name: props.label }));
    await user.type(screen.getByPlaceholderText(props.placeholder), "Mara{Enter}");
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect((onSubmit.mock.calls[0][0] as FormData).get("name")).toBe("Mara");
    expect(outer).not.toHaveBeenCalled();
    expect(container.querySelectorAll("form form")).toHaveLength(0);
  });
});
