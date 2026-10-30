import { afterEach, describe, expect, it } from "vitest";
import { log, setLogSink } from "./log";

afterEach(() => setLogSink());

describe("log", () => {
  it("writes one JSON line per event with level, event and fields, dropping undefined", () => {
    const lines: [string, string][] = [];
    setLogSink((line, level) => lines.push([line, level]));
    log.info("login", { player: "Luca", ok: true, ip: undefined });
    const [line, level] = lines[0];
    expect(level).toBe("info");
    const entry = JSON.parse(line) as Record<string, unknown>;
    expect(entry).toMatchObject({ level: "info", event: "login", player: "Luca", ok: true });
    expect("ip" in entry).toBe(false);
    expect(new Date(String(entry.t)).toString()).not.toBe("Invalid Date");
  });
  it("errors carry message and a short stack on the error level", () => {
    const lines: [string, string][] = [];
    setLogSink((line, level) => lines.push([line, level]));
    log.error("cleanup.failed", new Error("locked"), { matches: 2 });
    const entry = JSON.parse(lines[0][0]) as Record<string, unknown>;
    expect(lines[0][1]).toBe("error");
    expect(entry).toMatchObject({ event: "cleanup.failed", error: "locked", matches: 2 });
    expect(entry.stack).toContain("Error: locked");
    log.error("x", "plain string");
    expect((JSON.parse(lines[1][0]) as Record<string, unknown>).error).toBe("plain string");
  });
});
