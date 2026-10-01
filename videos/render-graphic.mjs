// Renders kage-promo/graphic/kage-graphic.html to a 1600x900 (@2x) PNG for X.
import puppeteer from "puppeteer-core";
import { pathToFileURL } from "node:url";
const src = new URL("./kage-promo/graphic/kage-graphic.html", import.meta.url);
const out = new URL("./kage-promo/graphic/kage-graphic.png", import.meta.url);
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--allow-file-access-from-files"] });
const p = await b.newPage();
await p.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
await p.goto(src.href, { waitUntil: "load" });
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: decodeURIComponent(out.pathname).replace(/^\//, "") });
await b.close();
console.log("saved", out.pathname);
