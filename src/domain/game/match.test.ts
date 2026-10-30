import { describe, expect, it } from "vitest";
import {
  applyMatchDart,
  currentLeg,
  decideWinner,
  legNumbers,
  matchCurrentPlayer,
  matchScore,
  matchStatus,
  matchWinner,
  newMatch,
  nextLegNumber,
  setLegStarter,
  undoMatchDart,
  undoMatchVisit,
  undoStep,
  type MatchFormat,
  type MatchState,
} from "./match";
import { replayMatch } from "./replay";
import { matchResult } from "./result";
import { applyDart, currentPlayer, isLegFinished, startPlayOut } from "./modes";
import { newLeg } from "./state";
import type { Dart, LegState, Rules } from "./types";

const [A, B, C] = ["a", "b", "c"];
const rules: Rules = { startScore: 40, inRule: "single", outRule: "single" };
const S = (field: number): Dart => ({ field, type: "single" });
const Db = (field: number): Dart => ({ field, type: "double" });
const MISS = [S(0), S(0), S(0)];
const OUT = [Db(20)];
const bestOf3: MatchFormat = { legsToWinSet: 2, setsToWinMatch: 1 };

const play = (m: MatchState, ...darts: Dart[]): MatchState =>
  darts.reduce((s, d) => {
    const r = applyMatchDart(s, d);
    if (!r.ok) throw new Error(`applyMatchDart failed: ${r.reason}`);
    return r.value;
  }, m);
const undo = (m: MatchState, times = 1): MatchState => {
  for (let i = 0; i < times; i++) {
    const r = undoMatchDart(m);
    if (!r.ok) throw new Error(`undoMatchDart failed: ${r.reason}`);
    m = r.value;
  }
  return m;
};
/** Whoever is on turn checks out; the other one misses until then. */
const winLeg = (m: MatchState, winner: string): MatchState => {
  while (matchCurrentPlayer(m) !== winner) m = play(m, ...MISS);
  return play(m, ...OUT);
};

describe("legs and sets (2 players)", () => {
  it("best of 3 legs: A wins leg 1 and 2 → set and match to A", () => {
    let m = winLeg(newMatch([A, B], rules, bestOf3), A);
    expect(matchStatus(m)).toBe("leg-finished");
    expect(matchScore(m).legs).toEqual({ [A]: 1, [B]: 0 });
    m = winLeg(m, A);
    expect(matchStatus(m)).toBe("finished");
    expect(matchWinner(m)).toBe(A);
    expect(matchScore(m).sets).toEqual({ [A]: 1, [B]: 0 });
    expect(m.legs).toHaveLength(2);
  });

  it("best of 3 legs goes to a third leg at 1:1", () => {
    let m = winLeg(winLeg(newMatch([A, B], rules, bestOf3), A), B);
    expect(matchStatus(m)).toBe("leg-finished");
    m = winLeg(m, B);
    expect(matchWinner(m)).toBe(B);
  });

  it("3 sets × 3 legs: set counter, legs reset per set, match only after 2 sets", () => {
    let m = newMatch([A, B], rules, { legsToWinSet: 2, setsToWinMatch: 2 });
    m = winLeg(winLeg(m, A), A);
    // the won set's legs stay visible until the next set starts
    expect(matchScore(m)).toEqual({ legs: { [A]: 2, [B]: 0 }, sets: { [A]: 1, [B]: 0 } });
    expect(nextLegNumber(m)).toEqual({ setNo: 2, legNo: 1 });
    expect(matchStatus(m)).toBe("leg-finished");
    m = winLeg(winLeg(winLeg(m, B), B), A);
    expect(matchScore(m)).toEqual({ legs: { [A]: 1, [B]: 0 }, sets: { [A]: 1, [B]: 1 } });
    m = winLeg(m, A);
    expect(matchWinner(m)).toBe(A);
    expect(legNumbers(m)).toEqual([
      { setNo: 1, legNo: 1 },
      { setNo: 1, legNo: 2 },
      { setNo: 2, legNo: 1 },
      { setNo: 2, legNo: 2 },
      { setNo: 3, legNo: 1 },
      { setNo: 3, legNo: 2 },
    ]);
  });

  it("the throw alternates per leg and keeps cycling across sets (§9.1)", () => {
    let m = newMatch([A, B], rules, { legsToWinSet: 1, setsToWinMatch: 3 });
    expect(matchCurrentPlayer(m)).toBe(A);
    m = winLeg(m, A);
    expect(matchCurrentPlayer(m)).toBe(B); // set 2 starts with B
    m = winLeg(m, B);
    expect(matchCurrentPlayer(m)).toBe(A);
  });

  it("three players: the match starts with the chosen seat", () => {
    const m = newMatch([A, B, C], rules, { legsToWinSet: 1, setsToWinMatch: 1 }, 2);
    expect(matchCurrentPlayer(m)).toBe(C);
  });

  it("refuses darts after the match is won", () => {
    const m = winLeg(winLeg(newMatch([A, B], rules, bestOf3), A), A);
    expect(applyMatchDart(m, S(1))).toEqual({ ok: false, reason: "leg-finished" });
  });
});

