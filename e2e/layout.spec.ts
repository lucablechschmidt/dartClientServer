import { addGuest, board } from "./board";
import { de } from "@/i18n/de";
import { expect, test } from "./fixtures";

const VIEWPORTS = [
  [375, 667],
  [667, 375],
  [768, 1024],
  [1024, 768],
  [1280, 800],
] as const;

test("the scoring screen fits without scrolling in five viewports, light and dark", async ({ admin, browser, stamp }, info) => {
  await admin.goto("/new/x01");
  await addGuest(admin, `G${stamp}`);
  await addGuest(admin, `H${stamp}`);
  await admin.getByRole("button", { name: de.newGame.start }).click();
  await admin.waitForURL(/\/match\//);
  await board(admin).tap(de.game.triple, "20", "20");
  const session = await admin.context().storageState();

  for (const colorScheme of ["light", "dark"] as const) {
    for (const [width, height] of VIEWPORTS) {
      const context = await browser.newContext({ storageState: session, viewport: { width, height }, colorScheme });
      const page = await context.newPage();
      await page.goto(admin.url());
      await board(page).key("20").waitFor();
      const size = await page.evaluate(() => {
        const e = document.documentElement;
        return { scrollsDown: e.scrollHeight > e.clientHeight, scrollsSideways: e.scrollWidth > e.clientWidth };
      });
      await info.attach(`${colorScheme}-${String(width)}x${String(height)}`, { body: await page.screenshot(), contentType: "image/png" });
      expect(size, `${colorScheme} ${String(width)}x${String(height)}`).toEqual({ scrollsDown: false, scrollsSideways: false });
      await context.close();
    }
  }
});
