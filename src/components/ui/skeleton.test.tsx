import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { de } from "@/i18n/de";
import { Skeleton } from "./skeleton";

describe("Skeleton (R-04)", () => {
  it("is announced once as busy with the loading text and shows the rows", () => {
    const { container } = render(<Skeleton label={de.ui.loading} rows={3} />);
    const status = screen.getByRole("status", { name: de.ui.loading });
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(container.querySelectorAll(".min-h-touch")).toHaveLength(3);
  });

  it("inline: only the card, for pages that bring their own frame and heading", () => {
    const { container } = render(<Skeleton label={de.ui.loading} inline />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(container.querySelector(".h-8")).toBeNull();
  });
});
