"use client";

import { useCallback, useMemo, useState } from "react";
import { Keypad } from "@/components/darts/keypad";
import { ScoreGrid } from "@/components/darts/score-grid";
import { useVisitSync, type ActionReply as Reply, type MatchViewLike } from "@/components/darts/use-visit-sync";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { useAsyncAction } from "@/components/ui/use-async-action";
import {
  currentLeg,
  matchCurrentPlayer,
  mayEnter,
  mayPlayOut,
  maySetStarter,
  mayUndo,
  MISS,
  projectMatch,
  type Dart,
  type MatchState,
  type PlayerId,
} from "@/domain/game";
import type { Texts } from "@/i18n/de";
import { CricketBoard } from "./cricket-board";
import { LegVictoryScreen, scoreLine } from "./leg-victory-screen";
import { headerTitle, ScoreboardHeader } from "./scoreboard-header";
import { StandardBoard } from "./standard-board";
import { AchievementBanner, type NewAchievementsView } from "./stats/achievements";
import { VictoryScreen } from "./victory-screen";

export type { MatchViewLike };
type Reason = keyof Texts["game"]["errors"];
export type ActionReply = Reply<Reason>;

type Props = {
  initial: MatchViewLike;
  texts: Texts["game"];
  onCommitVisit: (matchId: string, legIndex: number, seq: number, darts: Dart[]) => Promise<ActionReply>;
  /** `step` names the stored step to take back, so sending it twice undoes once (M6). */
  onUndoVisit: (matchId: string, step?: string) => Promise<ActionReply>;
  onPlayOut: (matchId: string, playOut: boolean) => Promise<ActionReply>;
  onSetStarter: (matchId: string, playerId: PlayerId) => Promise<ActionReply>;
  onDecideWinner: (matchId: string, playerId: PlayerId) => Promise<ActionReply>;
  /** M9: set for tournament games; the victory screen leads back there. */
  tournamentHref?: string;
  onLoad: (matchId: string) => Promise<ActionReply>;
  onRestart: (matchId: string) => Promise<void>;
  /** Redirects home on success; answers only when cancelling is not possible. */
  onCancel: (matchId: string) => Promise<{ ok: true } | { ok: false; reason: Reason }>;
  /** M10: what the finished game brought each player that is new (the victory screen's banner). */
  onLoadAchievements?: (matchId: string) => Promise<NewAchievementsView>;
  /** M10: the achievement texts for the banner. */
  achievementTexts?: Texts["achievements"];
};

/** Identifies one finished-leg state, so closing the leg victory screen survives re-renders but not an undo. */
const legKey = (m: MatchState) => `${m.legs.length}:${currentLeg(m).visits.length}`;

/**
 * The scoring screen: header with status, player panels, checkout or turn hint, keypad; the leg
 * victory screen between two legs and the victory screen at the end (M5). Scoring and server sync
 * live in `useVisitSync`.
 */
