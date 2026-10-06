// Captures the screens for the 10-06 X graphic from the Expo web build (live
// Kuru + Envio data). Usage: node capture.mjs [baseUrl]
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] ?? "http://localhost:8090";
const OUT = new URL("./assets/", import.meta.url);
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage();
page.setDefaultNavigationTimeout(240000);
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
await page.evaluateOnNewDocument(() => localStorage.setItem("kage.settings.v1", JSON.stringify({ appearance: "light" })));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (re, secs) => {
  for (let i = 0; i < secs; i++) {
    if (await page.evaluate((s) => new RegExp(s).test(document.body.innerText), re.source)) return true;
    await wait(1000);
  }
  return false;
};
const shot = async (name) => {
  if (await page.evaluate(() => /Encountered|Warning:|Uncaught|Error:/.test(document.body.innerText)))
    console.warn(`WARNING: ${name} shows a dev warning/error toast`);
  await page.screenshot({ path: new URL(`screen-${name}.png`, OUT).pathname.replace(/^\/([A-Z]:)/, "$1") });
  console.log("saved", name);
};
const clickText = (text) =>
  page.evaluate((text) => {
    const el = [...document.querySelectorAll("div,span")].find((e) => e.textContent?.trim() === text && ![...e.children].some((c) => c.textContent?.trim() === text));
    if (!el) return false;
    let n = el;
    while (n && !(n.getAttribute?.("role") === "button" || n.tabIndex >= 0)) n = n.parentElement;
    (n ?? el).click();
    return true;
  }, text);

await page.goto(`${BASE}/smart`, { waitUntil: "domcontentloaded" });
await until(/fills \//, 90);
await clickText("24H");
await wait(1500);
await until(/fills \/ 24h/, 90);
await wait(2500);
await shot("smart-24h");

await page.goto(`${BASE}/feed`, { waitUntil: "domcontentloaded" });
await until(/BOUGHT|SOLD/, 60);
await clickText("ALL TRADERS");
await wait(3000);
await shot("feed");

await browser.close();
