import { describe, expect, it } from "vitest";
import { initialKeypadState, isKeyHidden, pressKey, type KeypadState } from "./keypad-logic";

const s = (modifier: KeypadState["modifier"]): KeypadState => ({ modifier });

describe("pressKey", () => {
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
