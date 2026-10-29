import type { Dart } from "@/domain/x01";

/** Port of InputButtons + ButtonsView: Double/Triple are modifiers for the next number tap. */

export type KeypadKey =
  | { kind: "number"; value: number } // 0–20
  | { kind: "bull" }
  | { kind: "double" }
  | { kind: "triple" }
  | { kind: "undo" };

export type Modifier = "none" | "double" | "triple";
export type KeypadState = { modifier: Modifier };

export type KeypadOutput =
  | { state: KeypadState; dart: Dart }
  | { state: KeypadState; undo: true }
  | { state: KeypadState };

export const initialKeypadState: KeypadState = { modifier: "none" };

export const KEYPAD_ROWS: KeypadKey[][] = [
  [1, 2, 3, 4, 5].map((value) => ({ kind: "number", value })),
  [6, 7, 8, 9, 10].map((value) => ({ kind: "number", value })),
  [11, 12, 13, 14, 15].map((value) => ({ kind: "number", value })),
  [16, 17, 18, 19, 20].map((value) => ({ kind: "number", value })),
  [{ kind: "bull" }, { kind: "number", value: 0 }, { kind: "undo" }, { kind: "double" }, { kind: "triple" }],
];

export function keyId(key: KeypadKey): string {
  return key.kind === "number" ? `n${key.value}` : key.kind;
}

/** Legacy: there is no triple bull; the Bull button is hidden while Triple is active. */
export function isKeyHidden(state: KeypadState, key: KeypadKey): boolean {
  return key.kind === "bull" && state.modifier === "triple";
}

export function pressKey(state: KeypadState, key: KeypadKey): KeypadOutput {
  switch (key.kind) {
    case "double":
      return { state: { modifier: state.modifier === "double" ? "none" : "double" } };
    case "triple":
      return { state: { modifier: state.modifier === "triple" ? "none" : "triple" } };
    case "undo":
      return { state: initialKeypadState, undo: true };
    case "bull":
      if (state.modifier === "triple") return { state };
      return { state: initialKeypadState, dart: { field: 25, type: state.modifier === "double" ? "double" : "single" } };
    case "number": {
      // 0 is a miss; a modifier on it is meaningless and is dropped.
      const type = key.value === 0 ? "single" : state.modifier === "none" ? "single" : state.modifier;
      return { state: initialKeypadState, dart: { field: key.value, type } };
    }
  }
}
