import { de } from "@/i18n/de";
import { board, K, resultRow, startMatch, winner } from "./board";
import { ADMIN, expect, shot, test } from "./fixtures";

const g = de.game;

test.describe("M7 modes, each once to the end with an undo", () => {
  let A = "";
  let B = "";
  test.beforeEach(async ({ register, stamp }) => {
    [A, B] = [`A${stamp}`, `B${stamp}`];
    await register(A);
    await register(B);
  });

  test("cricket: scoring from the fourth mark, undo takes the points back, reduced keypad", async ({ admin }) => {
    await startMatch(admin, "cricket", [A, B]);
    const b = board(admin);
    await b.tap(g.triple, "20", g.triple, "20");
    expect((await b.scores())[0]).toBe("60");
    await b.tap(g.undo);
    expect((await b.scores())[0]).toBe("0");
    await b.tap(g.triple, "19", g.triple, "18", ...K.MISS, g.triple, "17", g.triple, "16", g.triple, "15", ...K.MISS);
    await expect(admin.getByText(g.nextPlayer.replace("{name}", B))).toHaveCount(1);
    await expect(b.key("1")).toHaveCount(0);
    await b.tap(g.double, g.bull, g.bull, "20");
    await expect(winner(admin, A)).toBeVisible();
    // the loser: darts and the fields still open, the points on the right
    await expect(resultRow(admin, B)).toContainText(g.openFields.replace("{fields}", ""));
    await expect(resultRow(admin, B)).toContainText(g.pointsOf.replace("{n}", "0"));
    await shot(admin, "victory-cricket");
  });

  test("cricket with three: closed by everyone struck through, scoring field marked (screenshot)", async ({ admin }) => {
    await startMatch(admin, "cricket", [ADMIN, A, B]);
    const b = board(admin);
    await b.tap(g.triple, "20", g.triple, "19", "18"); // admin: 20 and 19 closed, 18 one mark
    await b.tap(g.triple, "20", g.double, "19", "0"); // A: 20 closed, 19 two marks
    await b.tap(g.triple, "20", "17", "17"); // B: 20 closed, now by everyone
    const table = admin.getByRole("table", { name: g.marks });
    await expect(table.getByRole("rowheader", { name: "20" })).toHaveClass(/line-through/);
    await expect(table.getByRole("rowheader", { name: "19" })).toHaveClass(/bg-cricket-scoring/);
    await shot(admin, "match-cricket");
  });

  test("elimination: landing on another score sends that player to 0, undo brings them back", async ({ admin }) => {
    await startMatch(admin, "elimination", [A, B]);
    const b = board(admin);
    await b.tap("20", "0", "0");
    await expect(admin.getByText(g.hints.elimination.replace("{n}", "20"))).toBeVisible();
    await b.tap("15", "5");
    expect(await b.scores()).toEqual(["0", "20"]);
    await b.tap(g.undo);
    expect(await b.scores()).toEqual(["20", "15"]);
    await b.tap("0", "0");
    await b.tap(...K.T180); // A 200
    await expect(admin.getByText(g.hints.gap.replace("{n}", "185"))).toBeVisible(); // B 15: 185 is out of reach
    await b.tap(...K.MISS);
    await b.tap(g.triple, "20", g.triple, "13", g.double, "1"); // 260, 299, 301
    await expect(winner(admin, A)).toBeVisible();
  });

  test("splitscore: the target moves on each round, a miss halves, the sum on the victory screen", async ({ admin }) => {
    await startMatch(admin, "splitscore", [A, B]);
    const b = board(admin);
    const targets = [["15"], ["16"], [g.double, "1"], ["17"], ["18"], [g.triple, "1"], ["19"], ["20"], [g.bull]];
    for (const [i, hit] of targets.entries()) {
      await b.tap(...hit, "0", "0");
      if (i === 0) {
        await b.tap("0", g.undo);
        await expect(admin.locator("[aria-live=polite]")).toHaveText(g.hints.target.replace("{target}", "15"));
      }
      await b.tap(...K.MISS);
      if (i === 2) await shot(admin, "match-splitscore");
    }
    await expect(winner(admin, A)).toBeVisible();
    await expect(resultRow(admin, B)).toContainText(g.pointsOf.replace("{n}", "1")); // B halved nine times
    await expect(admin.getByRole("listitem").filter({ hasText: g.totalPoints })).toHaveCount(1);
    await shot(admin, "victory-splitscore");

    await admin.goto("/");
    await expect(
      admin
        .getByRole("list", { name: de.overview.recent })
        .getByText(new RegExp(`${de.gameMenu.modes.splitscore} ·`))
        .first(),
    ).toBeVisible();
  });
});
