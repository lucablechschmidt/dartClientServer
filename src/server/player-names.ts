import type { Player } from "@/domain/player";
import { de } from "@/i18n/de";

/**
 * The name shown for a player in matches, the history and tournaments: a deleted player keeps the
 * name, marked as deleted (architecture.md §6). The only place the server adds a text to data.
 */
export const shownName = (p: Pick<Player, "name" | "deletedAt">): string =>
  p.deletedAt === null ? p.name : de.players.deletedName.replace("{name}", p.name);
