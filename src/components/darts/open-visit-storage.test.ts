// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { applyMatchDart, newMatch, type Dart, type MatchState } from "@/domain/x01";
import { restoreOpenVisit, storeOpenVisit } from "./open-visit-storage";

const rules = { startScore: 501, inRule: "single", outRule: "double" } as const;
const format = { legsToWinSet: 2, setsToWinMatch: 1 };
const T20: Dart = { field: 20, type: "triple" };
const play = (s: MatchState, ...darts: Dart[]) =>
  darts.reduce((acc, d) => {
    const r = applyMatchDart(acc, d);
    if (!r.ok) throw new Error(r.reason);
    return r.value;
  }, s);

beforeEach(() => localStorage.clear());

describe("open visit storage", () => {
  it("restores an open visit on top of the matching server state", () => {
    const server = newMatch(["a", "b"], rules, format);
    const local = play(server, T20, T20);
    storeOpenVisit("m", local);
    expect(restoreOpenVisit("m", server)).toEqual(local);
  });
  it("restores an open visit that started the next leg", () => {
    const server = play(newMatch(["a", "b"], { startScore: 40, inRule: "single", outRule: "double" }, format), { field: 20, type: "double" });
    const local = play(server, { field: 1, type: "single" });
    expect(local.legs).toHaveLength(2);
    storeOpenVisit("m", local);
    expect(restoreOpenVisit("m", server)).toEqual(local);
  });
  it("ignores the stored visit when the server has moved on, and forgets it once the visit is closed", () => {
    const server = newMatch(["a", "b"], rules, format);
    storeOpenVisit("m", play(server, T20));
    const moved = play(server, T20, T20, T20);
    expect(restoreOpenVisit("m", moved)).toBe(moved);
    storeOpenVisit("m", moved);
    expect(localStorage.getItem("darts:open-visit:m")).toBeNull();
  });
  it("survives garbage in storage", () => {
    localStorage.setItem("darts:open-visit:m", "{not json");
    const server = newMatch(["a"], rules, format);
    expect(restoreOpenVisit("m", server)).toBe(server);
  });
});
