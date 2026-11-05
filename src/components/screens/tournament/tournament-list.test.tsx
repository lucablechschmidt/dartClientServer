import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { de } from "@/i18n/de";
import { TournamentList } from "./tournament-list";

describe("TournamentList (M9)", () => {
  it("has a way back to the game menu", () => {
    render(<TournamentList items={[]} texts={de.tournaments} back={de.ui.back} />);
    expect(screen.getByRole("link", { name: de.ui.back })).toHaveAttribute("href", "/");
  });
});
