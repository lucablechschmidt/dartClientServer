import { BackButton } from "@/components/ui/back-button";
import { XmarkCircleIcon } from "@/components/ui/icons";
import { ScreenHeader } from "@/components/ui/screen-header";
import type { ModeId, Rules } from "@/domain/game";
import type { Texts } from "@/i18n/de";

/** Rules in the header: X01 start and in/out, Elimination target and out, the other modes their name (M7). */
export function headerTitle(mode: ModeId, rules: Rules, texts: Texts["game"]): string {
  if (mode === "x01") return [rules.startScore, texts.inNames[rules.inRule], texts.outNames[rules.outRule]].join(" · ");
  if (mode === "elimination") return [texts.modes.elimination, rules.startScore, texts.outNames[rules.outRule]].join(" · ");
  return texts.modes[mode];
}

type Props = {
  title: string;
  /** Saved, saving, not saved, or the last error. */
  status: string;
  sync: "saved" | "saving" | "unsaved";
  hasError: boolean;
  /** M6: while not saved, a tap on the status retries at once. */
  onRetry?: () => void;
  /** Host or admin of an open match get the cancel button instead of the way back (M4). */
  onCancel: (() => void) | null;
  texts: Texts["game"];
};

/** Header row of the scoring screen: cancel or back, the rules or the legs/sets score, the sync status. */
export function ScoreboardHeader({ title, status, sync, hasError, onRetry, onCancel, texts }: Props) {
  return (
    <ScreenHeader
      left={
        onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            aria-label={texts.cancel}
            className="grid min-h-touch min-w-touch place-items-center text-fg"
          >
            <XmarkCircleIcon className="h-8 w-8" />
          </button>
        ) : (
          <BackButton href="/" label={texts.back} />
        )
      }
      title={<span className="text-fluid-sm text-fg-muted tabular-nums">{title}</span>}
      right={
        <span
          className={`text-fluid-sm ${hasError || sync === "unsaved" ? "text-key-undo" : "text-fg-muted"}`}
          role="status"
          data-sync={sync}
        >
          {onRetry && sync === "unsaved" ? (
            <button type="button" onClick={onRetry} title={texts.retryNow} className="min-h-touch underline">
              {status}
            </button>
          ) : (
            status
          )}
        </span>
      }
    />
  );
}
