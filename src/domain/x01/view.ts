import { checkoutHint } from "../checkouts";
import { dartLabel } from "./scoring";
import {
  currentPlayer,
  currentVisit,
  dartsThrown,
  isLegFinished,
  lastVisitOf,
  playersByRest,
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
