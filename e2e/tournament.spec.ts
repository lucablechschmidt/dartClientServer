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
  await expect(admin.getByText(t.expectedGames.replace("{n}", "2"))).toBeVisible(); // 4 bracket, one bye
  await admin.getByRole("button", { name: new RegExp(`^${de.newGame.choosePlayersTitle}`) }).click();
  await expect(admin.getByRole("button", { name: select(A) })).toHaveCount(0);
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

test("M8: a fixed seed list starts in the order the players were tapped, without a redraw", async ({ admin, register, stamp }) => {
  const [A, B, C, name] = [`A${stamp}`, `B${stamp}`, `C${stamp}`, `Fix ${stamp}`];
  for (const p of [A, B, C]) await register(p);
  await admin.goto("/tournaments/new");
  await admin.getByLabel(t.name).fill(name);
  await admin.getByRole("button", { name: `${t.format}: ${t.formats["round-robin"]}` }).click();
  await admin.getByRole("button", { name: t.formats.knockout, exact: true }).click();
  await admin.getByRole("button", { name: `${t.seeding}: ${t.seedings.random}` }).click();
  await admin.getByRole("button", { name: t.seedings.fixed }).click();
  for (const n of [C, A, ADMIN, B]) await admin.getByRole("button", { name: select(n) }).click();
  await admin.getByRole("button", { name: t.start }).click();
  await admin.waitForURL((u) => /^\/tournaments\/(?!new$)[^/]+$/.test(u.pathname));
  // seeds 1–4 = C, A, admin, B: semifinals 1 vs 4 and 2 vs 3
  const semis = admin.getByRole("list", { name: t.semifinal }).getByRole("listitem");
  await expect(semis.nth(0)).toContainText(C);
  await expect(semis.nth(0)).toContainText(B);
  await expect(semis.nth(1)).toContainText(A);
  await expect(semis.nth(1)).toContainText(ADMIN);
  await expect(admin.getByRole("button", { name: t.redraw })).toHaveCount(0);
});

for (const format of ["knockout", "groups-knockout"] as const) {
  test(`M14 bug fix: „Neu auslosen“ shows a new draw right away (${format})`, async ({ admin, register, stamp }) => {
    const [A, B, C, name] = [`A${stamp}`, `B${stamp}`, `C${stamp}`, `Draw ${stamp}`];
    for (const p of [A, B, C]) await register(p);
    await admin.goto("/tournaments/new");
    await admin.getByLabel(t.name).fill(name);
    await admin.getByRole("button", { name: `${t.format}: ${t.formats["round-robin"]}` }).click();
    await admin.getByRole("button", { name: t.formats[format], exact: true }).click();
    for (const n of [ADMIN, A, B, C]) await admin.getByRole("button", { name: select(n) }).click();
    await admin.getByRole("button", { name: t.start }).click();
    await admin.waitForURL((u) => /^\/tournaments\/(?!new$)[^/]+$/.test(u.pathname));
    const redraw = admin.getByRole("button", { name: t.redraw });
    await expect(redraw).toBeVisible();
    // Next keeps the left setup page hidden in the DOM: only the visible page counts.
    const page = admin.locator("main:visible");
    const before = await page.innerText();
    // A fair draw may repeat the old bracket or groups; twenty repeats in a row mean the button does nothing.
    let changed = false;
    for (let i = 0; i < 20 && !changed; i++) {
      await redraw.click();
      changed = await expect
        .poll(() => page.innerText(), { timeout: 1500 })
        .not.toBe(before)
        .then(() => true)
        .catch(() => false);
    }
    expect(changed).toBe(true);
  });
}
