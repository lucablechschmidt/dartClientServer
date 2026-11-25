import { describe, expect, it } from "vitest";
import { historyHref, historyMatchHref, historyQuery, historyStatsHref } from "./history-href";

describe("history links", () => {
  it("keeps a valid mode and n, drops everything else", () => {
    expect(historyQuery({})).toBe("");
    expect(historyQuery({ mode: "x01" })).toBe("?mode=x01");
    expect(historyQuery({ mode: "cricket", n: "50" })).toBe("?mode=cricket&n=50");
    expect(historyQuery({ mode: "poker", n: "abc" })).toBe("");
    expect(historyQuery({ mode: ["x01", "cricket"], n: ["25"] })).toBe("");
  });

  it("the game and its statistics live below /history and carry the filter", () => {
    expect(historyHref("?mode=x01")).toBe("/history?mode=x01");
    expect(historyMatchHref("m1", "")).toBe("/history/match/m1");
    expect(historyMatchHref("m1", "?mode=x01")).toBe("/history/match/m1?mode=x01");
    expect(historyStatsHref("m1", "")).toBe("/history/match/m1/stats?from=match");
    expect(historyStatsHref("m1", "?mode=x01&n=50")).toBe("/history/match/m1/stats?from=match&mode=x01&n=50");
  });
});
