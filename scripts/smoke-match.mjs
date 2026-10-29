// End-to-end run of the scoring screen against a running dev server (port 3100). Replaced by Playwright tests in M6.
import { chromium } from "@playwright/test";
const base = process.env.BASE_URL ?? "http://localhost:3100";
const shots = process.argv[2] ?? ".";
const browser = await chromium.launch();
const [user, pass] = (process.env.BASIC_AUTH ?? "").split(":");
const page = await browser.newPage({ viewport: { width: 375, height: 667 }, httpCredentials: user ? { username: user, password: pass } : undefined });
const log = (...a) => console.log("•", ...a);
// Any Content-Security-Policy violation in the browser fails the run (architecture.md §10).
const cspViolations = [];
const watchCsp = (p) => p.on("console", (m) => /Content Security Policy|Refused to/i.test(m.text()) && cspViolations.push(m.text()));
watchCsp(page);
browser.on("disconnected", () => {});
const fail = (m) => { console.error("✗", m); process.exitCode = 1; };
const expect = (cond, m) => (cond ? log("ok:", m) : fail(m));

const stamp = Date.now().toString(36);

// Security headers on every response, 404 page with a way home
{
  const res = await page.request.get(`${base}/login`);
  const h = res.headers();
  expect(h["content-security-policy"]?.includes("frame-ancestors 'none'"), "CSP header present");
  expect(h["x-frame-options"] === "DENY" && h["x-content-type-options"] === "nosniff", "frame and nosniff headers present");
  expect(!("x-powered-by" in h), "no x-powered-by header");
}
const ADMIN = process.env.ADMIN_USER ?? "admin";
const ADMIN_PW = process.env.ADMIN_PASSWORD ?? "admin-secret";

const loginAs = async (p, name, password) => {
  await p.goto(`${base}/login`, { waitUntil: "networkidle" });
  await p.getByLabel("Name").fill(name);
  await p.getByLabel("Passwort").fill(password);
  await p.getByRole("button", { name: "Anmelden" }).click();
  await p.waitForURL((u) => !u.toString().includes("/login"));
};

// M3: without a session everything lands on /login
await page.goto(`${base}/players`, { waitUntil: "networkidle" });
expect(page.url().includes("/login"), "redirected to /login without a session");
await page.getByLabel("Name").fill(ADMIN);
await page.getByLabel("Passwort").fill(ADMIN_PW);
await page.getByRole("button", { name: "Anmelden" }).click();
await page.waitForURL((u) => !u.toString().includes("/login"));
expect(new URL(page.url()).pathname === "/players", `after login back on /players (got ${page.url()})`);

