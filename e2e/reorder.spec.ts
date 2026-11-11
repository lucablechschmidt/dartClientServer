import type { Page } from "@playwright/test";
import { de } from "@/i18n/de";
import { board, K, startMatch } from "./board";
import { ADMIN, expect, settled, test } from "./fixtures";

const g = de.game;
const sortable = (page: Page) => page.locator(`[aria-roledescription="${g.reorder.roleDescription}"]`);
/** The names in the order of the small panels (first line of each). */
const order = async (page: Page) => (await sortable(page).allInnerTexts()).map((t) => t.split("\n")[0]);

/** Hold a player for longer than the hold time, then drag onto another one. */
async function holdAndDrag(page: Page, from: number, to: number) {
  const a = await sortable(page).nth(from).boundingBox();
  const b = await sortable(page).nth(to).boundingBox();
  if (!a || !b) throw new Error("panel not visible");
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(600);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
}

test("3+ players: hold a player and drag to change the order before the first dart (11.11.2026)", async ({ admin, register, stamp }) => {
  const [A, B, C] = [`A${stamp}`, `B${stamp}`, `C${stamp}`];
  await register(A);
  await register(B);
  await register(C);
  await startMatch(admin, "x01", [ADMIN, A, B, C], { startScore: 301, singleOut: true });
  await expect(sortable(admin)).toHaveCount(4);
  const short = (n: string) => n.slice(0, 5); // small panels show the first five letters
  expect(await order(admin)).toEqual([ADMIN, A, B, C].map(short));

  await holdAndDrag(admin, 1, 2); // A behind B (the fourth panel is off screen; there is no auto-scroll)
  await expect.poll(() => order(admin)).toEqual([ADMIN, B, A, C].map(short));
  await board(admin).saved();
  await admin.reload();
  await settled(admin);
  await expect.poll(() => order(admin)).toEqual([ADMIN, B, A, C].map(short)); // stored as seats

  // a short tap still chooses the starter; the order after them stays
  await sortable(admin).nth(1).click();
  await expect(admin.getByText(g.nextPlayer.replace("{name}", A), { exact: true })).toBeVisible(); // B starts, then A

  // after the first dart the order is fixed
  await board(admin).tap(...K.MISS);
  await expect(sortable(admin)).toHaveCount(0);
});

test("cricket with three: the column heads are sortable, Alt + arrow moves one (keyboard)", async ({ admin, register, stamp }) => {
  const [A, B] = [`A${stamp}`, `B${stamp}`];
  await register(A);
  await register(B);
  await startMatch(admin, "cricket", [ADMIN, A, B]);
  const names = [ADMIN, A, B];
  /** The players' names in the order of the column heads. */
  const heads = async () =>
    (await admin.getByRole("table", { name: g.marks }).getByRole("columnheader").allInnerTexts()).flatMap((t) =>
      t.split("\n").filter((l) => names.includes(l.trim())),
    );
  await expect(sortable(admin)).toHaveCount(3);
  await sortable(admin).nth(0).focus();
  await admin.keyboard.press("Alt+ArrowRight");
  await expect.poll(heads).toEqual([A, ADMIN, B]);
  await board(admin).saved();
  await admin.reload();
  await settled(admin);
  await expect.poll(heads).toEqual([A, ADMIN, B]);
});
