"use client";

import { useState } from "react";
import { Stepper } from "@/components/ui/stepper";
import { RuleTile, ruleChoices, SCORE_CHOICES, ScoreChoice, SetupCard, SetupShell, type Rule, type SetupProps } from "./setup-shell";

/** Port of ClassicGameSetUpView in the Figma layout: start score, in/out rule, best of sets and legs (1, 3, 5 …). */
export function X01Setup(props: SetupProps) {
  const { texts } = props;
  const [inRule, setInRule] = useState<Rule>("single");
  const [outRule, setOutRule] = useState<Rule>("double");
  const [startScore, setStartScore] = useState(501);
  const [sets, setSets] = useState(1);
  const [legs, setLegs] = useState(1);
  const stepper = { min: 1, max: 9, step: 2, decreaseLabel: texts.fewer, increaseLabel: texts.more };

  return (
    <SetupShell
      {...props}
      mode="x01"
      summary={[String(startScore), `${texts.inNames[inRule]} / ${texts.outNames[outRule]}`]}
      options={(playerCount) => {
        // E7: sets and legs only with 2 players; with 3+ one leg is played down to all places.
        const multi = playerCount >= 3;
        return (
          <SetupCard>
            <ScoreChoice title={texts.startScore} subtitle={texts.cardSubtitles.x01} value={startScore} options={SCORE_CHOICES} onChange={setStartScore} />
            <div className="grid grid-cols-2 gap-3">
              <RuleTile name="inRule" label={texts.inRule} value={inRule} onChange={setInRule} options={ruleChoices(texts.inNames)} />
              <RuleTile name="outRule" label={texts.outRule} value={outRule} onChange={setOutRule} options={ruleChoices(texts.outNames)} />
            </div>
            {/* One row each: "Best of Legs" next to − 1 + does not fit half a phone width. */}
            <div className="flex flex-col divide-y divide-separator">
              <Stepper name="setsToWinMatch" label={texts.bestOfSets} value={multi ? 1 : sets} onChange={setSets} disabled={multi} {...stepper} />
              <Stepper name="legsToWinSet" label={texts.bestOfLegs} value={multi ? 1 : legs} onChange={setLegs} disabled={multi} {...stepper} />
            </div>
            {multi && <p className="text-xs text-fg-muted">{texts.setsLegsTwoOnly}</p>}
          </SetupCard>
        );
      }}
    />
  );
}
