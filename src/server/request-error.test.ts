import { afterEach, describe, expect, it } from "vitest";
import { setLogSink } from "./log";
import { logRequestError } from "./request-error";

afterEach(() => setLogSink());

const capture = () => {
  const lines: string[] = [];
  setLogSink((line) => lines.push(line));
  return lines;
};
const request = { path: "/account/stats?range=30d", method: "GET" };
const context = { routePath: "/(site)/account/stats", routeType: "render" };

describe("logRequestError", () => {
  it("writes one error line with path, method, route, kind and digest", () => {
    const lines = capture();
    logRequestError(Object.assign(new Error("database is locked"), { digest: "123" }), request, context);
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toMatchObject({
      level: "error",
      event: "request.failed",
      error: "database is locked",
      path: "/account/stats?range=30d",
      method: "GET",
      route: "/(site)/account/stats",
      kind: "render",
      digest: "123",
    });
  });

  it("logs values that are not errors and leaves out a missing digest", () => {
    const lines = capture();
    logRequestError("boom", { path: "/", method: "POST" }, { routePath: "/", routeType: "action" });
    const entry = JSON.parse(lines[0]) as Record<string, unknown>;
    expect(entry).toMatchObject({ error: "boom", kind: "action" });
    expect("digest" in entry).toBe(false);
  });

  it("ignores redirect and notFound, which are control flow", () => {
    const lines = capture();
    logRequestError({ digest: "NEXT_REDIRECT;replace;/login;307;" }, request, context);
    logRequestError({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" }, request, context);
    expect(lines).toEqual([]);
  });
});