export function ScoreboardScreen({
  initial,
  texts,
  onCommitVisit,
  onUndoVisit,
  onPlayOut,
  onSetStarter,
  onDecideWinner,
  onLoad,
  onRestart,
  onCancel,
  tournamentHref,
  onLoadAchievements,
  achievementTexts,
}: Props) {
  const [asking, setAsking] = useState<"cancel" | "resign" | null>(null);
  const [closedLeg, setClosedLeg] = useState<string | null>(null);
  const errorText = useCallback((reason: Reason) => texts.errors[reason], [texts.errors]);
  // R-15: a refused cancel (not the host any more, match already closed) says why in the status line.
  const cancel = useAsyncAction(onCancel);
  const loadAchievements = useCallback(
    () => (onLoadAchievements ? onLoadAchievements(initial.id) : Promise.resolve([])),
    [onLoadAchievements, initial.id],
  );
  const { state, sync, error, isOpen, pending, stale, throwDart, throwDarts, undo, playOut, chooseStarter, decide, retryNow, discard } =
    useVisitSync<Reason>({
      initial,
      onCommitVisit,
      onUndoVisit,
      onPlayOut,
      onSetStarter,
      onDecideWinner,
      onLoad,
      errorText,
    });

  const legClosed = closedLeg === legKey(state);
  const view = useMemo(() => projectMatch(state, initial.names, legClosed), [state, initial.names, legClosed]);
  const board = view.board;
  const playerIds = state.players;
  const rules = scoreLine(view, playerIds, texts) ?? headerTitle(state.mode, initial.rules, texts);
  const unsaved = pending > 1 ? texts.unsavedVisits.replace("{n}", String(pending)) : pending === 1 ? texts.unsavedVisit : texts.unsaved;
  const shownError = error ?? (cancel.error ? texts.errors[cancel.error] : null);
  const status = shownError ?? (sync === "unsaved" ? unsaved : sync === "saving" ? texts.saving : " ");

  // E13: keypad and undo only when this device is currently allowed; the server checks anyway.
  const actor = initial.actor;
  const enterOk = isOpen && actor !== null && mayEnter(state, initial.match, actor);
  const undoOk = isOpen && actor !== null && mayUndo(state, initial.match, actor);
  const playOutOk = isOpen && actor !== null && mayPlayOut(state, initial.match, actor);
  const starterOk = isOpen && actor !== null && view.canChooseStarter && maySetStarter(initial.match, actor);
  // Undo that reopens a finished leg (from the leg victory screen or right after it) lets the screen
  // show again on the next checkout; undoing within the next leg keeps it closed.
  const undoAndReopen = () => {
    if (view.progress === "leg-finished") setClosedLeg(null);
    undo();
  };
  const starterHint = isOpen && enterOk && starterOk && playerIds.length > 1 ? texts.chooseStarter : null;
  const othersHint = !isOpen
    ? texts.closed
    : enterOk
      ? null
      : texts.turnOf.replace("{name}", initial.names[matchCurrentPlayer(state)] ?? "");
  const turnHint = othersHint ?? starterHint;
  const lastName = view.lastPlayerId ? (initial.names[view.lastPlayerId] ?? "") : "";

  const header = (
    <ScoreboardHeader
      title={rules}
      status={status}
      sync={sync}
      hasError={shownError !== null}
      onRetry={retryNow}
      onCancel={initial.access.canCancel && isOpen ? () => setAsking("cancel") : null}
      home={view.progress === "finished"}
      texts={texts}
    />
  );

  const confirm = (
    <ConfirmSheet
      open={asking !== null}
      text={asking === "resign" ? texts.resignQuestion.replace("{name}", lastName) : texts.cancelQuestion}
      confirmLabel={asking === "resign" ? texts.resign : texts.cancelConfirm}
      cancelLabel={texts.cancelBack}
      onConfirm={() => {
        if (asking === "resign") playOut(false);
        else cancel.run(initial.id);
        setAsking(null);
      }}
      onCancel={() => setAsking(null)}
    />
  );
  // M6: ten minutes without progress; the red button drops the queue, a tap outside only retries.
  const staleSheet = (
    <ConfirmSheet
      open={stale && asking === null}
      text={texts.staleQuestion}
      confirmLabel={texts.reenter}
      cancelLabel={texts.resend}
      onConfirm={discard}
      onCancel={retryNow}
    />
  );

  if (view.progress === "finished") {
    return (
      <>
        <ScoreGrid
          header={header}
          body={
            <VictoryScreen
              view={view}
              texts={texts}
              pending={sync !== "saved" || !undoOk}
              onUndoWinningDart={undo}
              onPlayOut={playOutOk ? () => playOut(true) : null}
              onRestart={() => onRestart(initial.id)}
              tournamentHref={tournamentHref}
              achievements={
                achievementTexts && <AchievementBanner load={loadAchievements} ready={sync === "saved"} texts={achievementTexts} />
              }
              statsHref={
                view.board.mode === "x01" && actor !== null && initial.match.players.some((p) => p.id === actor.id)
                  ? `/match/${initial.id}/stats?from=match`
                  : undefined
              }
            />
          }
        />
        {confirm}
        {staleSheet}
      </>
    );
  }

  if (view.progress === "leg-finished" && !legClosed) {
    return (
      <>
        <LegVictoryScreen
          view={view}
          names={initial.names}
          texts={texts}
          canUndo={undoOk && sync === "saved"}
          onContinue={() => setClosedLeg(legKey(state))}
          onUndo={undoAndReopen}
          onDecide={initial.isTournament && actor !== null && isOpen && maySetStarter(initial.match, actor) ? decide : undefined}
        />
        {staleSheet}
      </>
    );
  }

  const keypad = (
    <Keypad
      texts={{ keypad: texts.keypad, bull: texts.bull, undo: texts.undo, double: texts.double, triple: texts.triple, miss: texts.miss }}
      canThrow={enterOk}
      canUndo={undoOk}
      onDart={throwDart}
      onUndo={undoAndReopen}
      onMissRest={() => throwDarts(Array.from({ length: board.dartsLeft }, () => MISS))}
      layout={board.mode === "cricket" ? "cricket" : "full"}
    />
  );

  if (board.mode === "cricket") {
    return (
      <>
        <CricketBoard
          board={board}
          texts={texts}
          header={header}
          keypad={keypad}
          isOpen={isOpen}
          turnHint={turnHint}
          onSelectStarter={starterOk ? chooseStarter : undefined}
        />
        {confirm}
        {staleSheet}
      </>
    );
  }

  return (
    <>
      <StandardBoard
        board={board}
        texts={texts}
        header={header}
        keypad={keypad}
        turnHint={othersHint}
        starterHint={starterHint}
        onSelectStarter={starterOk ? chooseStarter : undefined}
        onResign={view.playOut && playOutOk ? () => setAsking("resign") : null}
      />
      {confirm}
      {staleSheet}
    </>
  );
}
