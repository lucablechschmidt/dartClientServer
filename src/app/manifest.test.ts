import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { de } from "@/i18n/de";
import manifest from "./manifest";

describe("PWA manifest (M12)", () => {
  const m = manifest();
  it("installs as DART and starts without the browser bar", () => {
    expect(m).toMatchObject({ name: de.app.installName, short_name: de.app.installName, start_url: "/", display: "standalone" });
  });
  it("lists 192 and 512 px icons that exist in public/, the 512 one also maskable", () => {
    const icons = m.icons ?? [];
    expect(icons.map((i) => [i.sizes, i.purpose])).toEqual([
      ["192x192", "any"],
      ["512x512", "any"],
      ["512x512", "maskable"],
    ]);
    for (const icon of icons) expect(existsSync(new URL(`../../public${icon.src}`, import.meta.url))).toBe(true);
  });
});
