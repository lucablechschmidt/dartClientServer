import { describe, expect, it, vi } from "vitest";
import { MatchHub } from "./match-events";

describe("MatchHub", () => {
  it("publish reaches every subscriber of that match and nobody else; unsubscribe stops it", () => {
    const hub = new MatchHub();
    const a1 = vi.fn();
    const a2 = vi.fn();
    const b = vi.fn();
    const offA1 = hub.subscribe("a", a1);
    hub.subscribe("a", a2);
    hub.subscribe("b", b);
    hub.publish("a");
    expect(a1).toHaveBeenCalledTimes(1);
    expect(a2).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
    offA1();
    hub.publish("a");
    expect(a1).toHaveBeenCalledTimes(1);
    expect(a2).toHaveBeenCalledTimes(2);
    expect(hub.subscriberCount("a")).toBe(1);
    hub.publish("unknown"); // no error
  });
  it("a throwing subscriber does not stop the others", () => {
    const hub = new MatchHub();
    const ok = vi.fn();
    hub.subscribe("a", () => {
      throw new Error("closed");
    });
    hub.subscribe("a", ok);
    hub.publish("a");
    expect(ok).toHaveBeenCalledTimes(1);
  });
});
