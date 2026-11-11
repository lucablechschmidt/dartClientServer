import type { Dart, LiveKeys } from "@/domain/game";

/** Port of InputButtons + ButtonsView: Double/Triple are modifiers for the next number tap. */

export type KeypadKey =
  | { kind: "number"; value: number } // 0–20
  | { kind: "bull" }
  | { kind: "double" }
  | { kind: "triple" }
  | { kind: "undo" }
  /** Cricket: the rest of the visit as misses (11.11.2026, instead of 0). */
  | { kind: "miss" };

export type Modifier = "none" | "double" | "triple";
export type KeypadState = { modifier: Modifier };

export type KeypadOutput =
  { state: KeypadState; dart: Dart } | { state: KeypadState; undo: true } | { state: KeypadState; missRest: true } | { state: KeypadState };

export const initialKeypadState: KeypadState = { modifier: "none" };

export const KEYPAD_ROWS: KeypadKey[][] = [
  [1, 2, 3, 4, 5].map((value) => ({ kind: "number", value })),
  [6, 7, 8, 9, 10].map((value) => ({ kind: "number", value })),
  [11, 12, 13, 14, 15].map((value) => ({ kind: "number", value })),
  [16, 17, 18, 19, 20].map((value) => ({ kind: "number", value })),
  [{ kind: "bull" }, { kind: "number", value: 0 }, { kind: "undo" }, { kind: "double" }, { kind: "triple" }],
];

const numbers = (...values: number[]): KeypadKey[] => values.map((value) => ({ kind: "number", value }));

/**
 * Key layouts: the legacy keypad, and Cricket's (Figma): only X, 15–20 and Bull, the modifiers and
 * undo in a shorter centered row. Every other field would count nothing in Cricket anyway. X (instead
 * of 0, 11.11.2026) fills the rest of the visit with misses; undo takes them back at once.
 */
export const KEYPAD_LAYOUTS = {
  full: KEYPAD_ROWS,
  cricket: [
    [{ kind: "miss" }, ...numbers(15, 16, 17)],
    [...numbers(18, 19, 20), { kind: "bull" }],
    [{ kind: "double" }, { kind: "triple" }, { kind: "undo" }],
  ],
} satisfies Record<string, KeypadKey[][]>;
export type KeypadLayout = keyof typeof KEYPAD_LAYOUTS;

export function keyId(key: KeypadKey): string {
  return key.kind === "number" ? `n${key.value}` : key.kind;
}

/** Legacy: there is no triple bull; the Bull button is hidden while Triple is active. */
export function isKeyHidden(state: KeypadState, key: KeypadKey): boolean {
  return key.kind === "bull" && state.modifier === "triple";
}

const RING = { none: "single", double: "double", triple: "triple" } as const;

/**
 * Adaptive keypad (11.11.2026): can a dart from this key still count? A number or Bull needs its field
 * and the ring of the active modifier (SplitScore's double round: numbers only with Double); Double and
 * Triple need a ring that can count on some live field (no triple bull). Misses and undo always work.
 */
export function isKeyLive(key: KeypadKey, state: KeypadState, live: LiveKeys | undefined): boolean {
  if (!live) return true;
  switch (key.kind) {
    case "number":
      return key.value === 0 || (live.fields.includes(key.value) && live.rings.includes(RING[state.modifier]));
    case "bull":
      return live.fields.includes(25) && live.rings.includes(RING[state.modifier]);
    case "double":
      return live.rings.includes("double") && live.fields.length > 0;
    case "triple":
      return live.rings.includes("triple") && live.fields.some((f) => f >= 1 && f <= 20);
    case "undo":
    case "miss":
      return true;
  }
}

export function pressKey(state: KeypadState, key: KeypadKey): KeypadOutput {
  switch (key.kind) {
    case "double":
      return { state: { modifier: state.modifier === "double" ? "none" : "double" } };
    case "triple":
      return { state: { modifier: state.modifier === "triple" ? "none" : "triple" } };
    case "undo":
      return { state: initialKeypadState, undo: true };
    case "miss":
      return { state: initialKeypadState, missRest: true };
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
