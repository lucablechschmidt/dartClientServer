"use client";

import { useCallback, useMemo, useState } from "react";
import { Keypad } from "@/components/darts/keypad";
import { ScoreGrid } from "@/components/darts/score-grid";
import { useVisitSync, type ActionReply as Reply, type MatchViewLike } from "@/components/darts/use-visit-sync";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import {
  currentLeg,
  matchCurrentPlayer,
  mayEnter,
  mayPlayOut,
  maySetStarter,
  mayUndo,
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
import { VictoryScreen } from "./victory-screen";

export type { MatchViewLike };
type Reason = keyof Texts["game"]["errors"];
export type ActionReply = Reply<Reason>;

type Props = {
  initial: MatchViewLike;
  texts: Texts["game"];
  onCommitVisit: (matchId: string, legIndex: number, seq: number, darts: Dart[]) => Promise<ActionReply>;
  onUndoVisit: (matchId: string) => Promise<ActionReply>;
  onPlayOut: (matchId: string, playOut: boolean) => Promise<ActionReply>;
  onSetStarter: (matchId: string, playerId: PlayerId) => Promise<ActionReply>;
  onDecideWinner: (matchId: string, playerId: PlayerId) => Promise<ActionReply>;
  /** M9: set for tournament games; the victory screen leads back there. */
  tournamentHref?: string;
  onLoad: (matchId: string) => Promise<ActionReply>;
  onRestart: (matchId: string) => Promise<void>;
  onCancel: (matchId: string) => Promise<unknown>;
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
}: Props) {
  const [asking, setAsking] = useState<"cancel" | "resign" | null>(null);
  const [closedLeg, setClosedLeg] = useState<string | null>(null);
  const errorText = useCallback((reason: Reason) => texts.errors[reason], [texts.errors]);
  const { state, sync, error, isOpen, throwDart, undo, playOut, chooseStarter, decide } = useVisitSync<Reason>({
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
  const status = error ?? (sync === "unsaved" ? texts.unsaved : sync === "saving" ? texts.saving : " ");

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
  const turnHint = !isOpen
    ? texts.closed
    : enterOk
      ? starterOk && playerIds.length > 1
        ? texts.chooseStarter
        : null
      : texts.turnOf.replace("{name}", initial.names[matchCurrentPlayer(state)] ?? "");
  const lastName = view.lastPlayerId ? (initial.names[view.lastPlayerId] ?? "") : "";

  const header = (
    <ScoreboardHeader
      title={rules}
      status={status}
      sync={sync}
      hasError={error !== null}
      onCancel={initial.access.canCancel && isOpen ? () => setAsking("cancel") : null}
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
        else void onCancel(initial.id);
        setAsking(null);
      }}
      onCancel={() => setAsking(null)}
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
            />
          }
        />
        {confirm}
      </>
    );
  }

  if (view.progress === "leg-finished" && !legClosed) {
    return (
      <LegVictoryScreen
        view={view}
        names={initial.names}
        texts={texts}
        canUndo={undoOk && sync === "saved"}
        onContinue={() => setClosedLeg(legKey(state))}
        onUndo={undoAndReopen}
        onDecide={initial.isTournament && actor !== null && isOpen && maySetStarter(initial.match, actor) ? decide : undefined}
      />
    );
  }

  const keypad = (
    <Keypad
      texts={{ bull: texts.bull, undo: texts.undo, double: texts.double, triple: texts.triple }}
      canThrow={enterOk}
      canUndo={undoOk}
      onDart={throwDart}
      onUndo={undoAndReopen}
      layout={board.mode === "cricket" ? "cricket" : "full"}
    />
  );

  if (board.mode === "cricket") {
    return (
      <>
        <CricketBoard
          board={board}
          names={initial.names}
          texts={texts}
          header={header}
          keypad={keypad}
          isOpen={isOpen}
          turnHint={turnHint}
          onSelectStarter={starterOk ? chooseStarter : undefined}
        />
        {confirm}
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
        turnHint={turnHint}
        onSelectStarter={starterOk ? chooseStarter : undefined}
        onResign={view.playOut && playOutOk ? () => setAsking("resign") : null}
      />
      {confirm}
    </>
  );
}
