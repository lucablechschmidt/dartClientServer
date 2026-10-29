import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useConfirmTap } from "./use-confirm-tap";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useConfirmTap", () => {
  it("runs only on the second tap of the same key within the window", () => {
    const run = vi.fn();
    const { result } = renderHook(() => useConfirmTap(5000));
    act(() => result.current.tap("a", run));
    expect(run).not.toHaveBeenCalled();
    expect(result.current.label("a", "Löschen", "Wirklich?")).toBe("Wirklich?");
    expect(result.current.label("b", "Löschen", "Wirklich?")).toBe("Löschen");
    act(() => result.current.tap("a", run));
    expect(run).toHaveBeenCalledTimes(1);
    expect(result.current.label("a", "Löschen", "Wirklich?")).toBe("Löschen");
  });
  it("disarms after the window; a tap on another key re-arms that one", () => {
    const run = vi.fn();
    const { result } = renderHook(() => useConfirmTap(5000));
    act(() => result.current.tap("a", run));
    act(() => vi.advanceTimersByTime(5001));
    act(() => result.current.tap("a", run));
    expect(run).not.toHaveBeenCalled();
    act(() => result.current.tap("b", run));
    act(() => result.current.tap("a", run));
    expect(run).not.toHaveBeenCalled();
  });
});
