"use client";

import { useId, useState } from "react";

export type Option<V extends string | number> = { value: V; label: string };

type Props<V extends string | number> = {
  name: string;
  options: readonly Option<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Prefixed as in CustomMenu ("Sets: 1"). */
  title?: string;
  disabled?: boolean;
};

const pill = "rounded-pill bg-menu-bg px-4 text-fg disabled:opacity-60";

/**
 * Port of CustomMenu: gray pill with the current value; tapping expands the choices below it.
 * The value is also kept in a hidden input so a form submits it without JavaScript state.
 */
export function OptionMenu<V extends string | number>({ name, options, value, onChange, title, disabled = false }: Props<V>) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const current = options.find((o) => o.value === value)?.label ?? String(value);
  return (
    <div className="flex flex-col items-center gap-2">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className={`${pill} min-h-touch py-2 fluid-text-lg`}
      >
        {title ? `${title}: ${current}` : current}
      </button>
      {open && (
        <ul id={listId} className="flex flex-col items-center gap-1.5">
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                aria-pressed={o.value === value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`${pill} min-h-touch py-1 text-base ${o.value === value ? "font-semibold" : ""}`}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
