// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { applyDart, newLeg, type Dart, type LegState } from "@/domain/x01";
import { restoreOpenVisit, storeOpenVisit } from "./open-visit-storage";

const rules = { startScore: 501, inRule: "single", outRule: "double" } as const;
const T20: Dart = { field: 20, type: "triple" };
const play = (s: LegState, ...darts: Dart[]) =>
  darts.reduce((acc, d) => {
    const r = applyDart(acc, d);
    if (!r.ok) throw new Error(r.reason);
    return r.value;
  }, s);

beforeEach(() => localStorage.clear());

describe("open visit storage", () => {
  it("restores an open visit on top of the matching server state", () => {
    const server = newLeg(["a", "b"], rules, 0);
    const local = play(server, T20, T20);
    storeOpenVisit("m", local);
    expect(restoreOpenVisit("m", server)).toEqual(local);
  });
  it("ignores the stored visit when the server has moved on, and forgets it once the visit is closed", () => {
    const server = newLeg(["a", "b"], rules, 0);
    storeOpenVisit("m", play(server, T20));
    const moved = play(server, T20, T20, T20);
    expect(restoreOpenVisit("m", moved)).toBe(moved);
    storeOpenVisit("m", moved);
    expect(localStorage.getItem("darts:open-visit:m")).toBeNull();
  });
  it("survives garbage in storage", () => {
    localStorage.setItem("darts:open-visit:m", "{not json");
    const server = newLeg(["a"], rules, 0);
    expect(restoreOpenVisit("m", server)).toBe(server);
  });
});
