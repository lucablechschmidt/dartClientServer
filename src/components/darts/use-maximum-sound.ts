"use client";

import { useEffect, useRef } from "react";
import { useSetting } from "@/components/ui/local-setting";
import { parseSound, SOUND_STORAGE_KEY } from "@/components/ui/sound";
import { completesMaximum, type MatchState } from "@/domain/game";

/** The legacy recordings (`Assets.xcassets/180-*.dataset`); one is picked at random like Legacy's playSound. */
export const MAXIMUM_SOUNDS = ["/sounds/180-1.m4a", "/sounds/180-2.m4a", "/sounds/180-3.m4a"];

/** `play()` as a promise in every case (older engines and test DOMs return nothing or throw). */
const tryPlay = (a: HTMLAudioElement): Promise<void> => Promise.resolve().then(() => a.play());

/**
 * M11: plays one of the 180 recordings when a visit of three T20 completes, on every device that sees it
 * (thrown here or arriving over SSE), unless "Ton" is off on this device. Mobile browsers play audio only
 * after a tap on the page: the first tap anywhere unlocks the preloaded files by playing them muted once.
 */
export function useMaximumSound(state: MatchState, random: () => number = Math.random) {
  const on = useSetting(SOUND_STORAGE_KEY, parseSound, "on") === "on";
  const audio = useRef<HTMLAudioElement[]>([]);
  const prev = useRef(state);

  useEffect(() => {
    if (!on) return;
    const files = MAXIMUM_SOUNDS.map((src) => {
      const a = new Audio(src);
      a.preload = "auto";
      return a;
    });
    audio.current = files;
    const unlock = () => {
      for (const a of files) {
        a.muted = true;
        tryPlay(a).then(
          () => {
            a.pause();
            a.currentTime = 0;
            a.muted = false;
          },
          () => {
            a.muted = false;
          },
        );
      }
    };
    document.addEventListener("pointerdown", unlock, { once: true });
    return () => {
      document.removeEventListener("pointerdown", unlock);
      audio.current = [];
    };
  }, [on]);

  useEffect(() => {
    const before = prev.current;
    prev.current = state;
    if (!on || !completesMaximum(before, state)) return;
    const a = audio.current.at(Math.floor(random() * audio.current.length));
    if (!a) return;
    a.currentTime = 0;
    tryPlay(a).catch(() => {
      /* not unlocked yet (no tap on this page) or no audio output: silent, like a muted phone */
    });
  }, [state, on, random]);
}
