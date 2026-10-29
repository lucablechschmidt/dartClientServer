"use client";

import { useState, type ReactNode } from "react";
import { PlayerPicker } from "@/components/darts/player-picker";
import { BackButton } from "@/components/ui/back-button";
import { GroupedSection } from "@/components/ui/card-list";
import { OptionMenu } from "@/components/ui/option-menu";
import { ScreenHeader } from "@/components/ui/screen-header";
import type { Player } from "@/domain/player";
import type { ModeId } from "@/domain/game";
import type { Texts } from "@/i18n/de";

export type SetupProps = {
  players: Player[];
  texts: Texts["newGame"];
  commonTexts: { back: string; save: string; cancel: string };
  onStart: (formData: FormData) => Promise<void>;
  onAddGuest: (formData: FormData) => Promise<{ ok: true; id: string } | { ok: false; reason: "name-taken" }>;
};

type Props = SetupProps & {
  mode: ModeId;
  /** The mode's option pills; they get the number of chosen players (E7: sets/legs only with 2). */
  options: (playerCount: number) => ReactNode;
};

/**
 * What every setup shares (ClassicGameSetUpView and its siblings, M7): header with "Start Game",
 * the mode's options, the input mode (E13) and the PlayerPicker. The picker sits outside the form
 * (its own guest row); the chosen players are submitted as hidden inputs.
 */
export function SetupShell({ mode, players, texts, commonTexts, onStart, onAddGuest, options }: Props) {
  const [order, setOrder] = useState<string[]>([]);
  const [inputMode, setInputMode] = useState<"single" | "per-player">("single");
  const toggle = (id: string) => setOrder((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));

  return (
    <div className="flex flex-1 flex-col">
      <form action={onStart}>
        <ScreenHeader
          left={<BackButton href="/" label={commonTexts.back} />}
          title={
            <button type="submit" disabled={order.length === 0} className="min-h-touch px-3 text-fg disabled:opacity-0">
              {texts.start}
            </button>
          }
        />
        <input type="hidden" name="mode" value={mode} />
        {order.map((id) => <input key={id} type="hidden" name="playerId" value={id} />)}

        <div className="flex flex-col items-center gap-3 px-3 pb-4">
          {options(order.length)}
          <OptionMenu
            name="inputMode"
            title={texts.inputMode}
            value={inputMode}
            onChange={setInputMode}
            options={[
              { value: "single", label: texts.inputModes.single },
              { value: "per-player", label: texts.inputModes["per-player"] },
            ]}
          />
        </div>
      </form>

      <GroupedSection>
        <PlayerPicker players={players} order={order} onToggle={toggle} onAddGuest={onAddGuest} texts={{ ...texts, save: commonTexts.save, cancel: commonTexts.cancel }} />
      </GroupedSection>
    </div>
  );
}

/** Fixed rule values a mode does not let the user choose (Cricket, SplitScore). */
export function FixedRules({ startScore }: { startScore: number }) {
  return (
    <>
      <input type="hidden" name="startScore" value={startScore} />
      <input type="hidden" name="inRule" value="single" />
      <input type="hidden" name="outRule" value="single" />
    </>
  );
}
