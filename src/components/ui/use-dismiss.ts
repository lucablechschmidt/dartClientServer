"use client";

import { useEffect, type RefObject } from "react";

/**
 * Closes something floating (choice list, pop-over) on a tap outside `root` and on Escape; Escape
 * gives the focus back to `trigger`. Only listens while `open`.
 */
export function useDismiss(open: boolean, root: RefObject<HTMLElement | null>, close: () => void, trigger?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => !root.current?.contains(e.target as Node) && close();
    const escape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      close();
      trigger?.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, root, close, trigger]);
}
