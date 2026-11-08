"use client";

import { useState } from "react";
import { ChoiceMark } from "./choice-parts";

/**
 * Last entry of a number menu: a field for an own number (digits only), within min and max. Enter
 * takes it and closes the list; leaving the field after typing takes it, too.
 */
export function ChoiceNumberField({
  label,
  value,
  selected,
  min,
  max,
  onChange,
  close,
}: {
  label: string;
  value: number;
  selected: boolean;
  min: number;
  max: number;
  onChange: (value: number) => void;
  close: () => void;
}) {
  const [draft, setDraft] = useState(selected ? String(value) : "");
  const [dirty, setDirty] = useState(false);
  const take = () => {
    const typed = draft.replace(/\D/g, "");
    if (!dirty || typed === "") return false;
    const n = Math.min(Math.max(Number(typed), min), max);
    setDraft(String(n));
    setDirty(false);
    onChange(n);
    return true;
  };
  return (
    <span className={`flex min-h-touch items-center gap-3 rounded-tile px-3 ${selected ? "bg-accent-wash" : ""}`}>
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        placeholder={label}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setDirty(true);
        }}
        onBlur={() => void take()}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          if (take() || !dirty) close();
        }}
        className="w-full min-w-0 bg-transparent font-semibold tabular-nums placeholder:font-normal placeholder:text-fg-muted"
      />
      <ChoiceMark selected={selected} />
    </span>
  );
}
