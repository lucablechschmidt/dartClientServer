import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { de } from "@/i18n/de";
import { ThemePicker } from "./theme-picker";

const labels = de.theme;

describe("ThemePicker", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("three choices in a named group; a tap writes attribute and storage, System removes both", async () => {
    const user = userEvent.setup();
    render(<ThemePicker labels={labels} />);
    expect(screen.getByRole("group", { name: labels.label })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: labels.system })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: labels.dark }));
    expect(screen.getByRole("button", { name: labels.dark })).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");

    await user.click(screen.getByRole("button", { name: labels.light }));
    expect(document.documentElement.dataset.theme).toBe("light");

    await user.click(screen.getByRole("button", { name: labels.system }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem("theme")).toBeNull();
  });

  it("starts from the stored preference", () => {
    localStorage.setItem("theme", "dark");
    render(<ThemePicker labels={labels} />);
    expect(screen.getByRole("button", { name: labels.dark })).toHaveAttribute("aria-pressed", "true");
  });
});
