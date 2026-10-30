"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Two-tap confirmation without a dialog: the first tap arms an action (the button shows a
 * "tap again" label), a second tap on the same key within `windowMs` runs it.
 */
export function useConfirmTap(windowMs = 5000) {
  const [armed, setArmed] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const tap = (key: string, run: () => void) => {
    if (timer.current) clearTimeout(timer.current);
    if (armed === key) {
      setArmed(null);
      run();
      return;
    }
    setArmed(key);
    timer.current = setTimeout(() => setArmed((a) => (a === key ? null : a)), windowMs);
  };
  /** The label to show: the confirm text while armed, otherwise the normal one. */
  const label = (key: string, normal: string, confirm: string) => (armed === key ? confirm : normal);
  return { tap, label };
}
