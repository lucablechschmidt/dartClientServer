"use client";

import { useEffect, useRef, useState } from "react";

type Size = { width: number; height: number };

/**
 * The rendered size of an element in CSS pixels, kept up to date with a ResizeObserver. Until the first
 * measurement (and on the server) it is `fallback`. Charts use it to draw in pixels instead of stretching
 * a fixed viewBox, so their text stays the same size on every screen.
 */
export function useElementSize<T extends Element>(fallback: Size) {
  const ref = useRef<T>(null);
  const [size, setSize] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize((s) => (s.width === width && s.height === height ? s : { width, height }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}
