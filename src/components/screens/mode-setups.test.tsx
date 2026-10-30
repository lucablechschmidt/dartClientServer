import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { de } from "@/i18n/de";
import { CricketSetup, EliminationSetup, SplitScoreSetup } from "./mode-setups";

const t = de.newGame;
const choice = (label: string, value: string) => `${label}: ${value}`;
const players = [{ id: "a", name: "Moschusochse", createdAt: 0, guestUntil: null, hasLogin: true, isAdmin: false }];
const props = {
  players,
  texts: t,
  commonTexts: { back: de.ui.back, save: de.players.save, cancel: de.players.cancel },
  onStart: () => Promise.resolve(),
  onAddGuest: () => Promise.resolve({ ok: true as const, id: "x" }),
};
const value = (c: HTMLElement, name: string) => c.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value;

describe("setups per mode (M7)", () => {
  it("cricket and splitscore: no pills, fixed rules, the mode as hidden field", () => {
    const cricket = render(<CricketSetup {...props} />).container;
    expect(value(cricket, "mode")).toBe("cricket");
    expect(value(cricket, "startScore")).toBe("0");
    expect(
      screen.queryByRole("button", {
        name: new RegExp([t.bestOfLegs, t.bestOfSets, t.inRule, t.outRule, t.startScore, t.targetScore].join("|")),
      }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: choice(t.inputMode, t.inputModes.single) })).toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: choice(t.targetScore, "301") }));
    await user.click(screen.getByRole("button", { name: "501" }));
    expect(value(container, "startScore")).toBe("501");
    await user.click(screen.getByRole("button", { name: choice(t.outRule, t.outNames.single) }));
    await user.click(screen.getByRole("button", { name: t.outNames.double }));
    expect(value(container, "outRule")).toBe("double");
    // Start only with a player
    expect(screen.getByRole("button", { name: t.start })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: t.select.replace("{name}", "Moschusochse") }));
    expect(screen.getByRole("button", { name: t.start })).toBeEnabled();
  });
});
