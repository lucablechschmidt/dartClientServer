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

export type KeypadTexts = { bull: string; undo: string; double: string; triple: string };

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

/** Colors as in ButtonsView: numbers black/white, in modifier mode dimmed with yellow (Double) or green (Triple) text. */
function keyClasses(key: KeypadKey, state: KeypadState): string {
  const base =
    "min-h-touch rounded-panel fluid-text-lg font-normal tracking-tight text-key-fg select-none active:scale-95 transition-transform disabled:opacity-30";
  switch (key.kind) {
    case "undo":
      return `${base} bg-key-undo`;
    case "double":
      return `${base} bg-key-double ${state.modifier === "double" ? "ring-4 ring-fg/60" : ""}`;
    case "triple":
      return `${base} bg-key-triple ${state.modifier === "triple" ? "ring-4 ring-fg/60" : ""}`;
    case "number":
      if (key.value === 0) return `${base} bg-key-zero`;
    // fallthrough
    case "bull": {
      if (state.modifier === "double") return `${base} bg-key-bg opacity-75 text-key-double`;
      if (state.modifier === "triple") return `${base} bg-key-bg opacity-75 text-key-triple`;
      return `${base} bg-key-bg`;
    }
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
    <div className={`grid h-full gap-keypad-gap ${GRID[layout]}`} role="group">
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
