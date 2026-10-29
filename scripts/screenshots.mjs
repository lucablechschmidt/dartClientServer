import { chromium } from "@playwright/test";
const out = process.argv[2];
const viewports = [[375,667],[667,375],[768,1024],[1024,768],[1280,800]];
const browser = await chromium.launch();
for (const scheme of ["light","dark"]) {
  for (const [w,h] of viewports) {
    const ctx = await browser.newContext({ viewport:{width:w,height:h}, colorScheme: scheme, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto("http://localhost:3100/dev/theme", { waitUntil: "networkidle" });
    const scroll = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    console.log(scheme, w+"x"+h, "scrollable:", scroll.sh>scroll.ch || scroll.sw>scroll.cw, JSON.stringify(scroll));
    await page.screenshot({ path: `${out}/${scheme}-${w}x${h}.png` });
    await ctx.close();
  }
}
await browser.close();
