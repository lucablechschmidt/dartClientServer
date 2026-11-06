import { de } from "@/i18n/de";
import { addGuest, board, K, startMatch, wins } from "./board";
import type { Page } from "@playwright/test";
import { expect, shot, test } from "./fixtures";

/** Opens a page without a live stream and waits until its streamed parts are in. */
async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

test.use({ colorScheme: "dark" });

/** The main screens in dark mode, as docs/screenshots/*-dark.png (theme check, docs/theme.md). */
test("dark mode: the main screens", async ({ admin, register, stamp }) => {
  const [A, B, G] = [`A${stamp}`, `B${stamp}`, `G${stamp}`];
  const pageA = await register(A);
  await register(B);

  await admin.goto("/new/x01");
  await addGuest(admin, G);
  await shot(admin, "setup-x01-dark");

  await startMatch(admin, "x01", [A, B], { startScore: 301, singleOut: true });
  const b = board(admin);
  await b.tap(...K.T180);
  await shot(admin, "match-dark");
  await b.tap(...K.MISS, ...K.OUT121);
  await expect(admin.getByText(wins(A))).toBeVisible();
  await shot(admin, "victory-dark");

  await open(admin, "/");
  await shot(admin, "overview-dark");
  await open(admin, "/players");
  await shot(admin, "players-dark");
  await open(admin, "/admin");
  await shot(admin, "admin-dark");
  await open(admin, "/tournaments/new");
  await shot(admin, "tournament-setup-dark");

  await open(pageA, "/account");
  await shot(pageA, "account-dark");
  await open(pageA, "/account/stats");
  await shot(pageA, "account-stats-dark");
  await open(pageA, "/account/rankings");
  await pageA.getByRole("button", { name: new RegExp(`^${de.stats.modes.x01}`) }).click();
  await shot(pageA, "account-rankings-dark");
  await open(pageA, "/account/achievements");
  await shot(pageA, "account-achievements-dark");
});
