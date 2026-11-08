import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { applyMatchDart, newMatch, projectMatch } from "@/domain/game";
import { de } from "@/i18n/de";
import { LegVictoryScreen } from "./leg-victory-screen";

const names = { a: "Casey", b: "Sam" };
const won = (() => {
  const r = applyMatchDart(
    newMatch(["a", "b"], { startScore: 40, inRule: "single", outRule: "double" }, { legsToWinSet: 2, setsToWinMatch: 1 }),
    { field: 20, type: "double" },
  );
  if (!r.ok) throw new Error(r.reason);
  return projectMatch(r.value, names);
})();

describe("LegVictoryScreen (M5 plan §9.3)", () => {
  it("shows the leg winner and the score; a tap anywhere continues", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const onUndo = vi.fn();
    render(<LegVictoryScreen view={won} names={names} texts={de.game} canUndo onContinue={onContinue} onUndo={onUndo} />);
    expect(screen.getByText(de.game.legWon.replace("{name}", "Casey"))).toBeInTheDocument();
    expect(screen.getByText(`${de.game.legs} 1:0`)).toBeInTheDocument();
    await user.click(screen.getByText(`${de.game.legs} 1:0`));
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onUndo).not.toHaveBeenCalled();
  });
  it("three named buttons, none nested in another; Enter on 'tap to continue' continues (R-26)", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(
      <LegVictoryScreen view={won} names={names} texts={de.game} canUndo onContinue={onContinue} onUndo={vi.fn()} onDecide={vi.fn()} />,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual([de.game.tapToContinue, de.game.undoLastDart, de.game.decideWinner]);
    for (const b of buttons) expect(b.parentElement?.closest("button, [role=button]")).toBeNull();
    screen.getByRole("button", { name: de.game.tapToContinue }).focus();
    await user.keyboard("{Enter}");
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
  it("the undo button takes the dart back without continuing", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const onUndo = vi.fn();
    render(<LegVictoryScreen view={won} names={names} texts={de.game} canUndo onContinue={onContinue} onUndo={onUndo} />);
    await user.click(screen.getByRole("button", { name: de.game.undoLastDart }));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
  });
});
