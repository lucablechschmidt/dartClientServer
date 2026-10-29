"use client";

import { useState } from "react";
import { CardRow } from "./card-list";
import { FormError, TextButton, TextInput } from "./form-controls";

type Props = {
  /** Collapsed: the row is one button with this label. */
  label: string;
  placeholder: string;
  saveLabel: string;
  cancelLabel: string;
  /** Submits the form; resolves to an error text to show, or null to close the row. */
  onSubmit: (formData: FormData) => Promise<string | null>;
};

/**
 * Last row of a CardList that expands into "name input + save + cancel" (legacy AddPlayer row).
 * The row closes only after the action has finished; unmounting in onSubmit would abort it.
 */
export function AddRow({ label, placeholder, saveLabel, cancelLabel, onSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Controlled on purpose: React 19 resets a form after its action, which would wipe the name
  // right when the user needs to correct it ("Diesen Namen gibt es schon").
  const [name, setName] = useState("");
  const submit = async (fd: FormData) => {
    const message = await onSubmit(fd);
    setError(message);
    if (message === null) {
      setOpen(false);
      setName("");
    }
  };
  return (
    <CardRow className="flex-col items-stretch">
      {open ? (
        <form action={submit} className="flex w-full gap-2">
          <TextInput inline name="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} autoFocus placeholder={placeholder} autoComplete="off" />
          <TextButton type="submit">{saveLabel}</TextButton>
          <TextButton tone="muted" onClick={() => setOpen(false)}>{cancelLabel}</TextButton>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setError(null);
          }}
          className="min-h-touch w-full text-center text-base text-accent"
        >
          {label}
        </button>
      )}
      {open && error && <FormError>{error}</FormError>}
    </CardRow>
  );
}
