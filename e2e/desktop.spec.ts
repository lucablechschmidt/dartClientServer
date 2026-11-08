import { de } from "@/i18n/de";
import { addGuest, board, K, startMatch, wins } from "./board";
import type { Page } from "@playwright/test";
import { expect, settled, shot, test } from "./fixtures";

/** Opens a page and waits until its streamed parts are in. */
async function open(page: Page, path: string) {
  await page.goto(path);
  await settled(page);
}

test.use({ viewport: { width: 1440, height: 900 } });

/** The main screens in a desktop browser (light mode), as docs/screenshots/*-desktop.png (layout check). */
test("desktop: the main screens", async ({ admin, register, stamp }) => {
  const [A, B, G] = [`A${stamp}`, `B${stamp}`, `G${stamp}`];
  const pageA = await register(A);
  await register(B);

  await admin.goto("/new/x01");
  await addGuest(admin, G);
  await shot(admin, "setup-x01-desktop");

  // the same two games as in stats.spec.ts
  await startMatch(admin, "x01", [A, B], { startScore: 301, singleOut: true });
  const b = board(admin);
  await b.tap(...K.T180);
  await shot(admin, "match-desktop");
  await b.tap(...K.MISS, ...K.OUT121);
  await expect(admin.getByText(wins(A))).toBeVisible();
  await shot(admin, "victory-desktop");
  await startMatch(admin, "x01", [A, B], { startScore: 301, singleOut: true });
  await b.tap(...K.MISS, ...K.T180, ...K.MISS, ...K.OUT121);
  await expect(admin.getByText(wins(B))).toBeVisible();

  await open(admin, "/");
  await shot(admin, "overview-desktop");
  await open(admin, "/players");
  await shot(admin, "players-desktop");
  await open(admin, "/admin");
  await shot(admin, "admin-desktop");
  await open(admin, "/tournaments/new");
  await shot(admin, "tournament-setup-desktop");

  await open(pageA, "/account");
  await shot(pageA, "account-desktop");
  await open(pageA, "/account/stats");
  await shot(pageA, "account-stats-desktop");
  await open(pageA, "/account/rankings");
  await pageA.getByRole("button", { name: new RegExp(`^${de.stats.modes.x01}`) }).click();
  await shot(pageA, "account-rankings-desktop");
  await open(pageA, "/account/achievements");
  await shot(pageA, "account-achievements-desktop");
  await pageA.goto("/account/stats");
  await pageA.getByRole("list", { name: de.stats.recent }).getByRole("link").first().click();
  await pageA.waitForURL(/\/match\/[^/]+\/stats$/);
  await settled(pageA);
  await shot(pageA, "match-stats-desktop");
});