describe("undo across leg, set and match boundaries", () => {
  it("first dart of leg 2 undone: leg 2 disappears, leg 1 is finished again", () => {
    const one = winLeg(newMatch([A, B], rules, bestOf3), A);
    const m = undo(play(one, S(1)));
    expect(m).toEqual(one);
    expect(matchStatus(m)).toBe("leg-finished");
  });

  it("undo of the winning dart of leg 1 reopens it, winner gone", () => {
    const m = undo(winLeg(newMatch([A, B], rules, bestOf3), A));
    expect(matchStatus(m)).toBe("running");
    expect(matchScore(m).legs).toEqual({ [A]: 0, [B]: 0 });
    expect(matchCurrentPlayer(m)).toBe(A);
  });

  it("undo over a set boundary takes the set back", () => {
    const set1 = winLeg(newMatch([A, B], rules, { legsToWinSet: 1, setsToWinMatch: 2 }), A);
    expect(matchScore(set1).sets[A]).toBe(1);
    expect(matchScore(undo(set1)).sets[A]).toBe(0);
  });

  it("undo from the finished match reopens it", () => {
    const m = undo(winLeg(winLeg(newMatch([A, B], rules, bestOf3), A), A));
    expect(matchWinner(m)).toBeNull();
    expect(matchStatus(m)).toBe("running");
  });

  it("nothing to undo in a fresh match", () => {
    expect(undoMatchDart(newMatch([A, B], rules, bestOf3))).toEqual({ ok: false, reason: "nothing-to-undo" });
  });
});

describe("undoMatchVisit (server side)", () => {
  it("removes a whole visit, across the leg boundary too", () => {
    const one = winLeg(newMatch([A, B], rules, bestOf3), A);
    const two = play(one, ...MISS);
    expect(ok(undoMatchVisit(two))).toEqual(one);
    expect(matchStatus(ok(undoMatchVisit(one)))).toBe("running");
  });

  it("takes back a play-out decision as a step of its own", () => {
    const fixed = play(newMatch([A, B, C], rules, { legsToWinSet: 1, setsToWinMatch: 1 }), ...OUT, ...OUT);
    const playing = { ...fixed, legs: [ok(startPlayOut(currentLeg(fixed)))] };
    expect(ok(undoMatchVisit(playing))).toEqual(fixed);
  });

  it("nothing to undo in a fresh match", () => {
    expect(undoMatchVisit(newMatch([A, B], rules, bestOf3))).toEqual({ ok: false, reason: "nothing-to-undo" });
  });
});

describe("undoStep (M6: an undo names what it takes back)", () => {
  it("the last visit by position, across the leg boundary; a play-out decision; a declared winner; nothing", () => {
    const one = winLeg(newMatch([A, B], rules, bestOf3), A);
    expect(undoStep(play(one, ...MISS))).toBe("visit:1:0");
    expect(undoStep(one)).toBe(`visit:0:${String(currentLeg(one).visits.length - 1)}`);
    const fixed = play(newMatch([A, B, C], rules, { legsToWinSet: 1, setsToWinMatch: 1 }), ...OUT, ...OUT);
    expect(undoStep({ ...fixed, legs: [ok(startPlayOut(currentLeg(fixed)))] })).toBe("play-out:0");
    expect(undoStep(ok(decideWinner(one, B)))).toBe("decision:b");
    expect(undoStep(newMatch([A, B], rules, bestOf3))).toBeNull();
  });

  it("changes with every undo, so a repeated undo does not match any more", () => {
    const two = play(winLeg(newMatch([A, B], rules, bestOf3), A), ...MISS);
    expect(undoStep(ok(undoMatchVisit(two)))).not.toBe(undoStep(two));
  });
});

describe("choosing the starter (ToStart)", () => {
  it("before the first dart of a leg: allowed, the next leg continues from there", () => {
    let m = setOk(newMatch([A, B], rules, bestOf3), B);
    expect(matchCurrentPlayer(m)).toBe(B);
    expect(currentLeg(m).starter).toBe(1);
    m = winLeg(m, B);
    expect(matchCurrentPlayer(m)).toBe(A);
  });

  it("between legs it sets the starter of the next leg", () => {
    const m = setOk(winLeg(newMatch([A, B], rules, bestOf3), A), A);
    expect(m.legs).toHaveLength(2);
    expect(matchCurrentPlayer(m)).toBe(A);
  });

  it("after the first dart: refused", () => {
    const m = play(newMatch([A, B], rules, bestOf3), S(1));
    expect(setLegStarter(m, B)).toEqual({ ok: false, reason: "leg-started" });
  });

  it("unknown player: refused", () => {
    expect(setLegStarter(newMatch([A, B], rules, bestOf3), "x")).toEqual({ ok: false, reason: "unknown-player" });
  });
});

