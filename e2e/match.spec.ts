import { de } from "@/i18n/de";
import { board, startMatch, wins } from "./board";
import { expect, shot, test } from "./fixtures";

const g = de.game;

test("x01: 180, bust, undo across the player switch, reload, checkout, undo of the win, restart", async ({ admin, register, stamp }) => {
  const [A, B] = [`A${stamp}`, `B${stamp}`];
  await register(A);
  await register(B);
  await startMatch(admin, "x01", [A, B], { startScore: 301, beforeStart: () => shot(admin, "setup-x01") });
  const url = admin.url();
  const b = board(admin);

  await b.tap(g.triple, "20", g.triple, "20", g.triple, "20");
  expect((await b.scores())[0]).toBe("121");
  await shot(admin, "match-after-180");

  await b.tap("0", "0", "0"); // B
  await b.tap(g.triple, "20", g.triple, "20"); // A: 61, then 1 left under double out → bust
  expect((await b.scores())[0]).toBe("121");
  await shot(admin, "match-after-bust");

  await b.tap(g.undo); // the bust is gone, A has 61 and one dart thrown
  expect((await b.scores())[0]).toBe("61");
  await b.tap(g.undo);
  expect((await b.scores())[0]).toBe("121");
  await b.tap(g.undo, g.undo); // across the switch: B's third and second dart

  await admin.reload();
  await expect.poll(async () => (await b.scores())[0]).toBe("121");

  await b.tap("0", "0"); // B finishes the visit
  await b.tap(g.triple, "20", g.triple, "11", g.double, "14"); // 121 out
  await expect(admin.getByText(wins(A))).toBeVisible();
  await shot(admin, "match-victory");

  await admin.getByRole("button", { name: g.undoWinningDart }).click();
  await b.key(g.undo).waitFor();
  expect((await b.scores())[0]).toBe("28");
  await b.tap(g.double, "14");
  await expect(admin.getByText(wins(A))).toBeVisible();

  await admin.getByRole("button", { name: g.restart }).click();
  await admin.waitForURL((u) => u.toString() !== url && u.pathname.startsWith("/match/"));
  expect(await b.active()).toBe(B);
});
