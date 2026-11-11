import { de } from "@/i18n/de";
import { board, K, startMatch, winner } from "./board";
import { expect, shot, test } from "./fixtures";

const a = de.achievements;
const g = de.game;

test("M10: a 180 shows the banner and lands in the gallery; undo takes it away; the next 180 is not new", async ({
  admin,
  register,
  stamp,
}) => {
  const [A, B] = [`A${stamp}`, `B${stamp}`];
  const pageA = await register(A);
  await register(B);
  const b = board(admin);
  const banner = admin.getByRole("region", { name: a.title }).filter({ hasText: a.banner.replace("{name}", A) });
  const gallery180 = async () => {
    await pageA.goto("/account");
    await pageA.getByRole("link", { name: de.account.pages.achievements }).click();
    await pageA.waitForURL((u) => u.pathname === "/account/achievements");
    return pageA.getByRole("list", { name: a.title }).getByRole("listitem", { name: a.items["180"].name });
  };

  await startMatch(admin, "x01", [A, B], { startScore: 301, singleOut: true });
  await b.tap(...K.T180, ...K.MISS, ...K.OUT121);
  await expect(winner(admin, A)).toBeVisible();
  await expect(banner).toContainText(a.items["180"].name);
  await shot(admin, "victory-achievement");
  await expect(await gallery180()).toContainText(a.earned.replace("{when}", de.overview.justNow));

  await admin.getByRole("button", { name: g.undoWinningDart }).click();
  await expect(winner(admin, A)).toHaveCount(0);
  // open again once the undo is stored: the game is running
  await expect(async () => expect(await gallery180()).toContainText(a.items["180"].how, { timeout: 1000 })).toPass();
  await b.tap("1");
  await expect(banner).toContainText(a.items["180"].name);
  await expect(await gallery180()).toContainText(a.earned.replace("{when}", de.overview.justNow)); // back after the new finish
  await shot(pageA, "account-achievements");
  // "Gotta catch 'Em All!" folds open and names the missing doubles (single out here, so all 21).
  const allFinishes = pageA.getByRole("list", { name: a.title }).getByRole("listitem", { name: a.items["all-finishes"].name });
  await allFinishes.getByRole("button").click();
  await expect(allFinishes.getByRole("list", { name: a.missing.replace("{n}", "21") }).getByRole("listitem")).toHaveCount(21);
  await allFinishes.getByRole("list", { name: a.missing.replace("{n}", "21") }).scrollIntoViewIfNeeded();
  await shot(pageA, "account-achievements-open");

  await startMatch(admin, "x01", [A, B], { startScore: 301, singleOut: true });
  await b.tap(...K.T180, ...K.MISS, ...K.OUT121);
  await expect(winner(admin, A)).toBeVisible();
  // the banner loads after the game is saved; give it the time it took above, then it must still be absent
  await admin.waitForTimeout(1500);
  await expect(banner).toHaveCount(0);
});
