import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMatchEvents } from "./use-match-events";

/** Minimal EventSource stub: remembers listeners, can fire events. */
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  listeners = new Map<string, Set<() => void>>();
  closed = false;
  constructor(public url: string) {
    FakeEventSource.instances.push(this);
  }
  addEventListener(type: string, cb: () => void) {
    (this.listeners.get(type) ?? this.listeners.set(type, new Set()).get(type)!).add(cb);
  }
  removeEventListener(type: string, cb: () => void) {
    this.listeners.get(type)?.delete(cb);
  }
  close() {
    this.closed = true;
  }
  emit(type: string) {
    this.listeners.get(type)?.forEach((cb) => cb());
  }
}

beforeEach(() => {
  FakeEventSource.instances = [];
  vi.stubGlobal("EventSource", FakeEventSource);
});
afterEach(() => vi.unstubAllGlobals());

describe("useMatchEvents", () => {
  it("subscribes to the match stream, fires on change and on tab visibility, closes on unmount", () => {
    const onChange = vi.fn();
    const { unmount } = renderHook(() => useMatchEvents("m1", onChange));
    const source = FakeEventSource.instances[0];
    expect(source.url).toBe("/api/match/m1/events");
    source.emit("change");
    expect(onChange).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(onChange).toHaveBeenCalledTimes(2);
    unmount();
    expect(source.closed).toBe(true);
    source.emit("change");
    expect(onChange).toHaveBeenCalledTimes(2);
  });
  it("does nothing when disabled", () => {
    renderHook(() => useMatchEvents("m1", () => {}, false));
    expect(FakeEventSource.instances).toHaveLength(0);
  });
});
