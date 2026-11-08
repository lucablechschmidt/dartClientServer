"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChoiceMark } from "./choice-parts";

export type Choice<V extends string | number> = { value: V; label: string };

type Props<V extends string | number> = {
  name: string;
  options: readonly Choice<V>[];
  value: V;
  onChange: (value: V) => void;
  /** What is chosen (e.g. the in rule); the trigger's accessible name is "label current", both shown on screen. */
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
 *
 * Semantics (R-27): a disclosure, not a listbox, because the list may hold a text field (own score):
 * the trigger has aria-expanded/aria-controls, the options are buttons with aria-pressed. Opened
 * from the keyboard, focus moves to the chosen option; Escape closes and returns to the trigger,
 * tabbing out closes. Opened by a tap, focus stays where it is (no phone keyboard popping up).
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
  /** Opened with Enter or Space: move focus into the list once it is there. */
  const [byKeyboard, setByKeyboard] = useState(false);
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
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
    const escape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      close();
      trigger.current?.focus();
    };
    /** Tabbing out closes; a blur to nowhere (the phone keyboard's "done") keeps it open. */
    const leave = (e: FocusEvent) => e.relatedTarget instanceof Node && !root.current?.contains(e.relatedTarget) && setOpen(false);
    const node = root.current;
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    node?.addEventListener("focusout", leave);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      node?.removeEventListener("focusout", leave);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !byKeyboard) return;
    const items = list.current?.querySelectorAll<HTMLElement>("button, input");
    (list.current?.querySelector<HTMLElement>("[aria-pressed=true]") ?? items?.[0])?.focus();
  }, [open, byKeyboard]);

  return (
    <div ref={root} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        // the visible strings only (WCAG 2.5.3 label in name): "Einstieg Single In", "Startpunktzahl 501"
        aria-label={`${label} ${current}`}
        onClick={(e) => {
          // detail is 0 for a click from Enter or Space
          setByKeyboard(e.detail === 0);
          setOpen((o) => !o);
        }}
        className={`w-full text-left ${className} ${open ? openClassName : ""}`}
      >
        {children(current, open)}
      </button>
      {open && (
        <ul
          ref={list}
          id={listId}
          aria-label={label}
          className={`absolute top-full z-30 mt-2 flex min-w-full origin-top flex-col gap-1 rounded-panel bg-card-bg p-1.5 text-fg shadow-floating motion-safe:animate-pop-in ${align === "end" ? "right-0" : "left-0"}`}
        >
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={(e) => {
                    onChange(o.value);
                    setOpen(false);
                    // chosen from the keyboard: back to the trigger instead of losing focus with the list
                    if (e.detail === 0) trigger.current?.focus();
                  }}
                  className={`flex min-h-touch w-full items-center justify-between gap-6 rounded-tile px-3 text-left whitespace-nowrap ${selected ? "bg-accent-wash font-semibold" : ""}`}
                >
                  {o.label}
                  <ChoiceMark selected={selected} />
                </button>
              </li>
            );
          })}
          {last && <li>{last({ selected: !chosen, close: () => setOpen(false) })}</li>}
        </ul>
      )}
    </div>
  );
}
