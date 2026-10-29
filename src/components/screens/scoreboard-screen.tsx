"use client";

import { useCallback, useMemo, useState } from "react";
import { CheckoutHint } from "@/components/darts/checkout-hint";
import { Keypad } from "@/components/darts/keypad";
import { PlayerPanels } from "@/components/darts/player-panels";
import { ScoreGrid } from "@/components/darts/score-grid";
import { useVisitSync, type ActionReply as Reply, type MatchViewLike } from "@/components/darts/use-visit-sync";
import { BackButton } from "@/components/ui/back-button";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { XmarkCircleIcon } from "@/components/ui/icons";
import { ScreenHeader } from "@/components/ui/screen-header";
import { currentLeg, matchCurrentPlayer, mayEnter, mayUndo, projectScoreboard, type Dart, type PlayerId } from "@/domain/x01";
import type { Texts } from "@/i18n/de";
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

/**
 * The scoring screen: header with status, player panels, checkout or turn hint, keypad; the
 * victory screen once a player has checked out. Scoring and server sync live in `useVisitSync`.
 */
export function ScoreboardScreen({ initial, texts, onCommitVisit, onUndoVisit, onPlayOut, onSetStarter, onLoad, onRestart, onCancel }: Props) {
  const [asking, setAsking] = useState(false);
  const errorText = useCallback((reason: Reason) => texts.errors[reason], [texts.errors]);
  const { state, sync, error, isOpen, throwDart: throwLocal, undo: undoLocal } = useVisitSync<Reason>({ initial, onCommitVisit, onUndoVisit, onPlayOut, onSetStarter, onLoad, errorText });

  const board = useMemo(() => projectScoreboard(currentLeg(state), initial.names), [state, initial.names]);
  const rules = `${initial.rules.startScore} · ${RULE_SHORT[initial.rules.inRule]} In · ${RULE_SHORT[initial.rules.outRule]} Out`;
  const status = error ?? (sync === "unsaved" ? texts.unsaved : sync === "saving" ? texts.saving : " ");

  // E13: keypad and undo only when this device is currently allowed; the server checks anyway.
  const actor = initial.actor;
  const enterOk = isOpen && actor !== null && mayEnter(state, initial.match, actor);
  const undoOk = isOpen && actor !== null && mayUndo(state, initial.match, actor);
  const turnHint = !isOpen ? texts.closed : enterOk ? null : texts.turnOf.replace("{name}", initial.names[matchCurrentPlayer(state)] ?? "");

  const header = (
    <ScreenHeader
      left={
        initial.access.canCancel && isOpen ? (
          <button type="button" onClick={() => setAsking(true)} aria-label={texts.cancel} className="grid min-h-touch min-w-touch place-items-center text-fg">
            <XmarkCircleIcon className="h-8 w-8" />
          </button>
        ) : (
          <BackButton href="/" label={texts.back} />
        )
      }
      title={<span className="fluid-text-sm text-fg-muted">{rules}</span>}
      right={
        <span className={`fluid-text-sm ${error || sync === "unsaved" ? "text-key-undo" : "text-fg-muted"}`} role="status" data-sync={sync}>
          {status}
        </span>
      }
    />
  );

  const confirm = (
    <ConfirmSheet
      open={asking}
      text={texts.cancelQuestion}
      confirmLabel={texts.cancelConfirm}
      cancelLabel={texts.cancelBack}
      onConfirm={() => {
        setAsking(false);
        void onCancel(initial.id);
      }}
      onCancel={() => setAsking(false)}
    />
  );

  if (board.winnerId) {
    return (
      <>
        <ScoreGrid
          header={header}
          panels={
            <VictoryScreen
              board={board}
              texts={texts}
              pending={sync !== "saved" || !undoOk}
              onUndoWinningDart={undoLocal}
              onRestart={() => onRestart(initial.id)}
            />
          }
          hint={null}
          keypad={null}
        />
        {confirm}
      </>
    );
  }

  return (
    <>
      <ScoreGrid
        header={header}
        panels={<div className="h-full px-3"><PlayerPanels players={board.players} texts={{ darts: texts.darts, average: texts.average, visit: texts.visit }} /></div>}
        hint={<div className="px-3"><CheckoutHint hint={turnHint ?? board.checkoutHint} /></div>}
        keypad={
          <div className="h-full px-3 pb-3">
            <Keypad
              texts={{ bull: texts.bull, undo: texts.undo, double: texts.double, triple: texts.triple }}
              canThrow={enterOk}
              canUndo={board.canUndo && undoOk}
              onDart={throwLocal}
              onUndo={undoLocal}
            />
          </div>
        }
      />
      {confirm}
    </>
  );
}
