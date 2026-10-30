import { dartScore } from "../game/scoring";
import type { Dart, LegState, PlayerId } from "../game/types";

/** Port of CricketGame / Field (legacy-analysis.md §4). */

/** In the order of the board table (Figma: 15 on top, Bull at the bottom). */
export const CRICKET_FIELDS = [15, 16, 17, 18, 19, 20, 25] as const;
export type CricketField = (typeof CRICKET_FIELDS)[number];
const MARKS_TO_CLOSE = 3;

const MULTIPLIER = { single: 1, double: 2, triple: 3, overthrown: 0 } as const;
const isCricketField = (field: number): field is CricketField => (CRICKET_FIELDS as readonly number[]).includes(field);

export type Tally = {
  /** Marks per player and field (can be more than 3). */
  marks: Record<PlayerId, Record<CricketField, number>>;
  points: Record<PlayerId, number>;
  /** Winner, once a player has every field closed and strictly the most points after one of his darts. */
  winner: PlayerId | null;
  /** Darts thrown up to the win (all darts if nobody has won). */
  darts: number;
};

const emptyMarks = (): Record<CricketField, number> => ({ 15: 0, 16: 0, 17: 0, 18: 0, 19: 0, 20: 0, 25: 0 });

/** The whole leg replayed dart by dart: marks, points and whether someone has won. */
export function tally(state: LegState): Tally {
  const marks = Object.fromEntries(state.players.map((p) => [p, emptyMarks()])) as Tally["marks"];
  const points = Object.fromEntries(state.players.map((p) => [p, 0]));
  let winner: PlayerId | null = null;
  let darts = 0;
  for (const visit of state.visits) {
    for (const dart of visit.darts) {
      if (winner) break;
      darts++;
      points[visit.playerId] += scoreDart(state.players, marks, visit.playerId, dart);
      if (hasWon(state.players, marks, points, visit.playerId)) winner = visit.playerId;
    }
  }
  return { marks, points, winner, darts };
}

/**
 * Port of Field.addPlayerDartsScore: adds the marks; marks beyond the third score the field's value,
 * unless every player has the field closed now (then even the closing dart scores nothing).
 */
function scoreDart(players: PlayerId[], marks: Tally["marks"], player: PlayerId, dart: Dart): number {
  if (!isCricketField(dart.field)) return 0;
  const before = marks[player][dart.field];
  const added = MULTIPLIER[dart.type];
  marks[player][dart.field] = before + added;
  if (players.every((p) => marks[p][dart.field as CricketField] >= MARKS_TO_CLOSE)) return 0;
  const surplus = before + added - Math.max(before, MARKS_TO_CLOSE);
  return surplus > 0 ? (dartScore(dart) / added) * surplus : 0;
}

/** Port of cricketGameIsDone: every field closed and strictly more points than everyone else. */
function hasWon(players: PlayerId[], marks: Tally["marks"], points: Record<PlayerId, number>, player: PlayerId): boolean {
  const allClosed = CRICKET_FIELDS.every((f) => marks[player][f] >= MARKS_TO_CLOSE);
  return allClosed && players.every((p) => p === player || points[p] < points[player]);
}

export const closedFields = (t: Tally, player: PlayerId): number =>
  CRICKET_FIELDS.filter((f) => t.marks[player][f] >= MARKS_TO_CLOSE).length;
export const isClosedForAll = (t: Tally, players: PlayerId[], field: CricketField): boolean =>
  players.every((p) => t.marks[p][field] >= MARKS_TO_CLOSE);
