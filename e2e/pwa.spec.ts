import { de } from "@/i18n/de";
import { expect, test } from "./fixtures";

/** M12 PWA: the browser and the home screen fetch manifest and icons without the session cookie. */
test("manifest and icons load without a login, the login page links them", async ({ page, request }) => {
  const manifest = await request.get("/manifest.webmanifest", { maxRedirects: 0 });
  expect(manifest.status()).toBe(200);
  const body = (await manifest.json()) as { name: string; display: string; icons: { src: string }[] };
  expect(body).toMatchObject({ name: de.app.installName, display: "standalone" });
  for (const { src } of body.icons) {
    const icon = await request.get(src, { maxRedirects: 0 });
    expect(icon.status(), src).toBe(200);
    expect(icon.headers()["content-type"]).toBe("image/png");
  }

  await page.goto("/login");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /manifest\.webmanifest/);
  const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
  expect(apple).toBeTruthy();
  expect((await request.get(apple ?? "", { maxRedirects: 0 })).status()).toBe(200);
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", de.app.installName);
});
