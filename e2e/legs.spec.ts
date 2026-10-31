import { de } from "@/i18n/de";
import { addGuest, board, deselect, K, startMatch, wins } from "./board";
import { ADMIN, expect, shot, test } from "./fixtures";

const g = de.game;
const legsScore = (score: string) => `${g.legs} ${score}`;

test("best of 3 legs (M5): leg victory screen, the throw alternates, undo across the leg boundary", async ({ admin, register, stamp }) => {
  const [A, B] = [`A${stamp}`, `B${stamp}`];
  await register(A);
  await register(B);
  await startMatch(admin, "x01", [A, B], { startScore: 301, singleOut: true, legs: 3 });
  const b = board(admin);

  await b.tap(...K.T180, ...K.MISS, ...K.OUT121);
  await expect(admin.getByText(g.legWon.replace("{name}", A))).toBeVisible();
  await expect(admin.getByText(legsScore("1:0"))).toBeVisible();
  await shot(admin, "match-leg-victory");
  await admin.getByText(g.tapToContinue).click();
  expect(await b.active()).toBe(B);

  await b.tap(...K.MISS);
  await b.tap(g.undo, g.undo, g.undo);
  expect(await b.active()).toBe(B);
  await b.tap(g.undo); // back into leg 1
  expect((await b.scores())[0]).toBe("1");
  await b.tap("1");
  await expect(admin.getByText(g.legWon.replace("{name}", A))).toBeVisible();
  await admin.getByText(g.tapToContinue).click();
  await b.tap(...K.MISS, ...K.T180, ...K.MISS, ...K.OUT121);
  await expect(admin.getByText(wins(A))).toBeVisible();
  await expect(admin.getByText(legsScore("2:0")).first()).toBeVisible();
  await admin.reload();
  await expect(admin.getByText(wins(A))).toBeVisible();

  await admin.goto("/");
  await expect(admin.getByRole("list", { name: de.overview.recent }).getByText(`${A} ${legsScore("2:0")}`)).toHaveCount(1);
});

test("four players (M5): ToStart, places, play-out and resign, history", async ({ admin, register, stamp }) => {
  const [A, B, H] = [`A${stamp}`, `B${stamp}`, `H${stamp}`];
  await register(A);
  await register(B);
  await admin.goto("/new/x01");
  await addGuest(admin, H);
  await admin.getByRole("button", { name: deselect(H) }).click();
  await startMatch(admin, "x01", [ADMIN, A, B, H], { startScore: 301, singleOut: true });
  const b = board(admin);

  await admin.getByRole("button", { name: `${g.toStart}: ${H}` }).click();
  expect(await b.active()).toBe(H);
  await b.tap(...K.T180, ...K.MISS, ...K.MISS, ...K.MISS); // H 180, the others miss
  await b.tap(...K.OUT121); // H: place 1, the leg goes on
  await b.tap(...K.MISS, ...K.T180, ...K.T180); // admin miss, A and B 180
  await b.tap(...K.MISS, ...K.OUT121); // admin miss, A out: place 2
  await b.tap(...K.OUT121); // B out: place 3, the admin is last
  await expect(admin.getByText(wins(H))).toBeVisible();
  await expect(admin.getByText(`3. ${B}`)).toHaveCount(1);
  await expect(admin.getByText(`4. ${ADMIN}`)).toHaveCount(1);
  await shot(admin, "match-places");

  await admin.getByRole("button", { name: g.playOut.replace("{name}", ADMIN) }).click();
  await b.key("0").waitFor();
  await b.tap(...K.MISS);
  await admin.getByRole("button", { name: g.resign }).click();
  await admin.getByRole("dialog").getByRole("button", { name: g.resign }).click();
  await expect(admin.getByText(wins(H))).toBeVisible();
  await expect(admin.getByText(`4. ${ADMIN}`)).toHaveCount(1);

  await admin.goto("/");
  const history = admin.getByRole("list", { name: de.overview.recent });
  await expect(history.getByText(`1. ${H} · 2. ${A} · 3. ${B} · 4. ${ADMIN}`)).toHaveCount(1);
  await shot(admin, "overview-history", true);
});
