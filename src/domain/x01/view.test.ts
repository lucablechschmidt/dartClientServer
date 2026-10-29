import { describe, expect, it } from "vitest";
import { applyDart, newLeg } from ".";
import { projectScoreboard } from "./view";

const rules = { startScore: 501, inRule: "single", outRule: "double" } as const;
const names = { a: "Casey", b: "Sam" };

describe("projectScoreboard", () => {
  it("fresh leg: starter active, empty slots, first slot current, no hint", () => {
    const v = projectScoreboard(newLeg(["a", "b"], rules, 1), names);
    expect(v.activePlayerId).toBe("b");
    expect(v.players[1].isActive).toBe(true);
    expect(v.players[1].slots.map((s) => s.isCurrent)).toEqual([true, false, false]);
    expect(v.players[0].slots.map((s) => s.isCurrent)).toEqual([false, false, false]);
    expect(v.checkoutHint).toBeNull();
    expect(v.canUndo).toBe(false);
    expect(v.dartsLeft).toBe(3);
  });

  it("shows labels, bust slots, darts left and the checkout hint", () => {
    let s = newLeg(["a", "b"], rules);
    for (const d of [
      { field: 20, type: "triple" },
      { field: 20, type: "triple" },
      { field: 20, type: "triple" },
      { field: 20, type: "triple" },
      { field: 20, type: "triple" },
      { field: 20, type: "triple" },
      { field: 20, type: "triple" },
      { field: 20, type: "triple" },
      { field: 20, type: "triple" },
      { field: 20, type: "triple" },
      { field: 20, type: "triple" },
      { field: 20, type: "triple" },
    ] as const) {
      const r = applyDart(s, d);
      if (r.ok) s = r.value;
    }
    // a: 2 visits of 180 → 141, b: 2 visits → 141; a is up with 3 darts
    const v = projectScoreboard(s, names);
    expect(v.players[0].rest).toBe(141);
    expect(v.activePlayerId).toBe("a");
    expect(v.players[0].slots.map((x) => x.label)).toEqual(["T20", "T20", "T20"].map(() => null));
    expect(v.players[1].slots.map((x) => x.label)).toEqual(["T20", "T20", "T20"]);
    expect(v.checkoutHint).toBe("T20, T19, D12");
    expect(v.players[0].average).toBe(180);
  });

  it("marks the winner and clears the hint", () => {
    let s = newLeg(["a", "b"], { startScore: 40, inRule: "single", outRule: "double" });
    const r = applyDart(s, { field: 20, type: "double" });
    if (r.ok) s = r.value;
    const v = projectScoreboard(s, names);
    expect(v.winnerId).toBe("a");
    expect(v.players[0].isWinner).toBe(true);
    expect(v.dartsLeft).toBe(0);
    expect(v.checkoutHint).toBeNull();
    expect(v.players[0].slots[1].isCurrent).toBe(false);
  });
});
