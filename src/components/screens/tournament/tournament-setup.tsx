"use client";

import { useState } from "react";
import { Field, TextInput } from "@/components/ui/form-controls";
import { Stepper } from "@/components/ui/stepper";
import type { TournamentFormat } from "@/domain/tournament";
import type { Texts } from "@/i18n/de";
import { RuleTile, ruleChoices, SCORE_CHOICES, ScoreChoice, SetupCard, SetupShell, type Rule, type SetupProps } from "../setup-shell";
import { knockoutRoundLabel, knockoutRounds } from "./rounds";

type Props = SetupProps & { tournamentTexts: Texts["tournaments"] };

const FORMATS: readonly TournamentFormat[] = ["round-robin", "knockout", "groups-knockout"];
const ADVANCE = ["1", "2", "4"] as const;
type Advance = (typeof ADVANCE)[number];

/** Who may start: two players at least; groups need two each and no more qualifiers than members (m9-plan §1). */
function valid(format: TournamentFormat, players: number, groups: number, advance: number): boolean {
  if (format !== "groups-knockout") return players >= 2;
  return players >= groups * 2 && Math.floor(players / groups) >= advance && groups * advance >= 2;
}

/** New tournament (M9) in the setup layout: name, format, groups, X01 rules, best of per phase and knockout round. */
export function TournamentSetup({ tournamentTexts: t, ...props }: Props) {
  const { texts } = props;
  const [name, setName] = useState("");
  const [format, setFormat] = useState<TournamentFormat>("round-robin");
  const [groups, setGroups] = useState(2);
  const [advance, setAdvance] = useState<Advance>("2");
  const [startScore, setStartScore] = useState(501);
  const [inRule, setInRule] = useState<Rule>("single");
  const [outRule, setOutRule] = useState<Rule>("double");
  const [groupBestOf, setGroupBestOf] = useState({ legs: 1, sets: 1 });
  const [knockoutBestOf, setKnockoutBestOf] = useState<{ legs: number; sets: number }[]>([]);
  const stepper = { min: 1, max: 9, step: 2, decreaseLabel: texts.fewer, increaseLabel: texts.more };

  return (
    <SetupShell
      {...props}
      mode="x01"
      heading={{ title: t.newTournament, subtitle: t.formats[format] }}
      backHref="/tournaments"
      startLabel={t.start}
      canStart={(n) => name.trim() !== "" && valid(format, n, groups, Number(advance))}
      summary={[t.formats[format], String(startScore), `${texts.inNames[inRule]} / ${texts.outNames[outRule]}`]}
      options={(playerCount) => {
        const entrants = format === "knockout" ? playerCount : format === "groups-knockout" ? groups * Number(advance) : 0;
        const rounds = entrants >= 2 ? knockoutRounds(entrants) : format === "round-robin" ? 0 : 1;
        const bestOf = (i: number) => knockoutBestOf.at(i) ?? { legs: 1, sets: 1 };
        const setRound = (i: number, change: Partial<{ legs: number; sets: number }>) =>
          setKnockoutBestOf((all) =>
            Array.from({ length: Math.max(all.length, i + 1) }, (_, j) => (j === i ? { ...bestOf(i), ...change } : bestOf(j))),
          );
        return (
          <>
            <SetupCard>
              <Field label={t.name}>
                <TextInput
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={60}
                  placeholder={t.namePlaceholder}
                />
              </Field>
              <RuleTile
                name="format"
                label={t.format}
                value={format}
                onChange={setFormat}
                options={FORMATS.map((f) => ({ value: f, label: t.formats[f] }))}
              />
              {format === "groups-knockout" && (
                <div className="flex flex-col divide-y divide-separator">
                  <Stepper
                    name="groups"
                    label={t.groups}
                    value={groups}
                    onChange={setGroups}
                    min={1}
                    max={4}
                    decreaseLabel={texts.fewer}
                    increaseLabel={texts.more}
                  />
                  <RuleTile
                    name="advance"
                    label={t.advance}
                    value={advance}
                    onChange={setAdvance}
                    options={ADVANCE.map((a) => ({ value: a, label: a }))}
                  />
                </div>
              )}
              {playerCount > 0 && !valid(format, playerCount, groups, Number(advance)) && (
                <p className="text-xs text-fg-muted">{t.tooFewPlayers}</p>
              )}
            </SetupCard>
            <SetupCard>
              <ScoreChoice
                title={texts.startScore}
                subtitle={texts.cardSubtitles.x01}
                value={startScore}
                options={SCORE_CHOICES}
                onChange={setStartScore}
              />
              <div className="grid grid-cols-2 gap-3">
                <RuleTile name="inRule" label={texts.inRule} value={inRule} onChange={setInRule} options={ruleChoices(texts.inNames)} />
                <RuleTile
                  name="outRule"
                  label={texts.outRule}
                  value={outRule}
                  onChange={setOutRule}
                  options={ruleChoices(texts.outNames)}
                />
              </div>
            </SetupCard>
            <SetupCard>
              <p className="font-semibold">{t.gamePlay}</p>
              {format !== "knockout" && (
                <RoundBestOf
                  title={format === "round-robin" ? t.formats["round-robin"] : t.groupPhase}
                  names={["groupLegs", "groupSets"]}
                  value={groupBestOf}
                  onChange={(change) => setGroupBestOf((v) => ({ ...v, ...change }))}
                  texts={texts}
                  stepper={stepper}
                />
              )}
              {Array.from({ length: rounds }, (_, i) => (
                <RoundBestOf
                  key={i}
                  title={knockoutRoundLabel(i + 1, rounds, t)}
                  names={["knockoutLegs", "knockoutSets"]}
                  value={bestOf(i)}
                  onChange={(change) => setRound(i, change)}
                  texts={texts}
                  stepper={stepper}
                />
              ))}
            </SetupCard>
          </>
        );
      }}
    />
  );
}

type StepperDefaults = { min: number; max: number; step: number; decreaseLabel: string; increaseLabel: string };

/** Best of legs and sets for one phase or knockout round. */
function RoundBestOf({
  title,
  names,
  value,
  onChange,
  texts,
  stepper,
}: {
  title: string;
  names: [string, string];
  value: { legs: number; sets: number };
  onChange: (change: Partial<{ legs: number; sets: number }>) => void;
  texts: Texts["newGame"];
  stepper: StepperDefaults;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-fg-muted">{title}</span>
      <div className="flex flex-col divide-y divide-separator">
        <Stepper name={names[0]} label={texts.bestOfLegs} value={value.legs} onChange={(legs) => onChange({ legs })} {...stepper} />
        <Stepper name={names[1]} label={texts.bestOfSets} value={value.sets} onChange={(sets) => onChange({ sets })} {...stepper} />
      </div>
    </div>
  );
}
