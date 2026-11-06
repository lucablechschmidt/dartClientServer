import { describe, expect, it } from "vitest";
import { gallery, newlyEarned } from "./gallery";
import { ACHIEVEMENTS, doubleFact, FINISH_DOUBLES } from "./types";

const at = (time: number, ...facts: string[]) => ({ facts, at: time });

describe("achievement gallery (m10-plan §2)", () => {
  it("every achievement once, earned at the first game that brought it, the rest open", () => {
    const g = gallery([at(30, "180"), at(10, "180", "first-blood"), at(20, "shanghai")]);
    expect(g.map((x) => x.key)).toEqual([...ACHIEVEMENTS]);
    expect(g.find((x) => x.key === "180")?.earnedAt).toBe(10);
    expect(g.find((x) => x.key === "shanghai")?.earnedAt).toBe(20);
    expect(g.find((x) => x.key === "nine-darter")?.earnedAt).toBeNull();
  });

  it("all finishes: progress over the 21 doubles, earned when the last one came", () => {
    const some = gallery([at(5, doubleFact(16)), at(6, doubleFact(16), doubleFact(25))]).find((x) => x.key === "all-finishes");
    expect(some).toMatchObject({ earnedAt: null, progress: { done: 2, of: 21 } });
    const all = gallery(FINISH_DOUBLES.map((d, i) => at(100 + i, doubleFact(d)))).find((x) => x.key === "all-finishes");
    expect(all).toMatchObject({ earnedAt: 120, progress: { done: 21, of: 21 } });
  });

  it("newly earned in a game: what it brought and no earlier game had", () => {
    const before = [at(1, "180"), ...FINISH_DOUBLES.slice(1).map((d) => at(2, doubleFact(d)))];
    expect(newlyEarned(before, at(3, "180", "shanghai", doubleFact(1)))).toEqual(["shanghai", "all-finishes"]);
    expect(newlyEarned([], at(3, doubleFact(1)))).toEqual([]);
  });
});
