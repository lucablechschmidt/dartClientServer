import { de } from "@/i18n/de";
import { board, K, startMatch, wins } from "./board";
import { expect, shot, test } from "./fixtures";

const s = de.stats;

test("M8: own statistics in the account tab after two x01 games", async ({ admin, register, stamp }) => {
  const [A, B] = [`A${stamp}`, `B${stamp}`];
  const pageA = await register(A);
  await register(B);
  const b = board(admin);

  await startMatch(admin, "x01", [A, B], { startScore: 301, singleOut: true });
  await b.tap(...K.T180, ...K.MISS, ...K.OUT121); // A: 180, 121 out
  await expect(admin.getByText(wins(A))).toBeVisible();
  await startMatch(admin, "x01", [A, B], { startScore: 301, singleOut: true });
  await b.tap(...K.MISS, ...K.T180, ...K.MISS, ...K.OUT121); // B wins, A misses twice
  await expect(admin.getByText(wins(B))).toBeVisible();

  await pageA.goto("/account");
  const tile = (label: string) => pageA.getByRole("group", { name: label });
  await expect(tile(s.games)).toContainText("2");
  await expect(tile(s.wins)).toContainText("1");
  await expect(tile(s.average)).toContainText((301 / 4).toFixed(2)); // 180 + 121 over four visits
  await expect(tile(s.highestFinish)).toContainText("121");
  await expect(tile(s.bestLeg.replace("{start}", "301"))).toContainText(s.darts.replace("{n}", "6"));
  await expect(pageA.getByRole("img", { name: s.history })).toBeVisible();
  await pageA.getByRole("button", { name: `${s.field} 20: ${s.hits.replace("{n}", "15")}` }).click();
  await expect(pageA.getByText(`${s.field} 20 · ${s.hits.replace("{n}", "15")}`)).toBeVisible();
  await shot(pageA, "account-stats", true);

  await pageA.getByRole("navigation", { name: s.range }).getByRole("link", { name: s.ranges["30d"] }).click();
  await pageA.waitForURL(/range=30d/);
  await expect(tile(s.games)).toContainText("2");

  // rankings: A wins first (1016 / 984), then B as the outsider gains more than 16 (A 998.5, B 1001.5);
  // folded only the own place and Elo
  const x01 = pageA.getByRole("button", { name: new RegExp(`^${s.modes.x01}`) });
  await expect(x01).toContainText(s.ownRank.replace("{place}", "2").replace("{elo}", "999"));
  await expect(pageA.getByRole("button", { name: new RegExp(`^${s.modes.cricket}`) })).toContainText(s.notRanked);
  await x01.click();
  const table = pageA.getByRole("table", { name: s.ranking.replace("{mode}", s.modes.x01) });
  await expect(table.getByRole("row").filter({ hasText: A })).toHaveAttribute("aria-current", "true");
  await expect(table.getByRole("row").filter({ hasText: B })).toContainText("1001");
  await table.scrollIntoViewIfNeeded();
  await shot(pageA, "account-rankings");
});
