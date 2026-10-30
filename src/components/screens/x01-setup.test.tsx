import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { de } from "@/i18n/de";
import { X01Setup } from "./x01-setup";

const players = [
  { id: "a", name: "Moschusochse", createdAt: 0, guestUntil: null, hasLogin: true, isAdmin: false },
  { id: "b", name: "Haflinger", createdAt: 0, guestUntil: null, hasLogin: true, isAdmin: false },
  { id: "g", name: "Gecko", createdAt: 0, guestUntil: 999, hasLogin: false, isAdmin: false },
];
const t = de.newGame;
const commonTexts = { back: de.ui.back, save: de.players.save, cancel: de.players.cancel };
const select = (name: string) => t.select.replace("{name}", name);
const choice = (label: string, value: string) => `${label}: ${value}`;
const legsMore = `${t.bestOfLegs} ${t.more}`;

describe("X01Setup", () => {
  it("numbers players in tap order, allows deselecting and only then enables Start Game", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <X01Setup
        players={players}
        texts={de.newGame}
        commonTexts={commonTexts}
        onStart={() => Promise.resolve()}
        onAddGuest={() => Promise.resolve({ ok: true as const, id: "x" })}
      />,
    );
    const start = screen.getByRole("button", { name: t.start });
    expect(start).toBeDisabled();
    await user.click(screen.getByRole("button", { name: select("Haflinger") }));
    await user.click(screen.getByRole("button", { name: select("Moschusochse") }));
    expect(screen.getByLabelText(t.selected.replace("{n}", "1"))).toHaveTextContent("1");
    expect(start).toBeEnabled();
    const ids = () => [...container.querySelectorAll('input[name="playerId"]')].map((i) => (i as HTMLInputElement).value);
    expect(ids()).toEqual(["b", "a"]);
    await user.click(screen.getByRole("button", { name: t.deselect.replace("{name}", "Haflinger") }));
    expect(ids()).toEqual(["a"]);
    expect(container.querySelector('input[name="outRule"]')).toHaveValue("double");
    // E13: default is one phone, switchable to each player on their own
    expect(container.querySelector('input[name="inputMode"]')).toHaveValue("single");
    await user.click(screen.getByRole("button", { name: choice(t.inputMode, t.inputModes.single) }));
    await user.click(screen.getByRole("button", { name: t.inputModes["per-player"] }));
    expect(container.querySelector('input[name="inputMode"]')).toHaveValue("per-player");
  });

  it("marks guests and selects a newly added guest right away", async () => {
    const user = userEvent.setup();
    const onAddGuest = vi.fn((fd: FormData) => Promise.resolve({ ok: true as const, id: `guest-${fd.get("name") as string}` }));
    const { container } = render(
      <X01Setup players={players} texts={de.newGame} commonTexts={commonTexts} onStart={() => Promise.resolve()} onAddGuest={onAddGuest} />,
    );
    expect(screen.getByRole("button", { name: select("Gecko") })).toHaveTextContent(t.guestBadge);
    await user.click(screen.getByRole("button", { name: t.addGuest }));
    await user.type(screen.getByPlaceholderText(t.guestNamePlaceholder), "Neu{Enter}");
    await waitFor(() => expect(onAddGuest).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      const ids = [...container.querySelectorAll('input[name="playerId"]')].map((i) => (i as HTMLInputElement).value);
      expect(ids).toEqual(["guest-Neu"]);
    });
    expect(screen.queryByPlaceholderText(t.guestNamePlaceholder)).toBeNull();
  });

  it("shows an error and keeps the field when the guest name is taken", async () => {
    const user = userEvent.setup();
    render(
      <X01Setup
        players={players}
        texts={de.newGame}
        commonTexts={commonTexts}
        onStart={() => Promise.resolve()}
        onAddGuest={() => Promise.resolve({ ok: false as const, reason: "name-taken" as const })}
      />,
    );
    await user.click(screen.getByRole("button", { name: t.addGuest }));
    await user.type(screen.getByPlaceholderText(t.guestNamePlaceholder), "Haflinger{Enter}");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(t.nameTaken));
    expect(screen.getByPlaceholderText(t.guestNamePlaceholder)).toBeInTheDocument();
  });

  it("sets and legs are choosable with 2 players and locked to 1 from 3 players on (E7)", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <X01Setup
        players={players}
        texts={de.newGame}
        commonTexts={commonTexts}
        onStart={() => Promise.resolve()}
        onAddGuest={() => Promise.resolve({ ok: true as const, id: "x" })}
      />,
    );
    const legs = () => container.querySelector('input[name="legsToWinSet"]');
    await user.click(screen.getByRole("button", { name: select("Moschusochse") }));
    await user.click(screen.getByRole("button", { name: select("Haflinger") }));
    await user.click(screen.getByRole("button", { name: legsMore }));
    expect(legs()).toHaveValue("3"); // best of: 1, 3, 5 …
    expect(screen.getByRole("button", { name: `${t.bestOfLegs} ${t.fewer}` })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: select("Gecko") }));
    expect(legs()).toHaveValue("1");
    expect(screen.getByRole("button", { name: legsMore })).toBeDisabled();
    expect(screen.getByText(t.setsLegsTwoOnly)).toBeInTheDocument();
  });

  it("in and out rule open a list, the choice goes into the form and the summary below the start button", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <X01Setup
        players={players}
        texts={de.newGame}
        commonTexts={commonTexts}
        onStart={() => Promise.resolve()}
        onAddGuest={() => Promise.resolve({ ok: true as const, id: "x" })}
      />,
    );
    const trigger = screen.getByRole("button", { name: choice(t.inRule, t.inNames.single) });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("option", { name: t.inNames.single })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("button", { name: t.inNames.double }));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(container.querySelector('input[name="inRule"]')).toHaveValue("double");
    await user.click(screen.getByRole("button", { name: choice(t.startScore, "501") }));
    await user.click(screen.getByRole("button", { name: "301" }));
    await user.click(screen.getByRole("button", { name: select("Haflinger") }));
    expect(
      screen.getByText(`${t.summaryPlayers.replace("{n}", "1")} · 301 · ${t.inNames.double} / ${t.outNames.double}`),
    ).toBeInTheDocument();
    expect(screen.getByText(t.selectedCount.replace("{n}", "1"))).toBeInTheDocument();
  });
});
