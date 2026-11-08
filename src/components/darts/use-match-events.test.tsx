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
afterEach(() => {
  vi.unstubAllGlobals();
  visibility("visible", false);
});

function visibility(state: DocumentVisibilityState, dispatch = true) {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  if (dispatch) document.dispatchEvent(new Event("visibilitychange"));
}

describe("useMatchEvents", () => {
  it("subscribes to the match stream, fires on change and on every (re)connect, closes on unmount", () => {
    const onChange = vi.fn();
    const { unmount } = renderHook(() => useMatchEvents("m1", onChange));
    const source = FakeEventSource.instances[0];
    expect(source.url).toBe("/api/match/m1/events");
    source.emit("change");
    expect(onChange).toHaveBeenCalledTimes(1);
    source.emit("open"); // (re)connected: changes made meanwhile sent no event
    expect(onChange).toHaveBeenCalledTimes(2);
    unmount();
    expect(source.closed).toBe(true);
    source.emit("change");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("closes the stream while the tab is hidden and reconnects when it is visible again (R-12)", () => {
    const onChange = vi.fn();
    renderHook(() => useMatchEvents("m1", onChange));
    const first = FakeEventSource.instances[0];
    visibility("hidden");
    expect(first.closed).toBe(true);
    first.emit("change");
    expect(onChange).not.toHaveBeenCalled();
    visibility("hidden"); // no second close, no new stream
    expect(FakeEventSource.instances).toHaveLength(1);
    visibility("visible");
    expect(FakeEventSource.instances).toHaveLength(2);
    FakeEventSource.instances[1].emit("open"); // the reconnect brings the current state
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("a tab opened in the background connects only once it is shown", () => {
    visibility("hidden", false);
    renderHook(() => useMatchEvents("m1", () => {}));
    expect(FakeEventSource.instances).toHaveLength(0);
    visibility("visible");
    expect(FakeEventSource.instances).toHaveLength(1);
  });
  it("does nothing when disabled", () => {
    renderHook(() => useMatchEvents("m1", () => {}, false));
    expect(FakeEventSource.instances).toHaveLength(0);
  });
});
