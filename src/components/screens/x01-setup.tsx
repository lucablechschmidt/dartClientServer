"use client";

import { useState } from "react";
import { OptionMenu } from "@/components/ui/option-menu";
import { SetupShell, type SetupProps } from "./setup-shell";

type Rule = "single" | "double" | "triple";

const RULES: readonly Rule[] = ["single", "double", "triple"];
const SCORES = [501, 401, 301].map((value) => ({ value, label: String(value) }));
/** Sets and legs as in legacy: 1/3/5, meaning "best of" (the server stores how many win). */
const BEST_OF = [1, 3, 5].map((value) => ({ value, label: String(value) }));

/** Port of ClassicGameSetUpView: in/out rule, start score, sets and legs. */
export function X01Setup(props: SetupProps) {
  const { texts } = props;
  const [inRule, setInRule] = useState<Rule>("single");
  const [outRule, setOutRule] = useState<Rule>("double");
  const [startScore, setStartScore] = useState(501);
  const [sets, setSets] = useState(1);
  const [legs, setLegs] = useState(1);

  return (
    <SetupShell
      {...props}
      mode="x01"
      options={(playerCount) => {
        // E7: sets and legs only with 2 players; with 3+ one leg is played down to all places.
        const multi = playerCount >= 3;
        return (
          <>
            <div className="flex flex-wrap items-start justify-center gap-3">
              <OptionMenu name="inRule" value={inRule} onChange={setInRule} options={RULES.map((r) => ({ value: r, label: texts.inLabels[r] }))} />
              <OptionMenu name="outRule" value={outRule} onChange={setOutRule} options={RULES.map((r) => ({ value: r, label: texts.outLabels[r] }))} />
            </div>
            <div className="flex flex-wrap items-start justify-center gap-3">
              <OptionMenu name="setsToWinMatch" title={texts.sets} value={multi ? 1 : sets} onChange={setSets} options={BEST_OF} disabled={multi} />
              <OptionMenu name="startScore" value={startScore} onChange={setStartScore} options={SCORES} />
              <OptionMenu name="legsToWinSet" title={texts.legs} value={multi ? 1 : legs} onChange={setLegs} options={BEST_OF} disabled={multi} />
            </div>
            {multi && <p className="fluid-text-sm text-fg-muted">{texts.setsLegsTwoOnly}</p>}
          </>
        );
      }}
    />
  );
}
