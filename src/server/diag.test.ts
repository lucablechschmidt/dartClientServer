import { describe, expect, it } from "vitest";
import { diagHeaders } from "./diag";

describe("diagHeaders (m12-plan §B2)", () => {
  it("the forwarding headers in a fixed order, missing as null, every tailscale-* header, no cookie", () => {
    const h = new Headers({
      cookie: "darts_session=secret",
      authorization: "Basic x",
      host: "dartserver.example",
      "x-forwarded-for": "100.64.0.1, 172.18.0.1",
      "tailscale-user-login": "someone",
      "tailscale-funnel-request": "?1",
    });
    expect(diagHeaders(h)).toEqual([
      ["x-forwarded-for", "100.64.0.1, 172.18.0.1"],
      ["x-forwarded-host", null],
      ["x-forwarded-proto", null],
      ["x-real-ip", null],
      ["host", "dartserver.example"],
      ["origin", null],
      ["user-agent", null],
      ["tailscale-funnel-request", "?1"],
      ["tailscale-user-login", "someone"],
    ]);
  });
});
