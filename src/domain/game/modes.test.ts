import { describe, expect, it } from "vitest";
import * as direct from "../x01/apply";
import * as sel from "../x01/selectors";
import { applyDart, currentPlayer, isLegFinished, modeOf, openVisit, standings, undoDart, winnerOf } from "./modes";
import { newLeg } from "./state";
import type { Dart, LegState } from "./types";

describe("game modes (M7)", () => {
  it("X01 through the interface behaves exactly like the X01 functions (random darts)", () => {
    let seed = 11;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed % n;
    };
    const types = ["single", "double", "triple"] as const;
    for (let run = 0; run < 20; run++) {
      let viaMode: LegState = newLeg(["a", "b", "c"], { startScore: 101, inRule: "single", outRule: "double" });
      let viaX01: LegState = viaMode;
      for (let i = 0; i < 200 && !isLegFinished(viaMode); i++) {
        const field = rand(5) === 0 ? 25 : rand(21);
        const type = types[rand(3)];
        const dart: Dart = field === 0 || (field === 25 && type === "triple") ? { field, type: "single" } : { field, type };
        if (rand(10) === 0) {
          const a = undoDart(viaMode);
          const b = direct.undoDart(viaX01);
          expect(a).toEqual(b);
          if (a.ok && b.ok) [viaMode, viaX01] = [a.value, b.value];
          continue;
        }
        const a = applyDart(viaMode, dart);
        const b = direct.applyDart(viaX01, dart);
        expect(a).toEqual(b);
        if (a.ok && b.ok) [viaMode, viaX01] = [a.value, b.value];
        expect(currentPlayer(viaMode)).toBe(sel.currentPlayer(viaX01));
        expect(openVisit(viaMode)).toEqual(sel.openVisit(viaX01));
        expect(standings(viaMode).flat()).toEqual(sel.placements(viaX01));
      }
      expect(winnerOf(viaMode)).toBe(sel.isLegFinished(viaX01) ? sel.winnerOf(viaX01) : null);
    }
  });

  it("an unknown mode is a programming error", () => {
    expect(() => modeOf({ mode: "darts-golf" as never })).toThrow("unknown game mode");
  });
});
