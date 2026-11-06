"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CheckIcon, ChevronDownIcon } from "./icons";

export type Choice<V extends string | number> = { value: V; label: string };

type Props<V extends string | number> = {
  name: string;
  options: readonly Choice<V>[];
  value: V;
  onChange: (value: V) => void;
  /** What is chosen (e.g. the in rule); the trigger's accessible name is "label: current". */
  label: string;
  /** Content of the trigger; gets the current option's label and whether the list is open. */
  children: (current: string, open: boolean) => ReactNode;
  /** Classes of the trigger button (it fills its container); `openClassName` is added while open. */
  className?: string;
  openClassName?: string;
  /** Which edge of the trigger the list lines up with. */
  align?: "start" | "end";
  /**
   * Optional last entry (e.g. a field for an own number); `selected` when the value is none of the
   * options, `close` closes the list.
   */
  last?: (props: { selected: boolean; close: () => void }) => ReactNode;
};

/**
 * Setup choice (Figma design): a trigger that opens a floating list below it, the chosen option
 * with a filled check, the others with an empty circle. Tapping an option, outside or Escape
 * closes it. The value is also kept in a hidden input so a form submits it.
 */
export function ChoiceMenu<V extends string | number>({
  name,
  options,
  value,
  onChange,
  label,
  children,
  className = "",
  openClassName = "",
  align = "start",
  last,
}: Props<V>) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const chosen = options.find((o) => o.value === value);
  const current = chosen?.label ?? String(value);

  useEffect(() => {
    if (!open) return;
    /** A field in the list takes its input on blur; blur it before the list goes away. */
    const close = () => {
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && root.current?.contains(focused)) focused.blur();
      setOpen(false);
    };
    const outside = (e: PointerEvent) => !root.current?.contains(e.target as Node) && close();
    const escape = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${current}`}
        onClick={() => setOpen((o) => !o)}
        className={`w-full text-left ${className} ${open ? openClassName : ""}`}
      >
        {children(current, open)}
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className={`absolute top-full z-30 mt-2 flex min-w-full origin-top flex-col gap-1 rounded-panel bg-card-bg p-1.5 text-fg shadow-floating motion-safe:animate-pop-in ${align === "end" ? "right-0" : "left-0"}`}
        >
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <li key={o.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`flex min-h-touch w-full items-center justify-between gap-6 rounded-tile px-3 text-left whitespace-nowrap ${selected ? "bg-accent-wash font-semibold" : ""}`}
                >
                  {o.label}
                  {selected ? (
                    <span className="grid size-icon shrink-0 place-items-center rounded-full bg-accent text-on-accent">
                      <CheckIcon className="size-icon-xs" />
                    </span>
                  ) : (
                    <span className="size-icon shrink-0 rounded-full border-icon border-separator" />
                  )}
                </button>
              </li>
            );
          })}
          {last && (
            <li role="option" aria-selected={!chosen}>
              {last({ selected: !chosen, close: () => setOpen(false) })}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/** The chevron of a choice trigger; points up while the list is open and turns there. */
export function DisclosureChevron({ open }: { open: boolean }) {
  return (
    <ChevronDownIcon
      className={`size-icon-sm shrink-0 motion-safe:transition-transform motion-safe:duration-base motion-safe:ease-ios ${open ? "rotate-180" : ""}`}
    />
  );
}

/** Small label above the chosen value, the content of most choice triggers (in rule / Single In). */
export function LabeledValue({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-1 flex-col">
      <span className="text-xs text-fg-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

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
      {selected ? (
        <span className="grid size-icon shrink-0 place-items-center rounded-full bg-accent text-on-accent">
          <CheckIcon className="size-icon-xs" />
        </span>
      ) : (
        <span className="size-icon shrink-0 rounded-full border-icon border-separator" />
      )}
    </span>
  );
}
