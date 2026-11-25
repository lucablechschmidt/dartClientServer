import { describe, expect, it } from "vitest";
import { historyFilter, historyHref, historyMatchHref, historyStatsHref } from "./history-href";

describe("history links", () => {
  it("keeps a valid mode and n, drops everything else", () => {
    expect(historyFilter({})).toEqual({});
    expect(historyFilter({ mode: "x01" })).toEqual({ mode: "x01" });
    expect(historyFilter({ mode: "cricket", n: "50" })).toEqual({ mode: "cricket", n: "50" });
    expect(historyFilter({ mode: "poker", n: "abc" })).toEqual({});
    expect(historyFilter({ mode: ["x01", "cricket"], n: ["25"] })).toEqual({});
  });

  it("the game and its statistics live below /history and carry the filter", () => {
    expect(historyHref({})).toBe("/history");
    expect(historyHref({ mode: "x01" })).toBe("/history?mode=x01");
    expect(historyMatchHref("m1", {})).toBe("/history/match/m1");
    expect(historyMatchHref("m1", { mode: "x01" })).toBe("/history/match/m1?mode=x01");
    expect(historyStatsHref("m1", {})).toBe("/history/match/m1/stats?from=match");
    expect(historyStatsHref("m1", { mode: "x01", n: "50" })).toBe("/history/match/m1/stats?from=match&mode=x01&n=50");
  });
});
