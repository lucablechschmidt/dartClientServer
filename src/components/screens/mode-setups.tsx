"use client";

import { useState } from "react";
import { FixedRules, RuleTile, ScoreChoice, SetupCard, SetupShell, type SetupProps } from "./setup-shell";

type Rule = "single" | "double" | "triple";
const RULES: readonly Rule[] = ["single", "double", "triple"];
const TARGETS = [501, 401, 301].map((value) => ({ value, label: String(value) }));

/** Port of CricketGameSetUpView: no game options, only input mode and players. */
export function CricketSetup(props: SetupProps) {
  return <SetupShell {...props} mode="cricket" summary={[]} options={() => <FixedRules startScore={0} />} />;
}

/** Port of SplitScoreGameSetUpView: no game options (everybody starts with 40), only input mode and players. */
export function SplitScoreSetup(props: SetupProps) {
  return <SetupShell {...props} mode="splitscore" summary={[]} options={() => <FixedRules startScore={40} />} />;
}

/** Port of EliminationGameSetUpView: target 501/401/301 and the out rule (defaults as in legacy: 301, SingleOut). */
export function EliminationSetup(props: SetupProps) {
  const { texts } = props;
  const [target, setTarget] = useState(301);
  const [outRule, setOutRule] = useState<Rule>("single");
  return (
    <SetupShell
      {...props}
      mode="elimination"
      summary={[String(target), texts.outNames[outRule]]}
      options={() => (
        <SetupCard>
          <input type="hidden" name="inRule" value="single" />
          <ScoreChoice title={texts.targetScore} subtitle={texts.cardSubtitles.elimination} value={target} options={TARGETS} onChange={setTarget} />
          <RuleTile name="outRule" label={texts.outRule} value={outRule} onChange={setOutRule} options={RULES.map((r) => ({ value: r, label: texts.outNames[r] }))} />
        </SetupCard>
      )}
    />
  );
}
