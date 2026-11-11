import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MODE_IDS } from "@/domain/game";
import { rulesOf } from "./rules";

const withFile = (text: string) => {
  const root = mkdtempSync(path.join(tmpdir(), "rules-"));
  mkdirSync(path.join(root, "src", "domain", "x01"), { recursive: true });
  writeFileSync(path.join(root, "src", "domain", "x01", "regeln.md"), text);
  return root;
};

describe("rulesOf", () => {
  it("every mode has a rules file", () => {
    for (const mode of MODE_IDS) expect(() => rulesOf(mode)).not.toThrow();
  });
  it("a draft (first line '<!-- Entwurf') is not shown yet", () => {
    expect(rulesOf("x01", withFile("<!-- Entwurf, 11.11.2026 -->\n\nText"))).toBeNull();
  });
  it("an approved file comes back as written", () => {
    expect(rulesOf("x01", withFile("Text\n\n### Ablauf\n"))).toBe("Text\n\n### Ablauf\n");
  });
  it("a missing file is no error", () => {
    expect(rulesOf("cricket", withFile("x"))).toBeNull();
  });
});
