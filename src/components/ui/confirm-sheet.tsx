"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Optional content between the question and the buttons (e.g. a choice). */
  children?: ReactNode;
};

const FOCUSABLE = "button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex='-1'])";

/**
 * Confirmation prompt as an in-app overlay (no browser `confirm`): text and two buttons, the
 * confirming one red. Escape and a tap on the backdrop cancel. Reusable. Appearing, the backdrop fades
 * in and the sheet slides up like an iOS action sheet; closing is instant.
 *
 * Focus (R-28): it starts on "cancel", Tab and Shift+Tab stay inside the sheet, and on closing it goes
 * back to where it was. Done by hand rather than with a native <dialog>, so look and animation stay
 * exactly as they are.
 */
export function ConfirmSheet({ open, text, confirmLabel, cancelLabel, onConfirm, onCancel, children }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  /** The latest onCancel; callers pass a new function on every render, which must not re-run the effect. */
  const cancel = useRef(onCancel);
  useEffect(() => {
    cancel.current = onCancel;
  });
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel.current();
      if (e.key !== "Tab") return;
      const items = [...(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
      const [first, last] = [items.at(0), items.at(-1)];
      const inside = dialogRef.current?.contains(document.activeElement) ?? false;
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (before instanceof HTMLElement && before.isConnected) before.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-scrim p-4 motion-safe:animate-fade-in sm:items-center"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={text}
        className="w-full max-w-sm rounded-panel bg-card-bg p-5 text-fg shadow-floating motion-safe:animate-sheet-in"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="pb-4 text-center text-base">{text}</p>
        {children}
        <div className="flex gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="min-h-touch flex-1 rounded-box border border-separator font-medium"
          >
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className="min-h-touch flex-1 rounded-box bg-key-undo font-semibold text-on-accent">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
