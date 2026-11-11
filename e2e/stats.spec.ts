import { de } from "@/i18n/de";
import { board, K, startMatch, winner } from "./board";
import { expect, shot, test } from "./fixtures";

const s = de.stats;

test("M8: own statistics and rankings from the account tab after two x01 games", async ({ admin, register, stamp }) => {
  const [A, B] = [`A${stamp}`, `B${stamp}`];
  const pageA = await register(A);
  await register(B);
  const b = board(admin);

  await startMatch(admin, "x01", [A, B], { startScore: 301, singleOut: true });
  await b.tap(...K.T180, ...K.MISS, ...K.OUT121); // A: 180, 121 out
  await expect(winner(admin, A)).toBeVisible();
  await startMatch(admin, "x01", [A, B], { startScore: 301, singleOut: true });
  await b.tap(...K.MISS, ...K.T180, ...K.MISS, ...K.OUT121); // B winner, A misses twice
  await expect(winner(admin, B)).toBeVisible();
  const second = admin.url();
  await expect(admin.getByRole("link", { name: de.game.matchStats })).toHaveCount(0); // the admin did not play

  const pages = de.account.pages;
  await pageA.goto("/account");
  await pageA.getByRole("link", { name: pages.stats }).click();
  await pageA.waitForURL((u) => u.pathname === "/account/stats");
  const tile = (label: string) => pageA.getByRole("group", { name: label });
  await expect(tile(s.games)).toContainText("2");
  await expect(tile(s.wins)).toContainText("1");
  await expect(tile(s.average)).toContainText((301 / 4).toFixed(2)); // 180 + 121 over four visits
  await expect(tile(s.highestFinish)).toContainText("121");
  await expect(tile(s.bestLeg.replace("{start}", "301"))).toContainText(s.darts.replace("{n}", "6"));
  await expect(pageA.getByRole("img", { name: s.history })).toBeVisible();
  await pageA.getByRole("button", { name: `${s.field} 20: ${s.hits.replace("{n}", "15")}` }).click();
  await expect(pageA.getByText(`${s.field} 20 · ${s.hits.replace("{n}", "15")}`)).toBeVisible();
  await expect(tile(s.rings.triple)).toContainText("5"); // five T20, no single or double 20
  await expect(tile(s.rings.single)).toContainText("0");
  await shot(pageA, "account-stats", true);

  await pageA.getByRole("navigation", { name: s.range }).getByRole("link", { name: s.ranges["30d"] }).click();
  await pageA.waitForURL(/range=30d/);
  await expect(tile(s.games)).toContainText("2");

  await pageA.getByRole("link", { name: de.ui.back }).click();
  await pageA.waitForURL((u) => u.pathname === "/account");
  await shot(pageA, "account");
  await pageA.getByRole("link", { name: pages.rankings }).click();
  await pageA.waitForURL((u) => u.pathname === "/account/rankings");
  // rankings: A winner first (1016 / 984), then B as the outsider gains more than 16 (A 998.5, B 1001.5);
  // folded only the own place and Elo
  const x01 = pageA.getByRole("button", { name: new RegExp(`^${s.modes.x01}`) });
  // the place depends on what the other tests played in the shared database, the Elo does not
  await expect(x01).toContainText(new RegExp(s.ownRank.replace("{place}", "\\d+").replace("{elo}", "999")));
  await expect(pageA.getByRole("button", { name: new RegExp(`^${s.modes.cricket}`) })).toContainText(s.notRanked);
  await x01.click();
  const table = pageA.getByRole("table", { name: s.ranking.replace("{mode}", s.modes.x01) });
  await expect(table.getByRole("row").filter({ hasText: A })).toHaveAttribute("aria-current", "true");
  await expect(table.getByRole("row").filter({ hasText: B })).toContainText("1001");
  await table.scrollIntoViewIfNeeded();
  await shot(pageA, "account-rankings");

  // match page: from the own recent games, from the victory screen; nobody else (the admin neither)
  await pageA.goto("/account/stats");
  await pageA.getByRole("list", { name: s.recent }).getByRole("link").first().click();
  await pageA.waitForURL(/\/match\/[^/]+\/stats$/);
  const leg = pageA.getByRole("table", { name: s.detail.leg.replace("{n}", "1") });
  await expect(leg.getByRole("row").first()).toContainText(A);
  await expect(leg).toContainText(s.detail.rest.replace("{n}", "121"));
  await shot(pageA, "match-stats");
  await pageA.getByRole("link", { name: de.ui.back }).click();
  await pageA.waitForURL((u) => u.pathname === "/account/stats");
  await pageA.goto(second);
  await pageA.getByRole("link", { name: de.game.matchStats }).click();
  await pageA.waitForURL(/\/stats\?from=match$/);
  await pageA.getByRole("link", { name: de.ui.back }).click();
  await pageA.waitForURL(second);
  await admin.goto(`${new URL(second).pathname}/stats`);
  await expect(admin.getByText(de.errorPage.notFoundTitle)).toBeVisible();
});
