import { describe, expect, it } from "vitest";
import { readEnv } from "./env";

const HASH = "$2b$12$D9HmJZSfdcgsldYPsFwPfeGQL9USgbCm2j4nOg8Mr4DlrQrWSdc5m";

describe("readEnv", () => {
  it("reads admin, app url and cookie flag, with defaults", () => {
    expect(readEnv({ ADMIN_USER: "darts", ADMIN_PASSWORD_HASH: HASH, APP_URL: "https://x.ts.net/", COOKIE_SECURE: "false" })).toEqual({
      admin: { name: "darts", passwordHash: HASH },
      appUrl: "https://x.ts.net",
      cookieSecure: false,
    });
    expect(readEnv({})).toEqual({ admin: null, appUrl: "http://127.0.0.1:3100", cookieSecure: true });
  });
  it("no admin when only one of the two admin variables is set", () => {
    expect(readEnv({ ADMIN_USER: "darts" }).admin).toBeNull();
  });
  it("a hash mangled by $-expansion fails with a hint on escaping", () => {
    // What Next's dotenv-expand makes of an unescaped "$2b$12$…" in .env
    expect(() => readEnv({ ADMIN_USER: "darts", ADMIN_PASSWORD_HASH: "D9HmJZSfdcgsldYPsFwPfeGQL9USgbCm2j4nOg8Mr4DlrQrWSdc5m" })).toThrow(
      /ADMIN_PASSWORD_HASH.*\\\$/,
    );
    expect(() => readEnv({ APP_URL: "not a url" })).toThrow(/APP_URL/);
  });
});
