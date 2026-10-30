import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddRow } from "./add-row";

const props = { label: "Gast hinzufügen", placeholder: "Name des Gastes", saveLabel: "Speichern", cancelLabel: "Abbrechen" };

describe("AddRow", () => {
  it("expands, shows the error from onSubmit and stays open; closes on success", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValueOnce("Diesen Namen gibt es schon.").mockResolvedValueOnce(null);
    render(
      <ul>
        <AddRow {...props} onSubmit={onSubmit} />
      </ul>,
    );
    await user.click(screen.getByRole("button", { name: "Gast hinzufügen" }));
    await user.type(screen.getByPlaceholderText("Name des Gastes"), "Mara{Enter}");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("gibt es schon"));
    // the typed name survives the error, so it can be corrected
    expect(screen.getByPlaceholderText("Name des Gastes")).toHaveValue("Mara");
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    await waitFor(() => expect(screen.queryByPlaceholderText("Name des Gastes")).toBeNull());
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
    await user.click(screen.getByRole("button", { name: "Gast hinzufügen" }));
    await user.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Gast hinzufügen" })).toBeInTheDocument();
  });
});
