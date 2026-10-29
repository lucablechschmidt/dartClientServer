"use client";

import { useCallback, useMemo, useState } from "react";
import { CheckoutHint } from "@/components/darts/checkout-hint";
import { Keypad } from "@/components/darts/keypad";
import { PlayerPanels } from "@/components/darts/player-panels";
import { ScoreGrid } from "@/components/darts/score-grid";
import { useVisitSync, type ActionReply as Reply, type MatchViewLike } from "@/components/darts/use-visit-sync";
import { BackButton } from "@/components/ui/back-button";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { TextButton } from "@/components/ui/form-controls";
import { XmarkCircleIcon } from "@/components/ui/icons";
import { ScreenHeader } from "@/components/ui/screen-header";
import { currentLeg, matchCurrentPlayer, mayEnter, mayPlayOut, maySetStarter, mayUndo, projectMatch, type Dart, type MatchState, type PlayerId } from "@/domain/x01";
import type { Texts } from "@/i18n/de";
import { LegVictoryScreen, scoreLine } from "./leg-victory-screen";
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
  onLoad: (matchId: string) => Promise<ActionReply>;
  onRestart: (matchId: string) => Promise<void>;
  onCancel: (matchId: string) => Promise<unknown>;
};

const RULE_SHORT = { single: "Single", double: "Double", triple: "Triple" } as const;

/** Identifies one finished-leg state, so closing the leg victory screen survives re-renders but not an undo. */
const legKey = (m: MatchState) => `${m.legs.length}:${currentLeg(m).visits.length}`;

/**
 * The scoring screen: header with status, player panels, checkout or turn hint, keypad; the leg
 * victory screen between two legs and the victory screen at the end (M5). Scoring and server sync
 * live in `useVisitSync`.
 */
export function ScoreboardScreen({ initial, texts, onCommitVisit, onUndoVisit, onPlayOut, onSetStarter, onLoad, onRestart, onCancel }: Props) {
  const [asking, setAsking] = useState<"cancel" | "resign" | null>(null);
  const [closedLeg, setClosedLeg] = useState<string | null>(null);
  const errorText = useCallback((reason: Reason) => texts.errors[reason], [texts.errors]);
  const { state, sync, error, isOpen, throwDart, undo, playOut, chooseStarter } = useVisitSync<Reason>({ initial, onCommitVisit, onUndoVisit, onPlayOut, onSetStarter, onLoad, errorText });

  const legClosed = closedLeg === legKey(state);
  const view = useMemo(() => projectMatch(state, initial.names, legClosed), [state, initial.names, legClosed]);
  const board = view.board;
  const playerIds = state.players;
  const rules = scoreLine(view, playerIds, texts) ?? `${initial.rules.startScore} · ${RULE_SHORT[initial.rules.inRule]} In · ${RULE_SHORT[initial.rules.outRule]} Out`;
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
      ? starterOk && playerIds.length > 1 ? texts.chooseStarter : null
      : texts.turnOf.replace("{name}", initial.names[matchCurrentPlayer(state)] ?? "");
  const lastName = view.lastPlayerId ? initial.names[view.lastPlayerId] ?? "" : "";

  const header = (
    <ScreenHeader
      left={
        initial.access.canCancel && isOpen ? (
          <button type="button" onClick={() => setAsking("cancel")} aria-label={texts.cancel} className="grid min-h-touch min-w-touch place-items-center text-fg">
            <XmarkCircleIcon className="h-8 w-8" />
          </button>
        ) : (
          <BackButton href="/" label={texts.back} />
        )
      }
      title={<span className="fluid-text-sm text-fg-muted tabular">{rules}</span>}
      right={
        <span className={`fluid-text-sm ${error || sync === "unsaved" ? "text-key-undo" : "text-fg-muted"}`} role="status" data-sync={sync}>
          {status}
        </span>
      }
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
            />
          }
        />
        {confirm}
      </>
    );
  }

  if (view.progress === "leg-finished" && !legClosed) {
    return <LegVictoryScreen view={view} names={initial.names} texts={texts} canUndo={undoOk && sync === "saved"} onContinue={() => setClosedLeg(legKey(state))} onUndo={undoAndReopen} />;
  }

  return (
    <>
      <ScoreGrid
        header={header}
        panels={
          <div className="h-full px-3">
            <PlayerPanels
              players={board.players}
              texts={{ darts: texts.darts, average: texts.average, visit: texts.visit }}
              onSelect={starterOk ? chooseStarter : undefined}
              selectLabel={texts.toStart}
            />
          </div>
        }
        hint={
          <div className="flex items-center gap-2 px-3">
            <div className="flex-1">
              <CheckoutHint hint={turnHint ?? board.checkoutHint} />
            </div>
            {view.playOut && playOutOk && (
              <TextButton tone="danger" onClick={() => setAsking("resign")}>
                {texts.resign}
              </TextButton>
            )}
          </div>
        }
        keypad={
          <div className="h-full px-3 pb-3">
            <Keypad
              texts={{ bull: texts.bull, undo: texts.undo, double: texts.double, triple: texts.triple }}
              canThrow={enterOk}
              canUndo={undoOk}
              onDart={throwDart}
              onUndo={undoAndReopen}
            />
          </div>
        }
      />
      {confirm}
    </>
  );
}
