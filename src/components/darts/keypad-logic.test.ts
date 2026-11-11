import { describe, expect, it } from "vitest";
import { initialKeypadState, isKeyHidden, isKeyLive, pressKey, type KeypadKey, type KeypadState } from "./keypad-logic";

const s = (modifier: KeypadState["modifier"]): KeypadState => ({ modifier });

describe("pressKey", () => {
  it("X (Cricket) asks for the rest of the visit as misses and drops a modifier", () => {
    expect(pressKey(s("double"), { kind: "miss" })).toEqual({ state: initialKeypadState, missRest: true });
  });
  it("plain number is a single and keeps no modifier", () => {
    expect(pressKey(initialKeypadState, { kind: "number", value: 20 })).toEqual({
      state: initialKeypadState,
      dart: { field: 20, type: "single" },
    });
  });
  it("double/triple toggle and exclude each other", () => {
    let st = pressKey(initialKeypadState, { kind: "double" }).state;
    expect(st.modifier).toBe("double");
    st = pressKey(st, { kind: "triple" }).state;
    expect(st.modifier).toBe("triple");
    st = pressKey(st, { kind: "triple" }).state;
    expect(st.modifier).toBe("none");
  });
  it("modifier applies to the next number and resets", () => {
    const out = pressKey(s("triple"), { kind: "number", value: 19 });
    expect(out).toEqual({ state: initialKeypadState, dart: { field: 19, type: "triple" } });
  });
  it("bull: single or double, never triple (hidden)", () => {
    expect(pressKey(s("none"), { kind: "bull" })).toEqual({ state: initialKeypadState, dart: { field: 25, type: "single" } });
    expect(pressKey(s("double"), { kind: "bull" })).toEqual({ state: initialKeypadState, dart: { field: 25, type: "double" } });
    expect(pressKey(s("triple"), { kind: "bull" })).toEqual({ state: s("triple") });
    expect(isKeyHidden(s("triple"), { kind: "bull" })).toBe(true);
    expect(isKeyHidden(s("double"), { kind: "bull" })).toBe(false);
  });
  it("zero is always a miss, modifier dropped", () => {
    expect(pressKey(s("double"), { kind: "number", value: 0 })).toEqual({ state: initialKeypadState, dart: { field: 0, type: "single" } });
  });
  it("undo clears the modifier and signals undo", () => {
    expect(pressKey(s("double"), { kind: "undo" })).toEqual({ state: initialKeypadState, undo: true });
  });
});

describe("isKeyLive (adaptive keypad, 11.11.2026)", () => {
  const n = (value: number): KeypadKey => ({ kind: "number", value });
  const all = ["single", "double", "triple"] as const;
  it("without limits every key is on", () => {
    expect(isKeyLive(n(7), initialKeypadState, undefined)).toBe(true);
  });
  it("Cricket with 20 closed by everyone: 20 off, 19 on, misses and undo always on", () => {
    const live = { fields: [15, 16, 17, 18, 19, 25], rings: all };
    expect(isKeyLive(n(20), s("triple"), live)).toBe(false);
    expect(isKeyLive(n(19), s("none"), live)).toBe(true);
    expect(isKeyLive(n(0), s("none"), live)).toBe(true);
    expect(isKeyLive({ kind: "miss" }, s("none"), live)).toBe(true);
    expect(isKeyLive({ kind: "undo" }, s("none"), live)).toBe(true);
  });
  it("only Bull left: Triple off (no triple bull), Double on", () => {
    const live = { fields: [25], rings: all };
    expect(isKeyLive({ kind: "triple" }, s("none"), live)).toBe(false);
    expect(isKeyLive({ kind: "double" }, s("none"), live)).toBe(true);
  });
  it("SplitScore double round: numbers and Bull only with Double; Triple off", () => {
    const live = { fields: [...Array.from({ length: 20 }, (_, i) => i + 1), 25], rings: ["double"] as const };
    expect(isKeyLive(n(16), s("none"), live)).toBe(false);
    expect(isKeyLive(n(16), s("double"), live)).toBe(true);
    expect(isKeyLive({ kind: "bull" }, s("double"), live)).toBe(true);
    expect(isKeyLive({ kind: "triple" }, s("none"), live)).toBe(false);
  });
});
