import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyMatchDart, newMatch, type Dart, type MatchState } from "@/domain/game";
import { MAXIMUM_SOUNDS, useMaximumSound } from "./use-maximum-sound";

const T20: Dart = { field: 20, type: "triple" };
const start = newMatch(["a", "b"], { startScore: 501, inRule: "single", outRule: "double" }, { legsToWinSet: 1, setsToWinMatch: 1 });
const play = (m: MatchState, ...darts: Dart[]) =>
  darts.reduce((s, d) => {
    const r = applyMatchDart(s, d);
    if (!r.ok) throw new Error(r.reason);
    return r.value;
  }, m);

let played: string[];
let playSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  localStorage.clear();
  played = [];
  playSpy = vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
    if (!this.muted) played.push(new URL(this.src).pathname);
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

const mount = (random: () => number) =>
  renderHook(({ state }: { state: MatchState }) => useMaximumSound(state, random), { initialProps: { state: start } });

describe("useMaximumSound (M11)", () => {
  it("plays the recording the random pick names when the third T20 lands", async () => {
    const { rerender } = mount(() => 0.5);
    const two = play(start, T20, T20);
    rerender({ state: two });
    rerender({ state: play(two, T20) });
    await act(() => Promise.resolve());
    expect(played).toEqual([MAXIMUM_SOUNDS[1]]);
  });

  it("stays silent on mount, even when the match already holds a 180 (reload)", async () => {
    renderHook(() => useMaximumSound(play(start, T20, T20, T20), () => 0));
    await act(() => Promise.resolve());
    expect(played).toEqual([]);
  });

  it("stays silent when Ton is off on this device", async () => {
    localStorage.setItem("sound", "off");
    const { rerender } = mount(() => 0);
    rerender({ state: play(start, T20, T20, T20) });
    await act(() => Promise.resolve());
    expect(played).toEqual([]);
    expect(playSpy).not.toHaveBeenCalled();
  });

  it("the first tap unlocks the files by playing them muted", async () => {
    mount(() => 0);
    await act(async () => {
      document.dispatchEvent(new Event("pointerdown"));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(playSpy).toHaveBeenCalledTimes(MAXIMUM_SOUNDS.length);
    expect(played).toEqual([]);
  });
});
