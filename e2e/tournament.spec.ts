import { de } from "@/i18n/de";
import { board, chooseRules, K, select } from "./board";
import { ADMIN, expect, shot, test } from "./fixtures";

const t = de.tournaments;

test("M9: a knockout tournament for three, one bye, back to the tournament after each game", async ({ admin, register, stamp }) => {
  const [A, B, name] = [`A${stamp}`, `B${stamp}`, `Cup ${stamp}`];
  await register(A);
  await register(B);
  await admin.goto("/");
  await admin.getByRole("link", { name: de.gameMenu.tournaments }).click();
  await admin.getByRole("link", { name: t.newTournament }).click();
  await admin.waitForURL(/\/tournaments\/new/);
  await admin.getByLabel(t.name).fill(name);
  await admin.getByRole("button", { name: `${t.format}: ${t.formats["round-robin"]}` }).click();
  await admin.getByRole("button", { name: t.formats.knockout, exact: true }).click();
  await chooseRules(admin, { startScore: 301, singleOut: true });
  for (const n of [ADMIN, A, B]) await admin.getByRole("button", { name: select(n) }).click();
  await shot(admin, "tournament-setup");
  await admin.getByRole("button", { name: t.start }).click();
  await admin.waitForURL((u) => /^\/tournaments\/(?!new$)[^/]+$/.test(u.pathname));
  await expect(admin.getByRole("heading", { name })).toBeVisible();
  const url = admin.url();
  await expect(admin.getByText(t.bye)).toHaveCount(1);

  for (let game = 0; game < 2; game++) {
    await admin.getByRole("button", { name: t.play }).first().click();
    await admin.waitForURL(/\/match\//);
    await board(admin).tap(...K.T180, ...K.MISS, ...K.OUT121);
    await admin.getByRole("link", { name: de.game.toTournament }).click();
    await admin.waitForURL(url);
    await expect(admin.getByRole("heading", { name })).toBeVisible();
  }
  await expect(admin.getByText(new RegExp(`^${t.winner.replace("{name}", "")}`))).toHaveCount(1);
  await shot(admin, "tournament", true);

  await admin.getByRole("link", { name: de.ui.back }).click();
  await admin.waitForURL((u) => u.pathname === "/tournaments");
  await expect(admin.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  await shot(admin, "tournament-list");
  await admin.getByRole("link", { name: de.ui.back }).click();
  await admin.waitForURL((u) => u.pathname === "/");
});
