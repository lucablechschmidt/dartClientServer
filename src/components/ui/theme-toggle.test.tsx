import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "./theme-toggle";

const labels = { label: "Darstellung", system: "System", light: "Hell", dark: "Dunkel" };

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("cycles through the modes and writes attribute and storage", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle labels={labels} />);
    const button = screen.getByRole("button", { name: "Darstellung" });
    expect(button).toHaveTextContent("System");

    await user.click(button);
    expect(button).toHaveTextContent("Hell");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");

    await user.click(button);
    expect(button).toHaveTextContent("Dunkel");
    expect(document.documentElement.dataset.theme).toBe("dark");

    await user.click(button);
    expect(button).toHaveTextContent("System");
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem("theme")).toBeNull();
  });

  it("starts from the stored preference", () => {
    localStorage.setItem("theme", "dark");
    render(<ThemeToggle labels={labels} />);
    expect(screen.getByRole("button")).toHaveTextContent("Dunkel");
  });
});