describe("replayMatch", () => {
  it("rebuilds the same state from stored legs", () => {
    const m = play(winLeg(newMatch([A, B], rules, bestOf3), A), S(3));
    const again = replayMatch(
      m.players,
      m.rules,
      m.format,
      m.legs.map((l) => ({ starter: l.starter, visits: l.visits, playOut: l.playOut })),
    );
    expect(again).toEqual(m);
  });

  it("property: replay of 3 legs equals the sequence of applyDart (random darts)", () => {
    let seed = 7;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed % n;
    };
    const types = ["single", "double", "triple"] as const;
    for (let run = 0; run < 30; run++) {
      let m = newMatch([A, B, C], { startScore: 101, inRule: "single", outRule: "double" }, { legsToWinSet: 3, setsToWinMatch: 1 });
      const thrown: Dart[][] = [];
      for (let i = 0; i < 400 && matchStatus(m) !== "finished"; i++) {
        const type = types[rand(3)];
        const field = rand(5) === 0 ? 25 : rand(21);
        const dart: Dart =
          field === 25 && type === "triple" ? { field, type: "single" } : field === 0 ? { field, type: "single" } : { field, type };
        const r = applyMatchDart(m, dart);
        if (!r.ok) throw new Error(r.reason);
        m = r.value;
        (thrown[m.legs.length - 1] ??= []).push(dart);
      }
      const again = replayMatch(
        m.players,
        m.rules,
        m.format,
        m.legs.map((l) => ({ starter: l.starter, visits: l.visits, playOut: l.playOut })),
      );
      expect(again).toEqual(m);
      // Each leg on its own equals feeding its darts one by one through applyDart.
      for (const [i, leg] of m.legs.entries()) {
        let s: LegState = newLeg(m.players, m.rules, leg.starter);
        for (const d of thrown[i]) s = (applyDart(s, d) as { ok: true; value: LegState }).value;
        expect(s.visits).toEqual(leg.visits);
        expect(isLegFinished(s)).toBe(isLegFinished(leg));
        expect(currentPlayer(s)).toBe(currentPlayer(leg));
      }
    }
  });
});

function setOk(m: MatchState, player: string): MatchState {
  const r = setLegStarter(m, player);
  if (!r.ok) throw new Error(r.reason);
  return r.value;
}

function ok<T>(r: { ok: true; value: T } | { ok: false; reason: string }): T {
  if (!r.ok) throw new Error(r.reason);
  return r.value;
}

describe("declaring the winner after a leg (M9, tournaments)", () => {
  it("only between two legs; the declared player wins, the match is finished", () => {
    const fresh = newMatch([A, B], rules, { legsToWinSet: 3, setsToWinMatch: 1 });
    expect(decideWinner(fresh, B)).toEqual({ ok: false, reason: "not-between-legs" });
    const afterLeg = winLeg(fresh, A);
    expect(decideWinner(afterLeg, "x")).toEqual({ ok: false, reason: "unknown-player" });
    const decided = ok(decideWinner(afterLeg, B)); // free choice, not only the leader
    expect(matchWinner(decided)).toBe(B);
    expect(matchStatus(decided)).toBe("finished");
    expect(applyMatchDart(decided, S(1))).toEqual({ ok: false, reason: "leg-finished" });
  });

  it("undo takes the decision back first, as a step of its own (device and server)", () => {
    const afterLeg = winLeg(newMatch([A, B], rules, { legsToWinSet: 3, setsToWinMatch: 1 }), A);
    const decided = ok(decideWinner(afterLeg, A));
    expect(ok(undoMatchDart(decided))).toEqual(afterLeg);
    expect(ok(undoMatchVisit(decided))).toEqual(afterLeg);
  });
});

describe("matchResult (M9)", () => {
  it("winner, legs over all sets and the 3-dart average per player", () => {
    const m = winLeg(winLeg(newMatch([A, B], rules, { legsToWinSet: 1, setsToWinMatch: 2 }), A), A);
    const r = matchResult(m);
    expect(r.winner).toBe(A);
    expect(r.legs).toEqual({ [A]: 2, [B]: 0 });
    // A: two visits of D20 (40 each); B: one missed visit in leg 2 (B started it)
    expect(r.averages).toEqual({ [A]: 40, [B]: 0 });
  });
});
