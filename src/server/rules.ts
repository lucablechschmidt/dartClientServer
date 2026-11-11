import { readFileSync } from "node:fs";
import path from "node:path";
import type { ModeId } from "@/domain/game";

/** Marks a rules file that Luca has not approved yet: its first line starts like this. */
const DRAFT = "<!-- Entwurf";

/**
 * The rules of a mode as Markdown (`src/domain/<mode>/regeln.md`, shown in the setup's pop-over).
 * Null while the file is a draft (first line `<!-- Entwurf …`) or missing: the pop-over then says
 * "Regeln folgen". Approving means deleting that line. Read on the server only; next.config.ts
 * traces the files into the standalone build.
 */
export function rulesOf(mode: ModeId, root = process.cwd()): string | null {
  try {
    const text = readFileSync(path.join(root, "src", "domain", mode, "regeln.md"), "utf8");
    return text.trimStart().startsWith(DRAFT) ? null : text;
  } catch {
    return null;
  }
}
