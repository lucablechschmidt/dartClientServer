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
}: Props<V>) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value)?.label ?? String(value);

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
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
          className={`absolute top-full z-30 mt-2 flex min-w-full flex-col gap-1 rounded-panel bg-card-bg p-1.5 text-fg shadow-floating ${align === "end" ? "right-0" : "left-0"}`}
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
        </ul>
      )}
    </div>
  );
}

/** The chevron of a choice trigger; points up while the list is open. */
export function DisclosureChevron({ open }: { open: boolean }) {
  return <ChevronDownIcon className={`size-icon-sm shrink-0 ${open ? "rotate-180" : ""}`} />;
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
