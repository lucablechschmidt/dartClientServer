import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { newMatch } from "@/domain/game";
import { de } from "@/i18n/de";
import { ScoreboardScreen, type ActionReply, type MatchViewLike } from "./scoreboard-screen";

const rules = { startScore: 501, inRule: "single", outRule: "double" } as const;
const state = newMatch(["a", "b"], rules, { legsToWinSet: 1, setsToWinMatch: 1 });
const initial: MatchViewLike = {
  id: "m1",
  rules,
  format: state.format,
  state,
  names: { a: "Casey", b: "Sam" },
  match: {
    status: "running",
    startedAt: 0,
    inputMode: "single",
    hostPlayerId: "a",
    players: [
      { id: "a", hasLogin: true },
      { id: "b", hasLogin: true },
    ],
  },
  actor: { id: "a", isAdmin: false },
  access: { isOpen: true, canEnter: true, canUndo: true, canCancel: true },
  isTournament: false,
};
const reply = (): Promise<ActionReply> => Promise.resolve({ ok: true, view: initial });

describe("ScoreboardScreen", () => {
  it("a refused cancel says why in the status line instead of doing nothing (R-15)", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn(() => Promise.resolve({ ok: false as const, reason: "match-closed" as const }));
    render(
      <ScoreboardScreen
        initial={initial}
        texts={de.game}
        onCommitVisit={reply}
        onUndoVisit={reply}
        onPlayOut={reply}
        onSetStarter={reply}
        onReorder={reply}
        onDecideWinner={reply}
        onLoad={reply}
        onRestart={() => Promise.resolve()}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByRole("button", { name: de.game.cancel }));
    await user.click(screen.getByRole("button", { name: de.game.cancelConfirm }));
    expect(onCancel).toHaveBeenCalledWith("m1");
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(de.game.errors["match-closed"]));
  });
});
