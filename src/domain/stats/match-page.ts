import type { ModeId } from "../game";

/** The modes with a match page (`/match/[id]/stats`): X01 (M8) and SplitScore (25.11.2026). */
export const hasMatchPage = (mode: ModeId): boolean => mode === "x01" || mode === "splitscore";
