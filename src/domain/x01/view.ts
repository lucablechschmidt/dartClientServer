import { visitCheckoutHint } from "../checkouts";
import { slotsOf, type PlayerPanelData, type ScoreboardView } from "../game/board";
import { visitScore } from "../game/scoring";
import { previousVisit } from "../game/visits";
import { MAX_DARTS_PER_VISIT, type LegState, type PlayerId } from "../game/types";
import {
  checkoutOrder,
  currentPlayer,
  currentVisit,
  dartsThrown,
  isLegFinished,
  lastVisitOf,
  nextPlayer,
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
  const next = isLegFinished(state) ? active : nextPlayer(state, active);
  const dartsLeft = winner ? 0 : MAX_DARTS_PER_VISIT - open.darts.length;
  // The hint follows the route suggested at the start of the visit (checkouts.ts), so it needs the rest before it.
  const hint = winner ? null : visitCheckoutHint(scoreOf(state, active) + visitScore(open), open.darts, state.rules.outRule);
  // Playing alone, the previous visit shows faintly behind the slots to make a wrong entry easy to spot.
  const alone = state.players.length === 1;

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
      slots: slotsOf(visit, isActive, winner !== null, alone ? previousVisit(state, id, visit) : null),
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
    // None once the leg is over or the last player plays out alone.
    nextPlayerId: next === active ? undefined : next,
  };
}
