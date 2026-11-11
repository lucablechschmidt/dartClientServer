import { de } from "@/i18n/de";
import { addGuest, board, K, panelOf, playerRow, resultRow, startMatch, winner } from "./board";
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
  await expect(winner(admin, A)).toBeVisible();
  await expect(admin.getByText(legsScore("2:0")).first()).toBeVisible();
  // 1 vs 1: the comparison over both legs, legs big, no darts row (more than one leg)
  const result = admin.getByRole("table", { name: g.result });
  await expect(result.getByRole("row").filter({ has: admin.getByRole("rowheader", { name: new RegExp(g.legs, "i") }) })).toHaveText(
    /^2.*0$/i,
  );
  await expect(result.getByRole("rowheader", { name: g.perVisit })).toHaveCount(1);
  await expect(result.getByRole("rowheader", { name: g.highestVisit })).toHaveCount(1);
  await expect(result.getByRole("rowheader", { name: g.darts, exact: true })).toHaveCount(0);
  await shot(admin, "victory-legs");
  await admin.reload();
  await expect(winner(admin, A)).toBeVisible();

  // start screen: the latest game in one sentence; the history page: the score, the winner in bold
  await admin.goto("/");
  await expect(admin.getByRole("link", { name: new RegExp(`${A} gewinnt gegen ${B} 2:0`) })).toBeVisible();
  await admin.goto("/history");
  const row = admin.getByRole("list", { name: de.overview.thisWeek }).getByRole("link").filter({ hasText: B });
  await expect(row).toContainText(`${legsScore("2:0")} · Classic 301`);
  await expect(row.locator("strong")).toHaveText(A);
});

test("four players (M5): ToStart, places, play-out and resign, history", async ({ admin, register, stamp }) => {
  const [A, B, H] = [`A${stamp}`, `B${stamp}`, `H${stamp}`];
  await register(A);
  await register(B);
  await admin.goto("/new/x01");
  await addGuest(admin, H);
  await playerRow(admin, H, true).click();
  await startMatch(admin, "x01", [ADMIN, A, B, H], { startScore: 301, singleOut: true });
  const b = board(admin);
  const next = (name: string) => admin.getByText(g.nextPlayer.replace("{name}", name), { exact: true });
  const anyNext = admin.getByText(new RegExp(`^${g.nextPlayer.replace("{name}", "")}`));

  await panelOf(admin, H).click(); // ToStart: the panels are the buttons
  expect(await b.active()).toBe(H);
  await expect(next(ADMIN)).toBeVisible(); // 3+ players: the next one below the keypad
  await b.tap(...K.T180, ...K.MISS, ...K.MISS, ...K.MISS); // H 180, the others miss
  await b.tap(...K.OUT121); // H: place 1, the leg goes on
  await expect(next(A)).toBeVisible();
  await shot(admin, "match-next-player");
  await b.tap(...K.MISS, ...K.T180, ...K.T180); // admin miss, A and B 180
  await b.tap(...K.MISS, ...K.OUT121); // admin miss, A out: place 2
  await expect(next(ADMIN)).toBeVisible(); // B is up, H and A are out
  await b.tap(...K.OUT121); // B out: place 3, the admin is last
  await expect(winner(admin, H)).toBeVisible();
  await expect(resultRow(admin, A)).toHaveText(new RegExp(`^2${A}.*${g.checkedOut}$`));
  await expect(resultRow(admin, B)).toHaveText(new RegExp(`^3${B}.*${g.checkedOut}$`));
  await expect(resultRow(admin, ADMIN)).toHaveText(new RegExp(`^4${ADMIN}.*${g.restOf.replace("{n}", "\\d+")}$`));
  await shot(admin, "match-places");

  await admin.getByRole("button", { name: g.playOut }).click();
  await b.key("0").waitFor();
  await expect(anyNext).toHaveCount(0); // the last player plays out alone
  await b.tap(...K.MISS);
  await admin.getByRole("button", { name: g.resign }).click();
  await admin.getByRole("dialog").getByRole("button", { name: g.resign }).click();
  await expect(winner(admin, H)).toBeVisible();
  await expect(resultRow(admin, ADMIN)).toHaveText(new RegExp(`^4${ADMIN}`));

  await admin.goto("/history");
  const history = admin.getByRole("list", { name: de.overview.thisWeek });
  await expect(history.getByText(`1. ${H} · 2. ${A} · 3. ${B} · 4. ${ADMIN}`, { exact: false })).toHaveCount(1);
  await shot(admin, "overview-history", true);
});
