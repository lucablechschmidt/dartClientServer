import { checkoutHint } from "../checkouts";
import { slotsOf, type PlayerPanelData, type ScoreboardView } from "../game/board";
import { MAX_DARTS_PER_VISIT, type LegState, type PlayerId } from "../game/types";
import {
  checkoutOrder,
  currentPlayer,
  currentVisit,
  dartsThrown,
  isLegFinished,
  lastVisitOf,
  placements,
  playersByRest,
  scoreOf,
  threeDartAverage,
  winnerOf,
} from "./selectors";

/** X01 projection of a leg for the scoring screen: rest, darts, 3-dart average, checkout hint. */
export function projectScoreboard(state: LegState, names: Record<PlayerId, string>): ScoreboardView {
  const active = currentPlayer(state);
  const winner = isLegFinished(state) ? winnerOf(state) : null;
  const open = currentVisit(state);
  const dartsLeft = winner ? 0 : MAX_DARTS_PER_VISIT - open.darts.length;
  const rest = scoreOf(state, active);
  const hint = winner ? null : checkoutHint(rest, dartsLeft);

  const out = checkoutOrder(state);
  const places = state.players.length > 2 ? placements(state) : [];
  const players = state.players.map((id): PlayerPanelData => {
    const visit = lastVisitOf(state, id);
    const isActive = id === active;
    return {
      id,
      name: names[id] ?? id,
      score: scoreOf(state, id),
      darts: dartsThrown(state, id),
      average: threeDartAverage(state, id),
      isActive,
      isWinner: id === winner,
      slots: slotsOf(visit, isActive, winner !== null),
      isBust: visit.isBust,
      placement: places.length > 0 && out.includes(id) ? places.indexOf(id) + 1 : null,
      isOut: state.players.length > 2 && out.includes(id),
    };
  });

  return {
    mode: "x01",
    players,
    activePlayerId: active,
    winnerId: winner,
    dartsLeft,
    hint: hint ? { kind: "checkout", text: hint } : null,
    canUndo: state.visits.length > 0,
    ranking: playersByRest(state),
  };
}