// Create an invite (admin) and redeem it in a second browser context (case A); case C: the admin name is rejected
const inviteUrl = async () => {
  await page.goto(`${base}/account`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Einladungslink erzeugen" }).click();
  const link = page.locator("a[href*='/einladung/']").first();
  await link.waitFor();
  return (await link.getAttribute("href")).replace(/^https?:\/\/[^/]+/, base);
};
const contexts = {};
const redeem = async (name, password, { expectError } = {}) => {
  const url = await inviteUrl();
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const p = await ctx.newPage();
  watchCsp(p);
  await p.goto(url, { waitUntil: "networkidle" });
  await p.getByLabel("Dein Name").fill(name);
  await p.getByLabel("Passwort (mind. 8 Zeichen)").fill(password);
  await p.getByLabel("Passwort wiederholen").fill(password);
  await p.getByRole("button", { name: "Mitspielen" }).click();
  if (expectError) {
    await p.getByRole("alert").filter({ hasText: expectError }).waitFor({ timeout: 5000 });
    await ctx.close();
    return null;
  }
  await p.waitForURL((u) => new URL(u).pathname === "/");
  contexts[name] = { ctx, page: p };
  return p;
};
await redeem(ADMIN, "irgendwas1", { expectError: "hat schon jemand" });
log("invite: admin name rejected (case C)");
await redeem(`A${stamp}`, "passwortA1");
await redeem(`B${stamp}`, "passwortB1");
log("invite: A and B registered in their own contexts");
await page.screenshot({ path: `${shots}/account-admin.png` });

await page.goto(`${base}/players`, { waitUntil: "networkidle" });
expect((await page.getByRole("button", { name: `Bearbeiten: A${stamp}` }).count()) === 1, "admin may rename A");
await contexts[`A${stamp}`].page.goto(`${base}/players`, { waitUntil: "networkidle" });
expect((await contexts[`A${stamp}`].page.getByRole("button", { name: `Bearbeiten: B${stamp}` }).count()) === 0, "A may not rename B");
expect((await contexts[`A${stamp}`].page.getByRole("button", { name: `Bearbeiten: A${stamp}` }).count()) === 1, "A may rename A");

await page.goto(`${base}/`, { waitUntil: "networkidle" });
await page.getByRole("link", { name: "Classic Game" }).click();
await page.waitForURL(/\/new\/x01/);
await page.getByRole("button", { name: `A${stamp} auswählen` }).click();
await page.getByRole("button", { name: `B${stamp} auswählen` }).click();
await page.getByRole("button", { name: "501", exact: true }).click();
await page.getByRole("button", { name: "301", exact: true }).click();
await page.getByRole("button", { name: "Start Game" }).click();
await page.waitForURL(/\/match\//);
const url = page.url();

const key = (name) => page.getByRole("button", { name, exact: true });
const rests = async () => page.locator("[data-rest]").allInnerTexts();
const throwKeys = async (...names) => {
  for (const n of names) {
    await key(n).click();
    await page.waitForTimeout(150);
  }
  // Darts are scored locally; wait until the visit is saved before reloading/checking
  await page.locator("[role=status][data-sync=saved]").waitFor({ state: "attached", timeout: 5000 });
};

// A: T20 T20 T20 → 121
await throwKeys("Triple", "20", "Triple", "20", "Triple", "20");
expect((await rests())[0] === "121", `A has 121 after 180 (got ${await rests()})`);
await page.screenshot({ path: `${shots}/match-after-180.png` });

// B: 0 0 0
await throwKeys("0", "0", "0");
// A: Rest 121, T20 (61), T20 (1 → bust under Double Out)
await throwKeys("Triple", "20", "Triple", "20");
const afterBust = await rests();
expect(afterBust[0] === "121", `A back to 121 after bust (got ${afterBust})`);
const bustSlots = await page.locator("ol[aria-label=Aufnahme]").first().allInnerTexts();
log("A slots after bust:", bustSlots[0]);
await page.screenshot({ path: `${shots}/match-after-bust.png` });

// Undo: bust removed, A on turn again with 61 left and one dart
await throwKeys("Undo");
expect((await rests())[0] === "61", `undo bust → 61 (got ${await rests()})`);
await throwKeys("Undo");
expect((await rests())[0] === "121", `undo first dart → 121 (got ${await rests()})`);
await throwKeys("Undo"); // B's third 0
await throwKeys("Undo"); // B's second 0
log("after undo across switch: rests", await rests());

// Reload: same state
await page.reload({ waitUntil: "networkidle" });
expect((await rests())[0] === "121", `after reload A still 121 (got ${await rests()})`);

// B: 0 0 (B's visit had one dart left after the undos)
await throwKeys("0", "0");
// A: 121 = T20 T11 D14
await throwKeys("Triple", "20");
log("hint:", await page.locator("[aria-live=polite]").innerText());
await throwKeys("Triple", "11", "Double", "14");
await page.getByText(`A${stamp} gewinnt!`).waitFor({ timeout: 5000 });
log("victory shown");
await page.screenshot({ path: `${shots}/match-victory.png` });

// Undo winning dart → back to the board with 28
await page.getByRole("button", { name: "Letzten Wurf rückgängig machen" }).click();
await key("Undo").waitFor();
expect((await rests())[0] === "28", `undo win → 28 (got ${await rests()})`);
await throwKeys("Double", "14");
await page.getByText(`A${stamp} gewinnt!`).waitFor();

// Restart: new match, B throws first
await page.getByRole("button", { name: "Nochmal (gleiche Spieler)" }).click();
await page.waitForURL((u) => u.toString() !== url && /\/match\//.test(u.toString()));
const activeName = await page.locator(".border-frame-active").first().innerText();
expect(activeName.startsWith(`B${stamp}`), `restart: B starts (active panel: ${activeName.split("\n")[0]})`);


// --- Guests (E12): created in the setup, selected right away, survive a reload, listed under "Gäste heute"
{
  const guest = `G${stamp}`;
  await page.goto(`${base}/new/x01`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Gast hinzufügen" }).click();
  await page.getByPlaceholder("Name des Gastes").fill(guest);
  await page.getByPlaceholder("Name des Gastes").press("Enter");
  const guestRow = page.getByRole("button", { name: `${guest} abwählen` });
  await guestRow.waitFor({ timeout: 5000 });
  expect((await guestRow.innerText()).includes("Gast"), "guest row carries the Gast badge and is selected");
  await page.getByRole("button", { name: `A${stamp} auswählen` }).click();
  await page.getByRole("button", { name: "Start Game" }).click();
  await page.waitForURL(/\/match\//);
  // Guest throws first (position 1): T20 S20 T5
  await throwKeys("Triple", "20", "20", "Triple", "5");
  // A: T20 S20 T5 → field hits 4×20, 3×5 after cleanup
  await throwKeys("Triple", "20", "20", "Triple", "5");
  await page.screenshot({ path: `${shots}/match-guest.png` });
  await page.goto(`${base}/new/x01`, { waitUntil: "networkidle" });
  expect((await page.getByRole("button", { name: `${guest} auswählen` }).count()) === 1, "guest still listed after reload");
  await page.goto(`${base}/players`, { waitUntil: "networkidle" });
  const guestCard = page.getByRole("list", { name: "Gäste heute" });
  expect((await guestCard.getByText(guest, { exact: true }).count()) === 1, "guest listed under Gäste heute");
  expect((await page.getByRole("list", { name: "Spieler" }).getByText(guest, { exact: true }).count()) === 0, "guest not in the regular list");
  await page.getByRole("button", { name: `Bearbeiten: ${guest}` }).click();
  await page.getByRole("button", { name: "Entfernen" }).click();
  await page.getByRole("alert").filter({ hasText: "Spielt schon mit" }).waitFor({ timeout: 5000 });
  log("guest in match cannot be removed (alert shown)");
  // Renaming to a taken name → error; to a free one → works
  await page.getByLabel("Name").fill(`A${stamp}`);
  await page.getByRole("button", { name: "Speichern" }).click();
  await page.getByRole("alert").filter({ hasText: "gibt es schon" }).waitFor({ timeout: 5000 });
  log("rename to a taken name is rejected");
  await page.getByLabel("Name").fill(`${guest}x`);
  await page.getByRole("button", { name: "Speichern" }).click();
  await page.getByText(`${guest}x`, { exact: true }).waitFor({ timeout: 5000 });
  log("guest renamed");
  await page.screenshot({ path: `${shots}/players-guests.png` });
}
// Game overview and cancel (M4): the running guest match is in the overview; cancel with confirmation
{
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  const overview = page.getByRole("list", { name: "Laufende Spiele" });
  expect((await overview.getByRole("link").count()) >= 1, "overview lists the running match");
  await page.screenshot({ path: `${shots}/overview.png` });
  await overview.getByRole("link").first().click();
  await page.waitForURL(/\/match\//);
  const cancelledUrl = page.url();
  await page.getByRole("button", { name: "Spiel abbrechen" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Zurück" }).click();
  expect((await page.getByRole("dialog").count()) === 0, "dialog closes on Zurück");
  await page.getByRole("button", { name: "Spiel abbrechen" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Abbrechen" }).click();
  await page.waitForURL((u) => new URL(u).pathname === "/");
  await page.waitForLoadState("networkidle");
  expect((await page.getByRole("list", { name: "Laufende Spiele" }).count()) === 0 || !(await page.getByRole("list", { name: "Laufende Spiele" }).innerText()).includes(`G${stamp}x`), "cancelled match left the overview");
  await page.goto(cancelledUrl, { waitUntil: "networkidle" });
  expect((await page.getByText("Spiel beendet").count()) === 1, "cancelled match shows Spiel beendet");
  expect(await page.getByRole("button", { name: "20", exact: true }).isDisabled(), "keypad disabled on a closed match");
  log("overview and cancel ok");
}

// Two devices (M4, E13): admin starts "jeder selbst" against A; A sees the match live and may only throw when it is A's turn
{
  const pageA = contexts[`A${stamp}`].page;
  await page.goto(`${base}/new/x01`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: `${ADMIN} auswählen` }).click();
  await page.getByRole("button", { name: `A${stamp} auswählen` }).click();
  await page.getByRole("button", { name: "Eingabe: ein Handy" }).click();
  await page.getByRole("button", { name: "jeder selbst" }).click();
  await page.getByRole("button", { name: "Start Game" }).click();
  await page.waitForURL(/\/match\//);
  const matchUrl = page.url();
  // A finds the match via the overview
  await pageA.goto(`${base}/`, { waitUntil: "networkidle" });
  await pageA.getByRole("list", { name: "Laufende Spiele" }).getByRole("link", { name: new RegExp(`${ADMIN} · A${stamp}`) }).click();
  await pageA.waitForURL(matchUrl);
  expect(await pageA.getByRole("button", { name: "20", exact: true }).isDisabled(), "A's keypad is locked while admin is on turn");
  expect((await pageA.getByText(`${ADMIN} ist dran`).count()) === 1, "A sees who is on turn");
  // Admin throws 180 → A sees the new remaining score without a reload and may now throw
  await throwKeys("Triple", "20", "Triple", "20", "Triple", "20");
  await pageA.locator("[data-rest]").first().filter({ hasText: "321" }).waitFor({ timeout: 10000 });
  log("device A received the visit live (SSE)");
  await pageA.getByRole("button", { name: "20", exact: true }).isEnabled();
  expect(await page.getByRole("button", { name: "20", exact: true }).isDisabled(), "admin's keypad locks while A is on turn");
  // Undoing the admin's last visit works only on the admin's device
  expect(await pageA.getByRole("button", { name: "Undo", exact: true }).isDisabled(), "A may not undo admin's visit");
  for (const k of ["20", "20", "20"]) {
    await pageA.getByRole("button", { name: k, exact: true }).click();
    await pageA.waitForTimeout(150);
  }
  await pageA.locator("[role=status][data-sync=saved]").waitFor({ state: "attached", timeout: 5000 });
  await page.locator("[data-rest]").nth(1).filter({ hasText: "441" }).waitFor({ timeout: 10000 });
  log("admin received A's visit live");
  // Cancel by the host reaches A live
  await page.getByRole("button", { name: "Spiel abbrechen" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Abbrechen" }).click();
  await page.waitForURL((u) => new URL(u).pathname === "/");
  await pageA.getByText("Spiel beendet").waitFor({ timeout: 10000 });
  log("cancel reached device A live");
}

// Reset for A: A's old session ends, the new password applies
{
  await page.goto(`${base}/account`, { waitUntil: "networkidle" });
  const rowA = page.getByRole("listitem").filter({ hasText: `A${stamp}` });
  await rowA.getByRole("button", { name: "Passwort zurücksetzen" }).click();
  const link = rowA.locator("a[href*='/einladung/']");
  await link.waitFor();
  const resetUrl = (await link.getAttribute("href")).replace(/^https?:\/\/[^/]+/, base);
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const p = await ctx.newPage();
  await p.goto(resetUrl, { waitUntil: "networkidle" });
  expect((await p.getByText(`Login für A${stamp}`).count()) === 1, "reset page shows the fixed player");
  await p.getByLabel("Passwort (mind. 8 Zeichen)").fill("neuesPasswortA");
  await p.getByLabel("Passwort wiederholen").fill("neuesPasswortA");
  await p.getByRole("button", { name: "Passwort setzen" }).click();
  await p.waitForURL((u) => new URL(u).pathname === "/");
  await ctx.close();
  await contexts[`A${stamp}`].page.goto(`${base}/players`, { waitUntil: "networkidle" });
  expect(contexts[`A${stamp}`].page.url().includes("/login"), "A's old session ended by the reset");
  await loginAs(contexts[`A${stamp}`].page, `A${stamp}`, "neuesPasswortA");
  log("reset: A logs in with the new password");
}

// Delete B's login (second tap confirms): B is logged out but stays as a player
{
  await page.goto(`${base}/account`, { waitUntil: "networkidle" });
  const rowB = page.getByRole("listitem").filter({ hasText: `B${stamp}` });
  await rowB.getByRole("button", { name: "Login löschen" }).click();
  await rowB.getByRole("button", { name: "Wirklich? Nochmal tippen." }).click();
  await rowB.getByText("ohne Login").waitFor({ timeout: 5000 });
  await contexts[`B${stamp}`].page.goto(`${base}/players`, { waitUntil: "networkidle" });
  expect(contexts[`B${stamp}`].page.url().includes("/login"), "B's session ended with the login");
  await page.goto(`${base}/new/x01`, { waitUntil: "networkidle" });
  expect((await page.getByRole("button", { name: `B${stamp} auswählen` }).count()) === 1, "B still selectable as a player");
  log("login removed, player kept");
}

// 404: unknown match shows the not-found page with a link home
await page.goto(`${base}/match/does-not-exist`, { waitUntil: "networkidle" });
expect((await page.getByText("Seite nicht gefunden.").count()) === 1, "not-found page for an unknown match");

// Logout
await page.goto(`${base}/account`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Abmelden" }).click();
await page.waitForURL(/\/login/);
await page.goto(`${base}/`, { waitUntil: "networkidle" });
expect(page.url().includes("/login"), "after logout everything redirects to /login");
// Rate limit: after 10 failed attempts the login waits (last, because it locks this IP for 15 minutes)
for (let i = 0; i < 10; i++) {
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Name").fill(ADMIN);
  await page.getByLabel("Passwort").fill("falsch");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.getByRole("alert").filter({ hasText: "falsch" }).waitFor();
}
await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.getByLabel("Name").fill(ADMIN);
await page.getByLabel("Passwort").fill(ADMIN_PW);
await page.getByRole("button", { name: "Anmelden" }).click();
await page.getByRole("alert").filter({ hasText: "Zu viele Versuche" }).waitFor({ timeout: 5000 });
log("rate limit blocks the 11th attempt even with the right password");
expect(cspViolations.length === 0, `no CSP violations (${cspViolations.slice(0, 2).join(" / ")})`);
for (const c of Object.values(contexts)) await c.ctx.close();
await browser.close();
