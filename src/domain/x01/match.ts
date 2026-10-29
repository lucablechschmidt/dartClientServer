import { applyDart, playOutUndo, undoDart } from "./apply";
import { currentPlayer, isLegFinished, openVisit, winnerOf } from "./selectors";
import { newLeg } from "./state";
import type { ApplyError, Dart, LegState, PlayerId, Result, Rules, StarterError, UndoError, Visit } from "./types";

/**
 * A match is a list of legs (M5). `LegState` stays the unit that applyDart/undoDart know; legs,
 * sets, the throw and the match end are projections over the list. The next leg exists only once
 * its first dart is thrown or its starter is chosen, so undo across a leg boundary is "drop the
 * empty leg, then undo in the previous one".
 */

/** Sets and legs; with 3+ players always 1/1 (E7), the leg is then played down to all places. */
export type MatchFormat = { legsToWinSet: number; setsToWinMatch: number };

export type MatchState = {
  players: PlayerId[];
  rules: Rules;
  format: MatchFormat;
  /** Never empty; the last one is the current leg. */
  legs: LegState[];
};

export type LegNumber = { setNo: number; legNo: number };
export type MatchScore = { legs: Record<PlayerId, number>; sets: Record<PlayerId, number> };
export type MatchProgress = "running" | "leg-finished" | "finished";

export function newMatch(players: PlayerId[], rules: Rules, format: MatchFormat, starter = 0): MatchState {
  return { players: [...players], rules, format, legs: [newLeg(players, rules, starter)] };
}

export const currentLeg = (m: MatchState): LegState => m.legs[m.legs.length - 1];
const withCurrentLeg = (m: MatchState, leg: LegState): MatchState => ({ ...m, legs: [...m.legs.slice(0, -1), leg] });
const zeros = (players: PlayerId[]) => Object.fromEntries(players.map((p) => [p, 0]));

/**
 * One pass over the legs: set/leg number of every leg (plus the next one) and the score after them.
 * The legs of a won set stay visible ("Legs 2:1 · Sets 1:0") until the first leg of the next set exists.
 */
function walk(m: MatchState): { numbers: LegNumber[]; score: MatchScore } {
  let legs = zeros(m.players);
  const sets = zeros(m.players);
  let setNo = 1;
  let legNo = 1;
  let setWon = false;
  const numbers: LegNumber[] = [];
  const startNextSet = () => {
    legs = zeros(m.players);
    setNo++;
    legNo = 1;
    setWon = false;
  };
  for (const leg of m.legs) {
    if (setWon) startNextSet();
    numbers.push({ setNo, legNo });
    const winner = isLegFinished(leg) ? winnerOf(leg) : null;
    if (!winner) continue;
    legs[winner]++;
    if (legs[winner] >= m.format.legsToWinSet) {
      sets[winner]++;
      setWon = true;
    } else {
      legNo++;
    }
  }
  const score = { legs, sets };
  if (setWon) startNextSet();
  numbers.push({ setNo, legNo });
  return { numbers, score };
}

/** Set and leg number per leg, in the order of `m.legs`. */
export const legNumbers = (m: MatchState): LegNumber[] => walk(m).numbers.slice(0, m.legs.length);
/** Set and leg number the next leg would get. */
export const nextLegNumber = (m: MatchState): LegNumber => walk(m).numbers[m.legs.length];
/** Legs won in the current set and sets won, per player. */
export const matchScore = (m: MatchState): MatchScore => walk(m).score;

export function matchWinner(m: MatchState): PlayerId | null {
  const { sets } = matchScore(m);
  return m.players.find((p) => sets[p] >= m.format.setsToWinMatch) ?? null;
}

export function matchStatus(m: MatchState): MatchProgress {
  if (matchWinner(m)) return "finished";
  return isLegFinished(currentLeg(m)) ? "leg-finished" : "running";
}

/** The throw moves one seat on per leg, across sets too (M5 plan §9.1), from whoever started the last leg. */
export const nextStarter = (m: MatchState): number => (currentLeg(m).starter + 1) % m.players.length;

