"use client";

import { useState } from "react";
import type { Dart } from "@/domain/game";
import {
  initialKeypadState,
  isKeyHidden,
  KEYPAD_LAYOUTS,
  keyId,
  pressKey,
  type KeypadKey,
  type KeypadLayout,
  type KeypadState,
} from "./keypad-logic";

/** `keypad` names the group of keys for screen readers (R-29). */
export type KeypadTexts = { keypad: string; bull: string; undo: string; double: string; triple: string };

type Props = {
  onDart: (dart: Dart) => void;
  onUndo: () => void;
  disabled?: boolean;
  /** E13: numbers, Bull, Double, Triple only when this device is currently allowed to enter. */
  canThrow?: boolean;
  canUndo?: boolean;
  texts: KeypadTexts;
  /** "full": legacy 5 × 5; "cricket": 0, 15–20, Bull (Figma). */
  layout?: KeypadLayout;
};

/**
 * Literal classes per layout so Tailwind generates them. Every key spans two columns of a grid
 * twice as wide as the longest row, so a shorter row can start half a key in and sit centered.
 */
const GRID: Record<KeypadLayout, string> = { full: "grid-cols-10 grid-rows-5", cricket: "grid-cols-8 grid-rows-3" };
const ROW_OFFSET = ["", "col-start-2", "col-start-3", "col-start-4"];

function label(key: KeypadKey, texts: KeypadTexts): string {
  switch (key.kind) {
    case "number":
      return String(key.value);
    case "bull":
      return texts.bull;
    case "undo":
      return texts.undo;
    case "double":
      return texts.double;
    case "triple":
      return texts.triple;
  }
}

/**
 * Number and Bull keys: black, dimmed with yellow (Double) or green (Triple) text while a modifier is on.
 * Exactly one text color per key: two `text-*` classes would let the CSS order decide (Double lost to white).
 */
function fieldKey(base: string, state: KeypadState): string {
  if (state.modifier === "double") return `${base} bg-key-bg opacity-75 text-key-double`;
  if (state.modifier === "triple") return `${base} bg-key-bg opacity-75 text-key-triple`;
  return `${base} bg-key-bg text-key-fg`;
}

/** Colors as in ButtonsView: numbers black/white, in modifier mode dimmed with yellow (Double) or green (Triple) text. */
function keyClasses(key: KeypadKey, state: KeypadState): string {
  const base =
    "min-h-touch rounded-panel text-fluid-lg font-normal tracking-tight select-none active:scale-95 transition-transform disabled:opacity-30";
  switch (key.kind) {
    case "undo":
      return `${base} bg-key-undo text-key-fg`;
    case "double":
      return `${base} bg-key-double text-key-fg ${state.modifier === "double" ? "ring-4 ring-modifier-ring" : ""}`;
    case "triple":
      return `${base} bg-key-triple text-key-fg ${state.modifier === "triple" ? "ring-4 ring-modifier-ring" : ""}`;
    case "number":
      return key.value === 0 ? `${base} bg-key-zero text-key-fg` : fieldKey(base, state);
    case "bull":
      return fieldKey(base, state);
  }
}

/** Port of ScoreInputView: 5 rows, modifier toggles, undo. Emits finished darts via callback. */
export function Keypad({ onDart, onUndo, disabled = false, canThrow = true, canUndo = true, texts, layout = "full" }: Props) {
  const [state, setState] = useState<KeypadState>(initialKeypadState);

  const press = (key: KeypadKey) => {
    const out = pressKey(state, key);
    setState(out.state);
    if ("dart" in out) onDart(out.dart);
    if ("undo" in out) onUndo();
  };

  return (
    <div className={`grid h-full gap-keypad-gap ${GRID[layout]}`} role="group" aria-label={texts.keypad}>
      {KEYPAD_LAYOUTS[layout].flatMap((row, _, rows) => {
        const longest = Math.max(...rows.map((r) => r.length));
        return row.map((key, i) => {
          const hidden = isKeyHidden(state, key);
          const isUndo = key.kind === "undo";
          const offset = i === 0 ? ROW_OFFSET[longest - row.length] : "";
          return (
            <button
              key={keyId(key)}
              type="button"
              onClick={() => press(key)}
              disabled={disabled || hidden || (isUndo ? !canUndo : !canThrow)}
              aria-pressed={key.kind === "double" || key.kind === "triple" ? state.modifier === key.kind : undefined}
              className={`col-span-2 ${offset} ${keyClasses(key, state)} ${hidden ? "invisible" : ""}`}
            >
              {label(key, texts)}
            </button>
          );
        });
      })}
    </div>
  );
}
