"use client";

import { useState } from "react";
import { MinusIcon, PlusIcon } from "./icons";

type Props = {
  name: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  decreaseLabel: string;
  increaseLabel: string;
};

/** A typed number on the stepper's grid: min + k·step rounded up (best of 4 → 5), then within min and max. */
export function snapToStep(n: number, min: number, max: number, step: number): number {
  const snapped = min + Math.ceil((n - min) / step) * step;
  return Math.min(Math.max(snapped, min), max);
}

/**
 * Number with − and + (Figma design: sets and legs); the number itself can be typed, too, and is
 * snapped to the steps when the field is left. The value goes with the form in a hidden input.
 */
export function Stepper({
  name,
  label,
  value,
  onChange,
  min = 1,
  max = 9,
  step = 1,
  disabled = false,
  decreaseLabel,
  increaseLabel,
}: Props) {
  const button = "grid min-h-touch min-w-touch place-items-center rounded-tile disabled:opacity-40";
  /** What is being typed; null while the field shows the value. */
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const typed = draft.replace(/\D/g, "");
    if (typed !== "") onChange(snapToStep(Number(typed), min, max, step));
    setDraft(null);
  };
  return (
    <div className={`flex items-center justify-between gap-1 ${disabled ? "opacity-60" : ""}`}>
      <input type="hidden" name={name} value={value} />
      <span className="text-sm whitespace-nowrap text-fg-muted">{label}</span>
      <span className="flex items-center">
        <button
          type="button"
          aria-label={`${label} ${decreaseLabel}`}
          disabled={disabled || value - step < min}
          onClick={() => onChange(value - step)}
          className={button}
        >
          <MinusIcon className="size-icon-sm" />
        </button>
        <input
          type="text"
          inputMode="numeric"
          aria-label={label}
          value={draft ?? String(value)}
          disabled={disabled}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          className="w-12 rounded-tile bg-transparent text-center text-lg font-semibold tabular-nums focus:bg-fill"
        />
        <button
          type="button"
          aria-label={`${label} ${increaseLabel}`}
          disabled={disabled || value + step > max}
          onClick={() => onChange(value + step)}
          className={`${button} bg-fill`}
        >
          <PlusIcon className="size-icon-sm" />
        </button>
      </span>
    </div>
  );
}
