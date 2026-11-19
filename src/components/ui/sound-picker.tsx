"use client";

import { useSetting, writeSetting } from "./local-setting";
import { SegmentedControl } from "./segmented";
import { parseSound, SOUND_CHOICES, SOUND_STORAGE_KEY, type SoundChoice } from "./sound";

type Labels = Record<SoundChoice, string> & { label: string };

/** M11: "Ton" on or off for this device (account tab); the 180 sound asks the same store. */
export function SoundPicker({ labels }: { labels: Labels }) {
  const choice = useSetting(SOUND_STORAGE_KEY, parseSound, "on");
  return (
    <SegmentedControl
      label={labels.label}
      options={SOUND_CHOICES.map((c) => ({ value: c, label: labels[c] }))}
      value={choice}
      onChange={(next) => writeSetting(SOUND_STORAGE_KEY, next === "on" ? null : next)}
    />
  );
}
