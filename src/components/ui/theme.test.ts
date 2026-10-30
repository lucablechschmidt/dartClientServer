import { describe, expect, it } from "vitest";
import { applyPreference, nextPreference, readPreference, resolveTheme, themeInitScript } from "./theme";

const storageWith = (value: string | null) => ({ getItem: () => value });

describe("readPreference", () => {
  it("defaults to system when nothing or garbage is stored", () => {
    expect(readPreference(null)).toBe("system");
    expect(readPreference(storageWith(null))).toBe("system");
    expect(readPreference(storageWith("blue"))).toBe("system");
  });
  it("returns stored valid values", () => {
    expect(readPreference(storageWith("dark"))).toBe("dark");
    expect(readPreference(storageWith("light"))).toBe("light");
  });
  it("survives a throwing storage", () => {
    expect(
      readPreference({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("follows the system when preference is system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
  it("ignores the system when a mode is forced", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("nextPreference", () => {
  it("cycles system → light → dark → system", () => {
    expect(nextPreference("system")).toBe("light");
    expect(nextPreference("light")).toBe("dark");
    expect(nextPreference("dark")).toBe("system");
  });
});

describe("applyPreference", () => {
  const fakeRoot = () => {
    const attrs = new Map<string, string>();
    return {
      attrs,
      el: {
        setAttribute: (k: string, v: string) => attrs.set(k, v),
        removeAttribute: (k: string) => attrs.delete(k),
      } as unknown as HTMLElement,
    };
  };
  it("sets the attribute for an explicit mode and removes it for system", () => {
    const { attrs, el } = fakeRoot();
    applyPreference(el, "dark");
    expect(attrs.get("data-theme")).toBe("dark");
    applyPreference(el, "system");
    expect(attrs.has("data-theme")).toBe(false);
  });
});

describe("themeInitScript", () => {
  it("is self-contained and references the storage key", () => {
    expect(themeInitScript).toContain('"theme"');
    expect(themeInitScript).toContain("data-theme");
    // Parsing the inline script is the point of this test; it is our own constant, not user input.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    expect(() => new Function(themeInitScript)).not.toThrow();
  });
});
