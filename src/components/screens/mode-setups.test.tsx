import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { de } from "@/i18n/de";
import { CricketSetup, EliminationSetup, SplitScoreSetup } from "./mode-setups";

const players = [{ id: "a", name: "Moschusochse", createdAt: 0, guestUntil: null, hasLogin: true, isAdmin: false }];
const props = {
  players,
  texts: de.newGame,
  commonTexts: { back: "Zurück", save: "Speichern", cancel: "Abbrechen" },
  onStart: async () => {},
  onAddGuest: async () => ({ ok: true as const, id: "x" }),
};
const value = (c: HTMLElement, name: string) => (c.querySelector(`input[name="${name}"]`) as HTMLInputElement | null)?.value;

describe("setups per mode (M7)", () => {
  it("cricket and splitscore: no pills, fixed rules, the mode as hidden field", () => {
    const cricket = render(<CricketSetup {...props} />).container;
    expect(value(cricket, "mode")).toBe("cricket");
    expect(value(cricket, "startScore")).toBe("0");
    expect(screen.queryByRole("button", { name: /Best of|Einstieg|Abschluss|punktzahl/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Eingabe: Ein Handy für alle" })).toBeInTheDocument();
    const split = render(<SplitScoreSetup {...props} />).container;
    expect(value(split, "mode")).toBe("splitscore");
    expect(value(split, "startScore")).toBe("40");
  });

  it("elimination: out rule and target as in legacy (SingleOut, 301), choosable", async () => {
    const user = userEvent.setup();
    const { container } = render(<EliminationSetup {...props} />);
    expect(value(container, "mode")).toBe("elimination");
    expect(value(container, "outRule")).toBe("single");
    expect(value(container, "startScore")).toBe("301");
    await user.click(screen.getByRole("button", { name: "Zielpunktzahl: 301" }));
    await user.click(screen.getByRole("button", { name: "501" }));
    expect(value(container, "startScore")).toBe("501");
    await user.click(screen.getByRole("button", { name: "Abschluss: Single Out" }));
    await user.click(screen.getByRole("button", { name: "Double Out" }));
    expect(value(container, "outRule")).toBe("double");
    // Start only with a player
    expect(screen.getByRole("button", { name: "Spiel starten" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Moschusochse auswählen" }));
    expect(screen.getByRole("button", { name: "Spiel starten" })).toBeEnabled();
  });
});
