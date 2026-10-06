// Renders graphic.html to graphic.png (1600×900 @2x) for X.
import puppeteer from "puppeteer-core";
const src = new URL("./graphic.html", import.meta.url);
const out = new URL("./graphic.png", import.meta.url);
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--allow-file-access-from-files"] });
const p = await b.newPage();
await p.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
await p.goto(src.href, { waitUntil: "load" });
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: decodeURIComponent(out.pathname).replace(/^\//, "") });
await b.close();
console.log("saved graphic.png");
