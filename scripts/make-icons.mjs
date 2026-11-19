#!/usr/bin/env node
/**
 * Draws the app icon (M12 PWA): a plain dartboard on a dark ground, no text, no photo. Writes the SVG
 * source and renders the PNG sizes with Playwright's Chromium, so the PNGs look exactly as a browser
 * draws the SVG. Run after changing the drawing: `node scripts/make-icons.mjs`; the outputs are committed.
 *
 * The board stays inside the safe zone of maskable icons (a circle of 40 % of the size), so one image
 * serves as "any" and "maskable" and survives the rounded masks of iOS and Android.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const SIZE = 512;
const C = SIZE / 2;
/** Board radii from the regulation board as in src/components/darts/dartboard.tsx (double ring outside = 100). */
const R = { bullIn: 3.7, bull: 9.4, trebleIn: 58, trebleOut: 63, doubleIn: 95, doubleOut: 100, rim: 108 };
/** Scale so the rim ends at 39 % of the size, inside the 40 % safe zone. */
const K = (SIZE * 0.39) / R.rim;
const COLORS = { ground: "#1c1c1e", rim: "#000000", dark: "#111111", light: "#f2e8cf", red: "#e5383b", green: "#2a9d5c" };

const at = (r, deg) => {
  const a = (deg * Math.PI) / 180;
  return `${(C + r * K * Math.sin(a)).toFixed(2)} ${(C - r * K * Math.cos(a)).toFixed(2)}`;
};
/** A ring sector between two radii over one field (18°, centred on the field). */
const sector = (i, rIn, rOut) => {
  const [from, to] = [i * 18 - 9, i * 18 + 9];
  return `M ${at(rIn, from)} L ${at(rOut, from)} A ${rOut * K} ${rOut * K} 0 0 1 ${at(rOut, to)} L ${at(rIn, to)} A ${rIn * K} ${rIn * K} 0 0 0 ${at(rIn, from)} Z`;
};
const circle = (r, fill) => `<circle cx="${C}" cy="${C}" r="${(r * K).toFixed(2)}" fill="${fill}"/>`;

const parts = [`<rect width="${SIZE}" height="${SIZE}" fill="${COLORS.ground}"/>`, circle(R.rim, COLORS.rim)];
for (let i = 0; i < 20; i++) {
  // The field at the top (20) is dark with a red ring, as on a real board.
  const even = i % 2 === 0;
  const field = even ? COLORS.dark : COLORS.light;
  const ring = even ? COLORS.red : COLORS.green;
  parts.push(`<path d="${sector(i, R.bull, R.doubleOut)}" fill="${field}"/>`);
  parts.push(`<path d="${sector(i, R.trebleIn, R.trebleOut)}" fill="${ring}"/>`);
  parts.push(`<path d="${sector(i, R.doubleIn, R.doubleOut)}" fill="${ring}"/>`);
}
parts.push(circle(R.bull, COLORS.green), circle(R.bullIn, COLORS.red));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">${parts.join("")}</svg>\n`;

/** Published path → edge length in px. */
const OUTPUTS = {
  "public/icons/icon-192.png": 192,
  "public/icons/icon-512.png": 512,
  "src/app/apple-icon.png": 180,
  "src/app/icon.png": 48,
};

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon.svg", svg);
const browser = await chromium.launch();
try {
  for (const [path, px] of Object.entries(OUTPUTS)) {
    const page = await browser.newPage({ viewport: { width: px, height: px } });
    await page.setContent(
      `<html><body style="margin:0">${svg.replace(/width="\d+" height="\d+"/, `width="${px}" height="${px}"`)}</body></html>`,
    );
    await page.screenshot({ path, omitBackground: false });
    await page.close();
    console.log(`wrote ${path} (${px} px)`);
  }
} finally {
  await browser.close();
}
