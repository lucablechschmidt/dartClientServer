"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Confirmation prompt as an in-app overlay (no browser `confirm`): text and two buttons, the
 * confirming one red. Escape and a tap on the backdrop cancel. Reusable.
 */
export function ConfirmSheet({ open, text, confirmLabel, cancelLabel, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-scrim p-4 sm:items-center" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-label={text} className="w-full max-w-sm rounded-panel bg-card-bg p-5 text-fg shadow-floating" onClick={(e) => e.stopPropagation()}>
        <p className="pb-4 text-center text-base">{text}</p>
        <div className="flex gap-2">
          <button ref={cancelRef} type="button" onClick={onCancel} className="min-h-touch flex-1 rounded-box border border-separator font-medium">
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
