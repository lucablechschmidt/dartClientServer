import { placeNumbers, type ScoreboardView } from "./board";
import { currentLeg, matchScore, matchStatus, matchWinner, nextStarter, type MatchProgress, type MatchState } from "./match";
import { projectBoard, remainingPlayer, standings, winnerOf } from "./modes";
import { newLeg } from "./state";
import type { PlayerId } from "./types";

/** What the scoring screen shows for the whole match (M5); components get only this. */
export type MatchBoardView = {
  /** The displayed leg: the current one, or the coming one between two legs. */
  board: ScoreboardView;
  progress: MatchProgress;
  /** Winner of the leg just finished (leg victory screen). */
  legWinnerId: PlayerId | null;
  matchWinnerId: PlayerId | null;
  /** Legs in the current set and sets, only when more than one is played (M5 plan §9.4). */
  score: { legs: Record<PlayerId, number> | null; sets: Record<PlayerId, number> | null } | null;
  /** Players in place order (by the places of the leg; X01 with 2 players: match winner first). */
  ranking: PlayerId[];
  /** Place per player for the victory screen; ties share a place (SplitScore, M7). */
  places: Record<PlayerId, number>;
  /** X01, 3+ players with the places fixed: the one who may still play out. */
  lastPlayerId: PlayerId | null;
  playOut: boolean;
  /** No dart thrown yet in the displayed leg: the starter may still be chosen (ToStart). */
  canChooseStarter: boolean;
};

/** Place groups of the match: by the last leg, except X01 with 2 players, where the match winner is first. */
export function matchStandings(m: MatchState): PlayerId[][] {
  const winner = matchWinner(m);
  if (m.mode === "x01" && m.players.length <= 2) {
    return winner ? [[winner], ...m.players.filter((p) => p !== winner).map((p) => [p])] : m.players.map((p) => [p]);
  }
  const groups = standings(currentLeg(m));
  const listed = groups.flat();
  const rest = m.players.filter((p) => !listed.includes(p));
  return rest.length > 0 ? [...groups, rest] : groups;
}

/**
 * `upcoming`: between two legs, after the leg victory screen was closed; shows the coming leg
 * with its starter, which the first dart then creates.
 */
export function projectMatch(m: MatchState, names: Record<PlayerId, string>, upcoming = false): MatchBoardView {
  const progress = matchStatus(m);
  const leg = progress === "leg-finished" && upcoming ? newLeg(m.players, m.rules, nextStarter(m), m.mode) : currentLeg(m);
  const finished = currentLeg(m);
  const { legs, sets } = matchScore(m);
  const multi = m.format.legsToWinSet > 1 || m.format.setsToWinMatch > 1;
  const groups = matchStandings(m);
  return {
    board: projectBoard(leg, names),
    progress,
    legWinnerId: progress === "running" ? null : winnerOf(finished),
    matchWinnerId: matchWinner(m),
    score: multi ? { legs: m.format.legsToWinSet > 1 ? legs : null, sets: m.format.setsToWinMatch > 1 ? sets : null } : null,
    ranking: groups.flat(),
    places: placeNumbers(groups),
    lastPlayerId: remainingPlayer(finished),
    playOut: finished.playOut,
    canChooseStarter: progress !== "finished" && leg.visits.length === 0,
  };
}
