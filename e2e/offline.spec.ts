import type { Page } from "@playwright/test";
import { de } from "@/i18n/de";
import { addGuest, board } from "./board";
import { expect, test } from "./fixtures";

const g = de.game;
const unsaved = (n: number) => (n === 1 ? g.unsavedVisit : g.unsavedVisits.replace("{n}", String(n)));
/** Server actions are POSTs to the page URL carrying a Next-Action header. */
const isAction = (route: { request: () => { method: () => string; headers: () => Record<string, string> } }) =>
  route.request().method() === "POST" && "next-action" in route.request().headers();

/**
 * A 501 match of two guests, the admin enters for both. G's first visit (1 1 1 → 498) is saved and
 * the page fully loaded before a test cuts the network, as at the board: the scoring screen loads
 * part of its code on the first visit, which must not fall into the outage.
 */
async function guestMatch(admin: Page, stamp: string) {
  await admin.goto("/new/x01");
  await addGuest(admin, `G${stamp}`);
  await addGuest(admin, `H${stamp}`);
  await admin.getByRole("button", { name: de.newGame.start }).click();
  await admin.waitForURL(/\/match\//);
  const b = board(admin);
  // tap waits until the visit is saved: the first server action has run, so its code is loaded (R-35: no networkidle)
  await b.tap("1", "1", "1");
  return b;
}
const scoreOfH = async (page: Page) => (await board(page).scores())[1];

test.describe("M6: outages lose nothing", () => {
  test("offline in the middle of a visit: unsaved while offline, saved after, still there after a reload", async ({ admin, stamp }) => {
    const b = await guestMatch(admin, stamp);
    await b.key("20").click();
    await admin.context().setOffline(true);
    await b.key("20").click();
    await b.key("20").click();
    await expect(b.status()).toHaveText(unsaved(1));
    await admin.context().setOffline(false);
    await expect(b.status()).toHaveAttribute("data-sync", "saved");
    await admin.reload();
    await expect.poll(() => scoreOfH(admin)).toBe("441");
  });

  test("three visits and an undo offline: the undone visit never leaves the device, the rest arrives", async ({ admin, stamp }) => {
    const b = await guestMatch(admin, stamp);
    await admin.context().setOffline(true);
    for (const k of ["20", "20", "20", "5", "5", "5", "1", "1", "1", g.undo]) await b.key(k).click();
    await expect(b.status()).toHaveText(unsaved(2));
    await admin.context().setOffline(false);
    await expect(b.status()).toHaveAttribute("data-sync", "saved");
    await admin.reload();
    await expect.poll(() => b.scores()).toEqual(["483", "439"]); // G 498-15; H 501-60-2 (the open visit)
  });

  test("offline, tab closed and opened again: the stored queue is played", async ({ admin, stamp }) => {
    const b = await guestMatch(admin, stamp);
    const url = admin.url();
    await admin.context().setOffline(true);
    for (const k of [g.triple, "20", g.triple, "20", g.triple, "20"]) await b.key(k).click();
    await expect(b.status()).toHaveText(unsaved(1));
    const context = admin.context();
    await admin.close();
    await context.setOffline(false);

    const again = await context.newPage();
    await again.goto(url);
    await expect(again.locator("[data-score]").nth(1)).toHaveText("321"); // from the stored queue
    await expect(board(again).status()).toHaveAttribute("data-sync", "saved");
    const other = await context.newPage();
    await other.goto(url);
    await expect.poll(() => scoreOfH(other)).toBe("321");
  });

  test("the server answers 500: retried with backoff, saved once it works again", async ({ admin, stamp }) => {
    const b = await guestMatch(admin, stamp);
    await admin.route("**/match/**", (route) => (isAction(route) ? route.fulfill({ status: 500 }) : route.fallback()));
    for (const k of ["20", "20", "20"]) await b.key(k).click();
    await expect(b.status()).toHaveText(unsaved(1));
    await admin.unroute("**/match/**");
    await expect(b.status()).toHaveAttribute("data-sync", "saved", { timeout: 15_000 });
  });

  test("a tap on the status line sends at once instead of waiting for the backoff", async ({ admin, stamp }) => {
    const b = await guestMatch(admin, stamp);
    await admin.route("**/match/**", (route) => (isAction(route) ? route.fulfill({ status: 500 }) : route.fallback()));
    for (const k of ["20", "20", "20"]) await b.key(k).click();
    await expect(b.status()).toHaveText(unsaved(1));
    await admin.waitForTimeout(8_000); // the backoff is at 4–8 s by now
    await admin.unroute("**/match/**");
    await b.status().getByRole("button").click();
    await expect(b.status()).toHaveAttribute("data-sync", "saved", { timeout: 1_500 });
  });

  test("a second device sees the old state during the outage and the new one after", async ({ admin, browser, stamp }) => {
    const b = await guestMatch(admin, stamp);
    const watcher = await browser.newContext({ storageState: await admin.context().storageState() });
    const second = await watcher.newPage();
    await second.goto(admin.url());
    await admin.context().setOffline(true);
    for (const k of ["20", "20", "20"]) await b.key(k).click();
    await expect(b.status()).toHaveText(unsaved(1));
    await second.waitForTimeout(1_000);
    expect(await scoreOfH(second)).toBe("501");
    await admin.context().setOffline(false);
    await expect(second.locator("[data-score]").nth(1)).toHaveText("441");
    await watcher.close();
  });

  test("ten minutes without progress: resend or drop the queue and re-enter", async ({ admin, stamp }) => {
    await admin.clock.install();
    const b = await guestMatch(admin, stamp);
    await admin.context().setOffline(true);
    for (const k of ["20", "20", "20"]) await b.key(k).click();
    await expect(b.status()).toHaveText(unsaved(1));
    await admin.clock.fastForward("10:30");
    const sheet = admin.getByRole("dialog", { name: g.staleQuestion });
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: g.reenter }).click();
    await admin.context().setOffline(false);
    await expect(b.status()).toHaveAttribute("data-sync", "saved");
    expect(await scoreOfH(admin)).toBe("501");
    await admin.reload();
    await expect.poll(() => scoreOfH(admin)).toBe("501");
  });
});
