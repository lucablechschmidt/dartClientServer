import { checkoutHint } from "../checkouts";
import { currentLeg, matchScore, matchStatus, matchWinner, nextStarter, type MatchProgress, type MatchState } from "./match";
import { dartLabel } from "./scoring";
import { newLeg } from "./state";
import {
  checkoutOrder,
  currentPlayer,
  currentVisit,
  dartsThrown,
  isLegFinished,
  lastVisitOf,
  placements,
  playersByRest,
  remainingPlayer,
  scoreOf,
  threeDartAverage,
  winnerOf,
} from "./selectors";
import { MAX_DARTS_PER_VISIT, type LegState, type PlayerId } from "./types";

/** Pure projection of the leg state for the scoring screen. Components get only this. */

export type DartSlotView = { label: string | null; isCurrent: boolean; isOverthrown: boolean };

export type PlayerPanelData = {
  id: PlayerId;
  name: string;
  rest: number;
  darts: number;
  average: number;
  isActive: boolean;
  isWinner: boolean;
  slots: DartSlotView[];
  isBust: boolean;
  /** 3+ players: place once the player has checked out; the last one keeps showing his rest. */
  placement: number | null;
  /** Checked out (3+ players); the panel is dimmed. */
  isOut: boolean;
};

export type ScoreboardView = {
  players: PlayerPanelData[];
  activePlayerId: PlayerId;
  winnerId: PlayerId | null;
  dartsLeft: number;
  checkoutHint: string | null;
  canUndo: boolean;
  /** Players sorted by rest, for the victory screen. */
  ranking: PlayerId[];
};

export function projectScoreboard(state: LegState, names: Record<PlayerId, string>): ScoreboardView {
  const active = currentPlayer(state);
  const winner = isLegFinished(state) ? winnerOf(state) : null;
  const open = currentVisit(state);
  const dartsLeft = winner ? 0 : MAX_DARTS_PER_VISIT - open.darts.length;
  const rest = scoreOf(state, active);

  const out = checkoutOrder(state);
  const places = state.players.length > 2 ? placements(state) : [];
  const players = state.players.map((id): PlayerPanelData => {
    const visit = lastVisitOf(state, id);
    const isActive = id === active;
    const slots: DartSlotView[] = Array.from({ length: MAX_DARTS_PER_VISIT }, (_, i) => {
      const d = visit.darts[i];
      return {
        label: d ? dartLabel(d) : null,
        isCurrent: isActive && !winner && i === visit.darts.length,
        isOverthrown: d?.type === "overthrown",
      };
    });
    return {
      id,
      name: names[id] ?? id,
      rest: scoreOf(state, id),
      darts: dartsThrown(state, id),
      average: threeDartAverage(state, id),
      isActive,
      isWinner: id === winner,
      slots,
      isBust: visit.isBust,
      placement: places.length > 0 && out.includes(id) ? places.indexOf(id) + 1 : null,
      isOut: state.players.length > 2 && out.includes(id),
    };
  });

  return {
    players,
    activePlayerId: active,
    winnerId: winner,
    dartsLeft,
    checkoutHint: winner ? null : checkoutHint(rest, dartsLeft),
    canUndo: state.visits.length > 0,
    ranking: playersByRest(state),
  };
}

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
  /** Players in place order (3+ players: by checkout, the last one last; otherwise winner first). */
  ranking: PlayerId[];
  /** 3+ players with the places fixed: the one who may still play out. */
  lastPlayerId: PlayerId | null;
  playOut: boolean;
  /** No dart thrown yet in the displayed leg: the starter may still be chosen (ToStart). */
  canChooseStarter: boolean;
};

/**
 * `upcoming`: between two legs, after the leg victory screen was closed; shows the coming leg
 * with its starter, which the first dart then creates.
 */
export function projectMatch(m: MatchState, names: Record<PlayerId, string>, upcoming = false): MatchBoardView {
  const progress = matchStatus(m);
  const leg = progress === "leg-finished" && upcoming ? newLeg(m.players, m.rules, nextStarter(m)) : currentLeg(m);
  const finished = currentLeg(m);
  const { legs, sets } = matchScore(m);
  const multi = m.format.legsToWinSet > 1 || m.format.setsToWinMatch > 1;
  const winner = matchWinner(m);
  const ranking = m.players.length > 2 ? placements(finished) : winner ? [winner, ...m.players.filter((p) => p !== winner)] : [...m.players];
  return {
    board: projectScoreboard(leg, names),
    progress,
    legWinnerId: progress === "running" ? null : winnerOf(finished),
    matchWinnerId: winner,
    score: multi ? { legs: m.format.legsToWinSet > 1 ? legs : null, sets: m.format.setsToWinMatch > 1 ? sets : null } : null,
    ranking,
    lastPlayerId: remainingPlayer(finished),
    playOut: finished.playOut,
    canChooseStarter: progress !== "finished" && leg.visits.length === 0,
  };
}
