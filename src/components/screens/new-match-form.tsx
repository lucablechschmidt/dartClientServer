"use client";

import { useState } from "react";
import { PlayerPicker } from "@/components/darts/player-picker";
import { BackButton } from "@/components/ui/back-button";
import { GroupedSection } from "@/components/ui/card-list";
import { OptionMenu } from "@/components/ui/option-menu";
import { ScreenHeader } from "@/components/ui/screen-header";
import type { Player } from "@/domain/player";
import type { Texts } from "@/i18n/de";

type Rule = "single" | "double" | "triple";
type Props = {
  players: Player[];
  texts: Texts["newGame"];
  commonTexts: { back: string; save: string; cancel: string };
  onStart: (formData: FormData) => Promise<void>;
  onAddGuest: (formData: FormData) => Promise<{ ok: true; id: string } | { ok: false; reason: "name-taken" }>;
};

const RULES: readonly Rule[] = ["single", "double", "triple"];
const SCORES = [501, 401, 301].map((value) => ({ value, label: String(value) }));
/** Sets and legs arrive in M5; the pills are already there but disabled at 1. */
const ONE = [{ value: 1, label: "1" }];
const FORM_ID = "new-match";

/**
 * Port of ClassicGameSetUpView: header with "Start Game" as the action, option pills,
 * the PlayerPicker below. The picker sits outside the form (its own guest row);
 * the chosen players are submitted as hidden inputs.
 */
export function NewMatchForm({ players, texts, commonTexts, onStart, onAddGuest }: Props) {
  const [order, setOrder] = useState<string[]>([]);
  const [inRule, setInRule] = useState<Rule>("single");
  const [outRule, setOutRule] = useState<Rule>("double");
  const [startScore, setStartScore] = useState(501);
  const [inputMode, setInputMode] = useState<"single" | "per-player">("single");

  const toggle = (id: string) => setOrder((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));

  return (
    <div className="flex flex-1 flex-col">
      <form id={FORM_ID} action={onStart}>
        <ScreenHeader
          left={<BackButton href="/" label={commonTexts.back} />}
          title={
            <button type="submit" disabled={order.length === 0} className="min-h-touch px-3 text-fg disabled:opacity-0">
              {texts.start}
            </button>
          }
        />
        {order.map((id) => <input key={id} type="hidden" name="playerId" value={id} />)}

        <div className="flex flex-col items-center gap-3 px-3 pb-4">
          <div className="flex flex-wrap items-start justify-center gap-3">
            <OptionMenu name="inRule" value={inRule} onChange={setInRule} options={RULES.map((r) => ({ value: r, label: texts.inLabels[r] }))} />
            <OptionMenu name="outRule" value={outRule} onChange={setOutRule} options={RULES.map((r) => ({ value: r, label: texts.outLabels[r] }))} />
          </div>
          <div className="flex flex-wrap items-start justify-center gap-3">
            <OptionMenu name="setsToWinMatch" title={texts.sets} value={1} onChange={() => {}} options={ONE} disabled />
            <OptionMenu name="startScore" value={startScore} onChange={setStartScore} options={SCORES} />
            <OptionMenu name="legsToWinSet" title={texts.legs} value={1} onChange={() => {}} options={ONE} disabled />
          </div>
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
