import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PlayerPanelData } from "@/domain/game";
import { de } from "@/i18n/de";
import { PlayerPanels } from "./player-panels";

const texts = { darts: "Darts", average: "Ø", visit: "Aufnahme" };
const player = (id: string, name: string, isActive = false): PlayerPanelData => ({
  id,
  name,
  score: 301,
  darts: 0,
  average: 0,
  isActive,
  isWinner: false,
  slots: [],
  isBust: false,
  placement: null,
  isOut: false,
});
const players = [player("a", "Casey", true), player("b", "Sam"), player("c", "Kim")];
const reorderTexts = de.game.reorder;

describe("PlayerPanels: reorder before the first dart (11.11.2026)", () => {
  it("the small panels become sortable (loaded on demand); a tap still chooses the starter", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onReorder = vi.fn();
    render(<PlayerPanels players={players} texts={texts} onSelect={onSelect} onReorder={onReorder} reorderTexts={reorderTexts} />);
    const sam = await screen.findByRole("button", { name: /^Sam/, description: reorderTexts.instructions });
    expect(sam).toHaveAttribute("aria-roledescription", reorderTexts.roleDescription);
    await user.click(sam);
    expect(onSelect).toHaveBeenCalledWith("b");
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("Alt + arrow keys move the focused player; not past the ends", async () => {
    const user = userEvent.setup();
    const onReorder = vi.fn();
    render(<PlayerPanels players={players} texts={texts} onSelect={vi.fn()} onReorder={onReorder} reorderTexts={reorderTexts} />);
    (await screen.findByRole("button", { name: /^Casey/, description: reorderTexts.instructions })).focus();
    await user.keyboard("{Alt>}{ArrowRight}{/Alt}");
    expect(onReorder).toHaveBeenLastCalledWith(["b", "a", "c"]);
    await user.keyboard("{Alt>}{ArrowLeft}{/Alt}");
    expect(onReorder).toHaveBeenCalledTimes(1); // Casey is first already (the props did not change)
  });

  it("without onReorder nothing is loaded: plain buttons, two players never sortable", () => {
    render(<PlayerPanels players={players.slice(0, 2)} texts={texts} onSelect={vi.fn()} onReorder={vi.fn()} reorderTexts={reorderTexts} />);
    expect(screen.getAllByRole("button").every((b) => !b.hasAttribute("aria-roledescription"))).toBe(true);
  });
});
