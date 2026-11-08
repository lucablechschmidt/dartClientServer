import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Player } from "@/domain/player";
import { de } from "@/i18n/de";
import { TournamentSetup } from "./tournament-setup";
import { choiceName, playerRow, queryPlayerRow } from "@/test-utils/queries";

const t = de.tournaments;
const n = de.newGame;
const player = (id: string, name: string): Player => ({
  id,
  name,
  createdAt: 0,
  guestUntil: null,
  hasLogin: true,
  isAdmin: false,
  deletedAt: null,
});
const players = [player("a", "Casey"), player("b", "Sam"), player("c", "Kim"), player("d", "Lou")];
const choosePlayers = () => screen.getByRole("button", { name: new RegExp(`^${n.choosePlayersTitle}`) });

function show(onAddGuest = vi.fn()) {
  return render(
    <TournamentSetup
      players={players}
      texts={n}
      tournamentTexts={t}
      commonTexts={{ back: de.ui.back, save: de.players.save, cancel: de.players.cancel }}
      onStart={vi.fn()}
      onAddGuest={onAddGuest}
    />,
  );
}
const before = (a: Element, b: Element) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

describe("TournamentSetup", () => {
  it("cards: name and format first, then the players, then the rules", () => {
    show();
    const name = screen.getByLabelText(t.name);
    const score = screen.getByRole("button", { name: new RegExp(`^${n.startScore}`) });
    expect(before(name, choosePlayers())).toBe(true);
    expect(before(choosePlayers(), score)).toBe(true);
  });

  it("the expected number of games shows once players are chosen", async () => {
    const user = userEvent.setup();
    show();
    expect(screen.queryByText(/^Voraussichtlich/)).toBeNull();
    for (const p of players) await user.click(playerRow(p.name));
    expect(screen.getByText(t.expectedGames.replace("{n}", "6"))).toBeInTheDocument(); // round robin of four
    await user.click(screen.getByRole("button", { name: choiceName(t.format, t.formats["round-robin"]) }));
    await user.click(screen.getByRole("button", { name: t.formats.knockout }));
    expect(screen.getByText(t.expectedGames.replace("{n}", "3"))).toBeInTheDocument();
  });

  it("the players card folds to one line with the count; the choice still goes with the form", async () => {
    const user = userEvent.setup();
    const { container } = show();
    await user.click(playerRow("Sam"));
    await user.click(playerRow("Kim"));
    expect(choosePlayers()).toHaveAttribute("aria-expanded", "true");
    await user.click(choosePlayers());
    expect(choosePlayers()).toHaveAttribute("aria-expanded", "false");
    expect(choosePlayers()).toHaveTextContent(n.selectedCount.replace("{n}", "2"));
    expect(queryPlayerRow("Casey")).toBeNull();
    const form = container.querySelector<HTMLFormElement>("form#new-match")!;
    expect(new FormData(form).getAll("playerId")).toEqual(["b", "c"]);
  });

  it("a guest added in the card is selected, and its name does not go with the tournament form", async () => {
    const user = userEvent.setup();
    const onAddGuest = vi.fn(() => Promise.resolve({ ok: true as const, id: "g" }));
    const { container } = show(onAddGuest);
    await user.type(screen.getByLabelText(t.name), "Freitag");
    await user.click(screen.getByRole("button", { name: n.addGuest }));
    await user.type(screen.getByPlaceholderText(n.guestNamePlaceholder), "Gast{Enter}");
    await waitFor(() => expect(onAddGuest).toHaveBeenCalledTimes(1));
    const form = container.querySelector<HTMLFormElement>("form#new-match")!;
    await waitFor(() => expect(new FormData(form).getAll("playerId")).toEqual(["g"]));
    expect(new FormData(form).getAll("name")).toEqual(["Freitag"]);
  });

  it("seed list: drawn by default, or fixed in the order the players are tapped", async () => {
    const user = userEvent.setup();
    const { container } = show();
    const seeding = () => container.querySelector('input[name="seeding"]');
    expect(seeding()).toHaveValue("random");
    expect(screen.queryByText(t.seedingFixedHint)).toBeNull();
    await user.click(screen.getByRole("button", { name: choiceName(t.seeding, t.seedings.random) }));
    await user.click(screen.getByRole("button", { name: t.seedings.fixed }));
    expect(seeding()).toHaveValue("fixed");
    expect(screen.getByText(t.seedingFixedHint)).toBeInTheDocument();
  });
});
