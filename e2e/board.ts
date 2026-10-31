import type { Page } from "@playwright/test";
import type { ModeId } from "@/domain/game";
import { de } from "@/i18n/de";

const t = de.newGame;
const g = de.game;
/** Accessible name of a choice menu trigger ("Startpunktzahl: 501"). */
const choice = (label: string, value: string | number) => `${label}: ${String(value)}`;
export const select = (name: string) => t.select.replace("{name}", name);
export const deselect = (name: string) => t.deselect.replace("{name}", name);
export const wins = (name: string) => g.youWin.replace("{name}", name);

/** Key sequences used across the tests (names as on the keypad). */
export const K = {
  T180: [g.triple, "20", g.triple, "20", g.triple, "20"],
  MISS: ["0", "0", "0"],
  /** 121 with single out. */
  OUT121: [g.triple, "20", g.triple, "20", "1"],
};

export type MatchOptions = {
  startScore?: 301;
  singleOut?: boolean;
  /** Best of legs (3, 5 …). */
  legs?: number;
  perPlayer?: boolean;
  /** Screenshot name of the filled-in setup (docs/screenshots). */
  beforeStart?: () => Promise<void>;
};

/** Fills in the setup of a mode and starts the match; players in throwing order. */
export async function startMatch(page: Page, mode: ModeId, players: string[], o: MatchOptions = {}) {
  await page.goto(`/new/${mode}`);
  for (const name of players) await page.getByRole("button", { name: select(name) }).click();
  await chooseRules(page, o);
  for (let n = 1; n < (o.legs ?? 1); n += 2) await page.getByRole("button", { name: `${t.bestOfLegs} ${t.more}` }).click();
  if (o.perPlayer) {
    await page.getByRole("button", { name: choice(t.inputMode, t.inputModes.single) }).click();
    await page.getByRole("button", { name: t.inputModes["per-player"] }).click();
  }
  await o.beforeStart?.();
  await page.getByRole("button", { name: t.start }).click();
  await page.waitForURL(/\/match\//);
}

/** 301 and single out in the X01 setup (also used by the tournament setup). */
export async function chooseRules(page: Page, o: Pick<MatchOptions, "startScore" | "singleOut">) {
  if (o.singleOut) {
    await page.getByRole("button", { name: choice(t.outRule, t.outNames.double) }).click();
    await page.getByRole("button", { name: t.outNames.single, exact: true }).click();
  }
  if (o.startScore) {
    await page.getByRole("button", { name: choice(t.startScore, 501) }).click();
    await page.getByRole("button", { name: String(o.startScore), exact: true }).click();
  }
}

/** Adds a guest in a setup; the new guest is selected right away. */
export async function addGuest(page: Page, name: string) {
  await page.getByRole("button", { name: t.addGuest }).click();
  await page.getByPlaceholder(t.guestNamePlaceholder).fill(name);
  await page.getByPlaceholder(t.guestNamePlaceholder).press("Enter");
  await page.getByRole("button", { name: deselect(name) }).waitFor();
}

/** The scoring screen of one device. */
export function board(page: Page) {
  const key = (name: string) => page.getByRole("button", { name, exact: true });
  /** The status line is "saved" again; Next keeps a previous page hidden in the DOM, so only the visible one counts. */
  const saved = async () => {
    if (await page.locator("[role=status]:visible").count())
      await page.locator("[role=status][data-sync=saved]:visible").waitFor({ state: "attached" });
  };
  return {
    key,
    saved,
    /** Taps keys one after another and waits until the visit is saved. */
    async tap(...keys: string[]) {
      for (const k of keys) {
        await key(k).click();
        await page.waitForTimeout(100);
      }
      await saved();
    },
    scores: () => page.locator("[data-score]").allInnerTexts(),
    /** Name of the player on turn (the panel with the active frame). */
    active: async () => (await page.locator(".border-frame-active").first().innerText()).split("\n")[0],
    status: () => page.locator("[role=status]:visible"),
  };
}
