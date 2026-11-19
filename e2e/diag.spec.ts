import { de } from "@/i18n/de";
import { expect, test } from "./fixtures";

const t = de.diag;

/** M12 part B (m12-plan §B2): the diagnostics page works end to end; scripts/e2e-server.sh turns DIAG_ENABLED on. */
test("diag: headers, ten ticks a second apart, the Server Action answers", async ({ admin }) => {
  await admin.goto("/diag");
  const headers = admin.getByRole("list", { name: t.headers });
  await expect(headers).toContainText("host");
  await expect(headers).toContainText(t.ip);

  await admin.getByRole("button", { name: t.startTicks }).click();
  const done = admin.getByRole("status").filter({ hasText: t.ticksDone.split(":")[0] });
  await expect(done).toBeVisible({ timeout: 20_000 });
  const max = Number(/(\d+) ms$/.exec((await done.textContent()) ?? "")?.[1]);
  expect(max).toBeLessThan(1500); // nothing buffered on the way

  await admin.getByRole("button", { name: t.runAction }).click();
  await expect(admin.getByRole("status").filter({ hasText: /^ok \(/ })).toBeVisible();
});

test("diag: only for admins", async ({ register, stamp }) => {
  const page = await register(`D${stamp}`);
  await page.goto("/diag");
  await expect(page).toHaveURL(/\/account$/);
});