/** Who throws next; between two legs the starter of the coming one. */
export function matchCurrentPlayer(m: MatchState): PlayerId {
  return matchStatus(m) === "leg-finished" ? m.players[nextStarter(m)] : currentPlayer(currentLeg(m));
}

const startNextLeg = (m: MatchState, starter = nextStarter(m)): MatchState => ({
  ...m,
  legs: [...m.legs, newLeg(m.players, m.rules, starter)],
});

/** Where the next closed visit goes (E11 commit position): after a finished leg, seq 0 of the next one. */
export function nextVisitPosition(m: MatchState): { legIndex: number; seq: number } {
  if (matchStatus(m) === "leg-finished") return { legIndex: m.legs.length, seq: 0 };
  const leg = currentLeg(m);
  return { legIndex: m.legs.length - 1, seq: leg.visits.length - (openVisit(leg) ? 1 : 0) };
}

/** Number of closed visits in the whole match; only those are known to the server. */
export const closedVisits = (m: MatchState): number =>
  m.legs.reduce((n, leg) => n + leg.visits.length, 0) - (openVisit(currentLeg(m)) ? 1 : 0);

/** A dart in the match: after a finished leg it opens the next one. */
export function applyMatchDart(m: MatchState, dart: Dart): Result<MatchState, ApplyError> {
  const base = matchStatus(m) === "leg-finished" ? startNextLeg(m) : m;
  const r = applyDart(currentLeg(base), dart);
  return r.ok ? { ok: true, value: withCurrentLeg(base, r.value) } : r;
}

const withoutEmptyLegs = (m: MatchState): MatchState => {
  let base = m;
  while (base.legs.length > 1 && currentLeg(base).visits.length === 0) base = { ...base, legs: base.legs.slice(0, -1) };
  return base;
};

/** Applies a leg-level undo to the current leg; a leg left empty disappears, so the previous leg is finished again. */
function undoInLeg(m: MatchState, undo: (leg: LegState) => Result<LegState, UndoError>): Result<MatchState, UndoError> {
  const base = withoutEmptyLegs(m);
  const r = undo(currentLeg(base));
  if (!r.ok) return r;
  const next = withCurrentLeg(base, r.value);
  const dropEmpty = next.legs.length > 1 && r.value.visits.length === 0;
  return { ok: true, value: dropEmpty ? { ...next, legs: next.legs.slice(0, -1) } : next };
}

/** Undo one dart (client, local scoring). */
export const undoMatchDart = (m: MatchState): Result<MatchState, UndoError> => undoInLeg(m, undoDart);

/** Undo one stored step on the server: a whole visit, or a play-out decision (E11 `undoVisit`). */
export const undoMatchVisit = (m: MatchState): Result<MatchState, UndoError> =>
  undoInLeg(m, (leg) => {
    const toggled = playOutUndo(leg);
    if (toggled) return { ok: true, value: toggled };
    return leg.visits.length > 0 ? { ok: true, value: { ...leg, visits: leg.visits.slice(0, -1) } } : { ok: false, reason: "nothing-to-undo" };
  });

/** The most recent visit of the whole match (empty legs skipped), or null. */
export const lastVisitOfMatch = (m: MatchState): Visit | null => currentLeg(withoutEmptyLegs(m)).visits.at(-1) ?? null;

/** ToStart: choose who throws first, only before the first dart of a leg (between legs: the next one). */
export function setLegStarter(m: MatchState, playerId: PlayerId): Result<MatchState, StarterError> {
  const seat = m.players.indexOf(playerId);
  if (seat < 0) return { ok: false, reason: "unknown-player" };
  const status = matchStatus(m);
  if (status === "finished") return { ok: false, reason: "leg-finished" };
  if (status === "leg-finished") return { ok: true, value: startNextLeg(m, seat) };
  if (currentLeg(m).visits.length > 0) return { ok: false, reason: "leg-started" };
  return { ok: true, value: withCurrentLeg(m, { ...currentLeg(m), starter: seat }) };
}
