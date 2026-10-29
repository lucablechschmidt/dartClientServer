"use client";

import { useState } from "react";
import { OptionMenu } from "@/components/ui/option-menu";
import { FixedRules, SetupShell, type SetupProps } from "./setup-shell";

type Rule = "single" | "double" | "triple";
const RULES: readonly Rule[] = ["single", "double", "triple"];
const TARGETS = [501, 401, 301].map((value) => ({ value, label: String(value) }));

/** Port of CricketGameSetUpView: only the players. */
export function CricketSetup(props: SetupProps) {
  return <SetupShell {...props} mode="cricket" options={() => <FixedRules startScore={0} />} />;
}

/** Port of SplitScoreGameSetUpView: only the players; everybody starts with 40. */
export function SplitScoreSetup(props: SetupProps) {
  return <SetupShell {...props} mode="splitscore" options={() => <FixedRules startScore={40} />} />;
}

/** Port of EliminationGameSetUpView: out rule and target 501/401/301 (defaults as in legacy: SingleOut, 301). */
export function EliminationSetup(props: SetupProps) {
  const { texts } = props;
  const [target, setTarget] = useState(301);
  const [outRule, setOutRule] = useState<Rule>("single");
  return (
    <SetupShell
      {...props}
      mode="elimination"
      options={() => (
        <div className="flex flex-wrap items-start justify-center gap-3">
          <input type="hidden" name="inRule" value="single" />
          <OptionMenu name="outRule" value={outRule} onChange={setOutRule} options={RULES.map((r) => ({ value: r, label: texts.outLabels[r] }))} />
          <OptionMenu name="startScore" title={texts.target} value={target} onChange={setTarget} options={TARGETS} />
        </div>
      )}
    />
  );
}
