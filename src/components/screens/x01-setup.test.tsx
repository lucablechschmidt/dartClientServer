import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { de } from "@/i18n/de";
import { X01Setup as NewMatchForm } from "./x01-setup";

const players = [
  { id: "a", name: "Moschusochse", createdAt: 0, guestUntil: null, hasLogin: true, isAdmin: false },
  { id: "b", name: "Haflinger", createdAt: 0, guestUntil: null, hasLogin: true, isAdmin: false },
  { id: "g", name: "Gecko", createdAt: 0, guestUntil: 999, hasLogin: false, isAdmin: false },
];
const commonTexts = { back: "Zurück", save: "Speichern", cancel: "Abbrechen" };

describe("X01Setup", () => {
  it("numbers players in tap order, allows deselecting and only then enables Start Game", async () => {
    const user = userEvent.setup();
    const { container } = render(<NewMatchForm players={players} texts={de.newGame} commonTexts={commonTexts} onStart={async () => {}} onAddGuest={async () => ({ ok: true as const, id: "x" })} />);
    const start = screen.getByRole("button", { name: "Start Game" });
    expect(start).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Haflinger auswählen" }));
    await user.click(screen.getByRole("button", { name: "Moschusochse auswählen" }));
    expect(screen.getByLabelText("Position 1")).toHaveTextContent("1");
    expect(start).toBeEnabled();
    const ids = () => [...container.querySelectorAll('input[name="playerId"]')].map((i) => (i as HTMLInputElement).value);
    expect(ids()).toEqual(["b", "a"]);
    await user.click(screen.getByRole("button", { name: "Haflinger abwählen" }));
    expect(ids()).toEqual(["a"]);
    expect(container.querySelector('input[name="outRule"]')).toHaveValue("double");
    // E13: default is one phone, switchable to each player on their own
    expect(container.querySelector('input[name="inputMode"]')).toHaveValue("single");
    await user.click(screen.getByRole("button", { name: "Eingabe: ein Handy" }));
    await user.click(screen.getByRole("button", { name: "jeder selbst" }));
    expect(container.querySelector('input[name="inputMode"]')).toHaveValue("per-player");
  });

  it("marks guests and selects a newly added guest right away", async () => {
    const user = userEvent.setup();
    const onAddGuest = vi.fn(async (fd: FormData) => ({ ok: true as const, id: `guest-${fd.get("name")}` }));
    const { container } = render(<NewMatchForm players={players} texts={de.newGame} commonTexts={commonTexts} onStart={async () => {}} onAddGuest={onAddGuest} />);
    expect(screen.getByRole("button", { name: "Gecko auswählen" })).toHaveTextContent("Gast");
    await user.click(screen.getByRole("button", { name: "Gast hinzufügen" }));
    await user.type(screen.getByPlaceholderText("Name des Gastes"), "Neu{Enter}");
    await waitFor(() => expect(onAddGuest).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      const ids = [...container.querySelectorAll('input[name="playerId"]')].map((i) => (i as HTMLInputElement).value);
      expect(ids).toEqual(["guest-Neu"]);
    });
    expect(screen.queryByPlaceholderText("Name des Gastes")).toBeNull();
  });

  it("shows an error and keeps the field when the guest name is taken", async () => {
    const user = userEvent.setup();
    render(<NewMatchForm players={players} texts={de.newGame} commonTexts={commonTexts} onStart={async () => {}} onAddGuest={async () => ({ ok: false as const, reason: "name-taken" as const })} />);
    await user.click(screen.getByRole("button", { name: "Gast hinzufügen" }));
    await user.type(screen.getByPlaceholderText("Name des Gastes"), "Haflinger{Enter}");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Diesen Namen gibt es schon."));
    expect(screen.getByPlaceholderText("Name des Gastes")).toBeInTheDocument();
  });

  it("sets and legs are choosable with 2 players and locked to 1 from 3 players on (E7)", async () => {
    const user = userEvent.setup();
    const { container } = render(<NewMatchForm players={players} texts={de.newGame} commonTexts={commonTexts} onStart={async () => {}} onAddGuest={async () => ({ ok: true as const, id: "x" })} />);
    const legs = () => container.querySelector('input[name="legsToWinSet"]');
    await user.click(screen.getByRole("button", { name: "Moschusochse auswählen" }));
    await user.click(screen.getByRole("button", { name: "Haflinger auswählen" }));
    await user.click(screen.getByRole("button", { name: "Legs: 1" }));
    await user.click(screen.getByRole("button", { name: "3" }));
    expect(legs()).toHaveValue("3");
    await user.click(screen.getByRole("button", { name: "Gecko auswählen" }));
    expect(legs()).toHaveValue("1");
    expect(screen.getByRole("button", { name: "Legs: 1" })).toBeDisabled();
    expect(screen.getByText(de.newGame.setsLegsTwoOnly)).toBeInTheDocument();
  });
});
