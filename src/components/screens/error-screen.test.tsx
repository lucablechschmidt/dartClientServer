import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorScreen } from "./error-screen";

describe("ErrorScreen", () => {
  it("always offers the way home; retry only when given", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = render(<ErrorScreen title="Fehler" text="Text" homeLabel="Zur Startseite" retry={{ label: "Nochmal", onRetry }} />);
    expect(screen.getByRole("link", { name: "Zur Startseite" })).toHaveAttribute("href", "/");
    await user.click(screen.getByRole("button", { name: "Nochmal" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    rerender(<ErrorScreen title="Fehlt" text="Text" homeLabel="Zur Startseite" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
