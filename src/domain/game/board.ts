import { dartLabel } from "./scoring";
import { MAX_DARTS_PER_VISIT, type ModeId, type PlayerId, type Visit } from "./types";

/** Pure projection of a leg for the scoring screen, the same shape for every mode. Components get only this. */

export type DartSlotView = { label: string | null; isCurrent: boolean; isOverthrown: boolean };

/** Cricket (M7): marks of one player on one field; `closed` = closed by every player. */
export type CricketMark = { field: number; marks: number; closed: boolean };

export type PlayerPanelData = {
  id: PlayerId;
  name: string;
  /** X01: rest; Cricket, Elimination, SplitScore: points. */
  score: number;
  darts: number;
  /** X01 3-dart average, points per visit in Elimination and SplitScore; null in Cricket (no average shown). */
  average: number | null;
  isActive: boolean;
  isWinner: boolean;
  slots: DartSlotView[];
  isBust: boolean;
  /** 3+ players: place once the player is out (X01 checkout); the last one keeps showing his score. */
  placement: number | null;
  /** Checked out (X01, 3+ players); the panel is dimmed. */
  isOut: boolean;
  /** Cricket only: the seven fields 15–20 and Bull. */
  marks?: CricketMark[];
};

/** The line between panels and keypad; texts come from i18n, the domain only says what. */
export type BoardHint =
  | { kind: "checkout"; text: string }
  /** Elimination: points to the next player above, who would be sent back to 0. */
  | { kind: "elimination"; points: number }
  /** SplitScore: the current target. */
  | { kind: "target"; target: string };

export type ScoreboardView = {
  mode: ModeId;
  players: PlayerPanelData[];
  activePlayerId: PlayerId;
  winnerId: PlayerId | null;
  dartsLeft: number;
  hint: BoardHint | null;
  canUndo: boolean;
  /** Players best first, for the victory screen. */
  ranking: PlayerId[];
  /** SplitScore: the points of all players together, shown on the victory screen (legacy getTotalGameScore). */
  total?: number;
  /** Cricket (Figma): who throws after the current visit, shown below the keypad. */
  nextPlayerId?: PlayerId;
};

/**
 * The three dart slots of a panel. `missed` marks darts that count nothing (SplitScore off the
 * target) like overthrown slots.
 */
export function slotsOf(visit: Visit, isActive: boolean, finished: boolean, missed: (index: number) => boolean = () => false): DartSlotView[] {
  return Array.from({ length: MAX_DARTS_PER_VISIT }, (_, i) => {
    const d = visit.darts[i];
    return {
      label: d ? dartLabel(d) : null,
      isCurrent: isActive && !finished && i === visit.darts.length,
      isOverthrown: d?.type === "overthrown" || (d !== undefined && missed(i)),
    };
  });
}

/** Places from standings: ties share a place, the next place skips (1, 1, 3). */
export function placeNumbers(standings: PlayerId[][]): Record<PlayerId, number> {
  const out: Record<PlayerId, number> = {};
  let place = 1;
  for (const group of standings) {
    for (const p of group) out[p] = place;
    place += group.length;
  }
  return out;
}

/**
 * Place groups from a comparison (negative = `a` ahead): equal players share a group. A `winner`
 * stands alone in first place regardless of the comparison (Cricket, Elimination).
 */
export function groupStandings(players: PlayerId[], compare: (a: PlayerId, b: PlayerId) => number, winner: PlayerId | null = null): PlayerId[][] {
  const groups: PlayerId[][] = winner ? [[winner]] : [];
  const rest = players.filter((p) => p !== winner).sort(compare);
  rest.forEach((p, i) => {
    if (i > 0 && compare(rest[i - 1], p) === 0) groups.at(-1)!.push(p);
    else groups.push([p]);
  });
  return groups;
}
