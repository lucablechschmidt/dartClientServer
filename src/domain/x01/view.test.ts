import { describe, expect, it } from "vitest";
import { applyMatchDart, newLeg, newMatch, projectMatch, type Dart, type MatchState } from "../game";
import { applyDart } from "./apply";
import { projectScoreboard } from "./view";

const rules = { startScore: 501, inRule: "single", outRule: "double" } as const;
const names = { a: "Casey", b: "Sam" };

describe("projectScoreboard", () => {
  it("fresh leg: starter active, empty slots, first slot current, no hint", () => {
    const v = projectScoreboard(newLeg(["a", "b"], rules, 1), names);
    expect(v.activePlayerId).toBe("b");
    expect(v.players[1].isActive).toBe(true);
    expect(v.players[1].slots.map((s) => s.isCurrent)).toEqual([true, false, false]);
    expect(v.players[0].slots.map((s) => s.isCurrent)).toEqual([false, false, false]);
    expect(v.hint).toBeNull();
    expect(v.canUndo).toBe(false);
    expect(v.dartsLeft).toBe(3);
  });

  it("shows labels, bust slots, darts left and the checkout hint", () => {
    let s = newLeg(["a", "b"], rules);
    for (const d of [
      { field: 20, type: "triple" },
      { field: 20, type: "triple" },
      { field: 20, type: "triple" },
      { field: 20, type: "triple" },
      { field: 20, type: "triple" },
      { field: 20, type: "triple" },
      { field: 20, type: "triple" },
      { field: 20, type: "triple" },
      { field: 20, type: "triple" },
      { field: 20, type: "triple" },
      { field: 20, type: "triple" },
      { field: 20, type: "triple" },
    ] as const) {
      const r = applyDart(s, d);
      if (r.ok) s = r.value;
    }
    // a: 2 visits of 180 → 141, b: 2 visits → 141; a is up with 3 darts
    const v = projectScoreboard(s, names);
    expect(v.players[0].score).toBe(141);
    expect(v.activePlayerId).toBe("a");
    expect(v.players[0].slots.map((x) => x.label)).toEqual(["T20", "T20", "T20"].map(() => null));
    expect(v.players[1].slots.map((x) => x.label)).toEqual(["T20", "T20", "T20"]);
    expect(v.hint).toEqual({ kind: "checkout", text: "T20, T19, D12" });
    expect(v.players[0].average).toBe(180);
  });

  it("marks the winner and clears the hint", () => {
    let s = newLeg(["a", "b"], { startScore: 40, inRule: "single", outRule: "double" });
    const r = applyDart(s, { field: 20, type: "double" });
    if (r.ok) s = r.value;
    const v = projectScoreboard(s, names);
    expect(v.winnerId).toBe("a");
    expect(v.players[0].isWinner).toBe(true);
    expect(v.dartsLeft).toBe(0);
    expect(v.hint).toBeNull();
    expect(v.players[0].slots[1].isCurrent).toBe(false);
  });
});

describe("projectMatch (M5)", () => {
  const short = { startScore: 40, inRule: "single", outRule: "single" } as const;
  const OUT = { field: 20, type: "double" } as const;
  const MISS = { field: 0, type: "single" } as const;
  const throwAll = (m: MatchState, ...darts: Dart[]) =>
    darts.reduce((s, d) => {
      const r = applyMatchDart(s, d);
      if (!r.ok) throw new Error(r.reason);
      return r.value;
    }, m);

  it("score only when more than one leg or set is played; between legs the coming leg with its starter", () => {
    expect(projectMatch(newMatch(["a", "b"], short, { legsToWinSet: 1, setsToWinMatch: 1 }), names).score).toBeNull();
    const m = throwAll(newMatch(["a", "b"], short, { legsToWinSet: 2, setsToWinMatch: 1 }), OUT);
    const finished = projectMatch(m, names);
    expect(finished.progress).toBe("leg-finished");
    expect(finished.legWinnerId).toBe("a");
    expect(finished.score).toEqual({ legs: { a: 1, b: 0 }, sets: null });
    const coming = projectMatch(m, names, true);
    expect(coming.board.activePlayerId).toBe("b");
    expect(coming.board.players[0].score).toBe(40);
    expect(coming.canChooseStarter).toBe(true);
  });

  it("3 players: places on the panels, out players marked, last player can play out", () => {
    let m = throwAll(newMatch(["a", "b", "c"], short, { legsToWinSet: 1, setsToWinMatch: 1 }), OUT);
    let v = projectMatch(m, names);
    expect(v.board.players.map((p) => [p.placement, p.isOut])).toEqual([[1, true], [null, false], [null, false]]);
    expect(v.lastPlayerId).toBeNull();
    m = throwAll(m, MISS, MISS, MISS, OUT); // b misses, c out
    v = projectMatch(m, names);
    expect(v.progress).toBe("finished");
    expect(v.ranking).toEqual(["a", "c", "b"]);
    expect(v.lastPlayerId).toBe("b");
    expect(v.board.players[1].placement).toBeNull(); // the last one shows his rest
    expect(v.canChooseStarter).toBe(false);
  });
});
