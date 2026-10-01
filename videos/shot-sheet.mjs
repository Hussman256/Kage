import puppeteer from "puppeteer-core";
import { pathToFileURL } from "node:url";
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--allow-file-access-from-files"] });
const p = await b.newPage();
await p.setViewport({ width: 1600, height: 1200, deviceScaleFactor: 1 });
await p.goto(pathToFileURL(process.argv[2]).href, { waitUntil: "load" });
await new Promise(r => setTimeout(r, 1500));
await p.screenshot({ path: process.argv[3], fullPage: true });
await b.close(); console.log("ok");
