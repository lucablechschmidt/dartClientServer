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
const commonTexts = { back: "Zurück", save: "Speichern", cancel: "Abbrechen" };

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
    const start = screen.getByRole("button", { name: "Spiel starten" });
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
    await user.click(screen.getByRole("button", { name: "Eingabe: Ein Handy für alle" }));
    await user.click(screen.getByRole("button", { name: "Jeder auf seinem Handy" }));
    expect(container.querySelector('input[name="inputMode"]')).toHaveValue("per-player");
  });

  it("marks guests and selects a newly added guest right away", async () => {
    const user = userEvent.setup();
    const onAddGuest = vi.fn((fd: FormData) => Promise.resolve({ ok: true as const, id: `guest-${fd.get("name") as string}` }));
    const { container } = render(
      <X01Setup players={players} texts={de.newGame} commonTexts={commonTexts} onStart={() => Promise.resolve()} onAddGuest={onAddGuest} />,
    );
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
    render(
      <X01Setup
        players={players}
        texts={de.newGame}
        commonTexts={commonTexts}
        onStart={() => Promise.resolve()}
        onAddGuest={() => Promise.resolve({ ok: false as const, reason: "name-taken" as const })}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Gast hinzufügen" }));
    await user.type(screen.getByPlaceholderText("Name des Gastes"), "Haflinger{Enter}");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Diesen Namen gibt es schon."));
    expect(screen.getByPlaceholderText("Name des Gastes")).toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: "Moschusochse auswählen" }));
    await user.click(screen.getByRole("button", { name: "Haflinger auswählen" }));
    await user.click(screen.getByRole("button", { name: "Best of Legs mehr" }));
    expect(legs()).toHaveValue("3"); // best of: 1, 3, 5 …
    expect(screen.getByRole("button", { name: "Best of Legs weniger" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Gecko auswählen" }));
    expect(legs()).toHaveValue("1");
    expect(screen.getByRole("button", { name: "Best of Legs mehr" })).toBeDisabled();
    expect(screen.getByText(de.newGame.setsLegsTwoOnly)).toBeInTheDocument();
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
    const trigger = screen.getByRole("button", { name: "Einstieg: Single In" });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("option", { name: "Single In" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("button", { name: "Double In" }));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(container.querySelector('input[name="inRule"]')).toHaveValue("double");
    await user.click(screen.getByRole("button", { name: "Startpunktzahl: 501" }));
    await user.click(screen.getByRole("button", { name: "301" }));
    await user.click(screen.getByRole("button", { name: "Haflinger auswählen" }));
    expect(screen.getByText("1 Spieler · 301 · Double In / Double Out")).toBeInTheDocument();
    expect(screen.getByText("1 ausgewählt")).toBeInTheDocument();
  });
});
