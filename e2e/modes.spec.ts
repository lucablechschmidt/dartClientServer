import { de } from "@/i18n/de";
import { board, K, resultRow, startMatch, winner } from "./board";
import type { Page } from "@playwright/test";
import { ADMIN, expect, settled, shot, test } from "./fixtures";

const g = de.game;

test.describe("M7 modes, each once to the end with an undo", () => {
  let A = "";
  let B = "";
  /** A's and B's own devices, logged in. */
  let pageA: Page;
  let pageB: Page;
  test.beforeEach(async ({ register, stamp }) => {
    [A, B] = [`A${stamp}`, `B${stamp}`];
    pageA = await register(A);
    pageB = await register(B);
  });

  test("cricket: scoring from the fourth mark, undo takes the points back, reduced keypad with X", async ({ admin }) => {
    await startMatch(admin, "cricket", [A, B]);
    const b = board(admin);
    await b.tap(g.triple, "20", g.triple, "20");
    expect((await b.scores())[0]).toBe("60");
    await b.tap(g.undo);
    expect((await b.scores())[0]).toBe("0");
    await b.tap(g.triple, "19", g.triple, "18");
    // B: 15, then X fills the last two darts with misses; one undo takes both back (like a bust)
    await b.tap("15", g.miss, g.undo, "16", "17");
    const row17 = admin
      .getByRole("table", { name: g.marks })
      .getByRole("row")
      .filter({ has: admin.getByRole("rowheader", { name: "17" }) });
    await expect(row17.getByRole("cell")).toHaveText([g.markSymbols[0], g.markSymbols[1]]); // the 17 is B's third dart, not A's first
    await b.tap(g.triple, "17", g.triple, "16", g.triple, "15", g.miss);
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
    await b.tap(g.triple, "20", g.double, "19", g.miss); // A: 20 closed, 19 two marks
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

  test("splitscore: the target moves on each round, X fills misses, a miss halves, the sum on the victory screen", async ({ admin }) => {
    await startMatch(admin, "splitscore", [A, B]);
    const b = board(admin);
    const targets = [["15"], ["16"], [g.double, "1"], ["17"], ["18"], [g.triple, "1"], ["19"], ["20"], [g.bull]];
    for (const [i, hit] of targets.entries()) {
      await b.tap(...hit, g.miss);
      if (i === 0) {
        // X filled the last two darts; one undo takes both back, the round stays open
        await b.tap(g.undo);
        await expect(admin.locator("[aria-live=polite]")).toHaveText(g.hints.target.replace("{target}", "15"));
        await b.tap(g.miss);
      }
      await b.tap(g.miss);
      if (i === 2) await shot(admin, "match-splitscore");
    }
    await expect(winner(admin, A)).toBeVisible();
    await expect(resultRow(admin, B)).toContainText(g.pointsOf.replace("{n}", "1")); // B halved nine times
    await expect(admin.getByRole("listitem").filter({ hasText: g.totalPoints })).toHaveCount(1);
    await shot(admin, "victory-splitscore");

    // own statistics: high score and average of the points at the end, the loser's as well
    const s = de.stats;
    const tiles = async (page: Page, points: string, average: string) => {
      await page.goto("/account/stats");
      await settled(page);
      const tile = (text: string) => page.getByRole("group", { name: text.replace("{mode}", s.modes.splitscore) });
      await expect(tile(s.modeHighScore)).toContainText(points);
      await expect(tile(s.modeAverage)).toContainText(average);
    };
    await tiles(pageA, "175", "175.00");
    await shot(pageA, "account-stats-points");
    await tiles(pageB, "1", "1.00");

    // the history filtered by SplitScore lists the game, the Cricket filter does not
    await admin.goto("/history?mode=splitscore");
    await expect(admin.getByRole("link").filter({ hasText: B }).filter({ hasText: de.gameMenu.modes.splitscore })).toHaveCount(1);
    await admin.getByRole("link", { name: de.overview.modesShort.cricket }).click();
    await expect(admin).toHaveURL(/mode=cricket/);
    await expect(admin.getByRole("link").filter({ hasText: B })).toHaveCount(0);
  });
});
