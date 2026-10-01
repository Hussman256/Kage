// Captures real Kage app screens from the Expo web build (live Kuru data) at
// phone size for the promo video. Usage: node capture-screens.mjs [baseUrl] [dark|light]
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] ?? "http://localhost:8090";
const THEME = process.argv[3] === "light" ? "light" : "dark";
const OUT = new URL("./kage-promo/capture/assets/", import.meta.url);
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage();
// The first request to a freshly started web build compiles the bundle (often 60s+).
page.setDefaultNavigationTimeout(180000);
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: THEME }]);
// The app's own persisted setting (Async Storage → localStorage on web).
await page.evaluateOnNewDocument((theme) => {
  localStorage.setItem("kage.settings.v1", JSON.stringify({ appearance: theme }));
}, THEME);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => {
  // A dev warning/error toast (React Native LogBox) in a screenshot would ship in the promo.
  const toast = await page.evaluate(() => /Encountered|Warning:|Uncaught|Error:/.test(document.body.innerText));
  if (toast) console.warn(`WARNING: screen-${name} shows a dev warning/error toast — fix the app, then re-capture`);
  const path = new URL(`screen-${name}.png`, OUT);
  await page.screenshot({ path: path.pathname.replace(/^\/([A-Z]:)/, "$1") });
  console.log("saved", `screen-${name}.png`);
};
// Click the innermost element whose own text matches, walking up to something clickable.
const clickText = (text, nth = 0) =>
  page.evaluate(
    (text, nth) => {
      const hits = [...document.querySelectorAll("div,span")].filter((el) => el.textContent?.trim() === text && ![...el.children].some((c) => c.textContent?.trim() === text));
      const el = hits[nth];
      if (!el) return false;
      let node = el;
      while (node && !(node.getAttribute?.("role") === "button" || node.tabIndex >= 0 || node.onclick)) node = node.parentElement;
      (node ?? el).click();
      return true;
    },
    text,
    nth,
  );

// Splash: capture mid-beat before it hands off.
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await wait(2500);
await shot("splash");

await page.goto(`${BASE}/onboard`, { waitUntil: "domcontentloaded" });
await wait(2500);
await shot("onboard");

// Smart money: wait for the live leaderboard (~7s over RPC).
await page.goto(`${BASE}/smart`, { waitUntil: "domcontentloaded" });
for (let i = 0; i < 30; i++) {
  if (await page.evaluate(() => document.body.innerText.includes("fills / 1h"))) break;
  await wait(1000);
}
await wait(1500);
await shot("smart");

// Trader detail: open the #1 row.
if (await clickText("01")) {
  for (let i = 0; i < 20; i++) {
    if (await page.evaluate(() => document.body.innerText.includes("RECENT FILLS"))) break;
    await wait(1000);
  }
  await wait(1500);
  await shot("trader");
}

// Feed: live trades from all real traders.
await page.goto(`${BASE}/feed`, { waitUntil: "domcontentloaded" });
for (let i = 0; i < 30; i++) {
  if (await page.evaluate(() => /BOUGHT|SOLD/.test(document.body.innerText))) break;
  await wait(1000);
}
await wait(2000);
await shot("feed");

// Copy sheet with pre-flight checks: pick a trade big enough to clear Kuru's minimum.
const copyIdx = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("div")].filter((d) => /^(BOUGHT|SOLD)MON\/USDC/.test(d.innerText?.replace(/\s+/g, "") ?? ""));
  return cards.length;
});
let opened = false;
for (let n = 0; n < 8 && !opened; n++) {
  if (!(await clickText("Copy", n))) break;
  await wait(1500);
  const below = await page.evaluate(() => document.body.innerText.includes("BELOW KURU MINIMUM"));
  if (below) {
    await page.keyboard.press("Escape");
    await page.goto(`${BASE}/feed`, { waitUntil: "domcontentloaded" });
    await wait(4000);
    continue;
  }
  opened = true;
}
if (opened) {
  for (let i = 0; i < 25; i++) {
    if (await page.evaluate(() => /VALIDATED BY THE KURU CONTRACT|✗/.test(document.body.innerText))) break;
    await wait(1000);
  }
  await wait(1000);
  await shot("copy");
}
console.log("copy cards seen:", copyIdx, "copy sheet opened:", opened);

await browser.close();
