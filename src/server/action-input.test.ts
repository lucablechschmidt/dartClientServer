import { describe, expect, it } from "vitest";
import { isId, newMatchFromForm, newTournamentFromForm, offsetSchema, undoStepSchema, visitPositionSchema } from "./action-input";
import { formNumber } from "./form";

const form = (fields: [string, string][]) => {
  const fd = new FormData();
  for (const [k, v] of fields) fd.append(k, v);
  return fd;
};
const match: [string, string][] = [
  ["mode", "x01"],
  ["playerId", "a"],
  ["playerId", "b"],
  ["startScore", "301"],
  ["inRule", "single"],
  ["outRule", "double"],
  ["legsToWinSet", "3"],
  ["setsToWinMatch", "1"],
  ["inputMode", "per-player"],
];
const without = (fields: [string, string][], name: string) => fields.filter(([k]) => k !== name);
const replaced = (fields: [string, string][], name: string, value: string) =>
  fields.map(([k, v]): [string, string] => [k, k === name ? value : v]);

describe("formNumber", () => {
  it("missing is undefined, empty or text is NaN, otherwise the number", () => {
    const fd = form([
      ["a", "12"],
      ["b", ""],
      ["c", "abc"],
    ]);
    expect(formNumber(fd, "a")).toBe(12);
    expect(formNumber(fd, "b")).toBeNaN();
    expect(formNumber(fd, "c")).toBeNaN();
    expect(formNumber(fd, "d")).toBeUndefined();
  });
});

describe("newMatchFromForm (R-02)", () => {
  it("turns the setup form into the service input, best of into legs to win, the session as host", () => {
    const r = newMatchFromForm(form(match), "host");
    expect(r).toMatchObject({
      ok: true,
      value: {
        mode: "x01",
        playerIds: ["a", "b"],
        rules: { startScore: 301, inRule: "single", outRule: "double" },
        format: { legsToWinSet: 2, setsToWinMatch: 1 },
        inputMode: "per-player",
        hostPlayerId: "host",
      },
    });
  });

  it("missing optional fields take the defaults", () => {
    const fd = form(without(without(without(without(match, "mode"), "inputMode"), "legsToWinSet"), "setsToWinMatch"));
    expect(newMatchFromForm(fd, "host")).toMatchObject({
      ok: true,
      value: { mode: "x01", inputMode: "single", format: { legsToWinSet: 1, setsToWinMatch: 1 } },
    });
  });

  it.each([
    ["no players", without(match, "playerId")],
    ["a start score that is no number", replaced(match, "startScore", "abc")],
    ["an empty start score", replaced(match, "startScore", "")],
    ["an unknown mode", replaced(match, "mode", "golf")],
    ["an unknown rule", replaced(match, "outRule", "quadruple")],
    ["an unknown input mode", replaced(match, "inputMode", "all")],
    ["best of that is no number", replaced(match, "legsToWinSet", "x")],
  ])("%s is invalid input, not an exception", (_, fields) => {
    expect(newMatchFromForm(form(fields), "host")).toEqual({ ok: false, reason: "invalid-input" });
  });
});

describe("newTournamentFromForm (R-02)", () => {
  const tournament: [string, string][] = [
    ["name", "Freitag"],
    ["format", "knockout"],
    ["playerId", "a"],
    ["playerId", "b"],
    ["playerId", "c"],
    ["startScore", "501"],
    ["seeding", "fixed"],
    ["groupLegs", "1"],
    ["groupSets", "1"],
    ["knockoutLegs", "3"],
    ["knockoutSets", "1"],
    ["knockoutLegs", "5"],
    ["knockoutSets", "3"],
  ];

  it("reads every field, rules default to single in and double out", () => {
    expect(newTournamentFromForm(form(tournament))).toMatchObject({
      ok: true,
      value: {
        name: "Freitag",
        format: "knockout",
        playerIds: ["a", "b", "c"],
        rules: { startScore: 501, inRule: "single", outRule: "double" },
        seeding: "fixed",
        groups: 1,
        advance: 2,
        knockoutFormats: [
          { legsToWinSet: 2, setsToWinMatch: 1 },
          { legsToWinSet: 3, setsToWinMatch: 2 },
        ],
      },
    });
  });

  it.each([
    ["an empty name", replaced(tournament, "name", " ")],
    ["one player", without(tournament, "playerId").concat([["playerId", "a"]])],
    ["an unknown format", replaced(tournament, "format", "swiss")],
    ["more qualifiers than allowed", [...replaced(tournament, "format", "groups-knockout"), ["groups", "2"], ["advance", "3"]]],
    ["groups that cannot be filled", [...replaced(tournament, "format", "groups-knockout"), ["groups", "4"]]],
  ] as [string, [string, string][]][])("%s is invalid input", (_, fields) => {
    expect(newTournamentFromForm(form(fields))).toEqual({ ok: false, reason: "invalid-input" });
  });
});

describe("arguments from the client (R-32)", () => {
  it("ids are non-empty strings of sane length", () => {
    expect(isId("0b5c1f3e-1a2b-4c3d-8e9f-001122334455")).toBe(true);
    expect(isId("")).toBe(false);
    expect(isId(42)).toBe(false);
    expect(isId("x".repeat(101))).toBe(false);
  });

  it("visit positions, undo steps and offsets", () => {
    expect(visitPositionSchema.safeParse({ legIndex: 0, seq: 3 }).success).toBe(true);
    expect(visitPositionSchema.safeParse({ legIndex: NaN, seq: 0 }).success).toBe(false);
    expect(visitPositionSchema.safeParse({ legIndex: 0, seq: -1 }).success).toBe(false);
    expect(undoStepSchema.safeParse(undefined).success).toBe(true);
    expect(undoStepSchema.safeParse("visit:0:2").success).toBe(true);
    expect(undoStepSchema.safeParse(7).success).toBe(false);
    expect(offsetSchema.safeParse(20).success).toBe(true);
    expect(offsetSchema.safeParse(1.5).success).toBe(false);
  });
});
