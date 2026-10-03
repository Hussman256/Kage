// Renders Kage's app icon, Android adaptive-icon layers and splash images from
// the 影 mark font (same glyph + hard offset shadow as the in-app splash).
// Usage (from repo root): node videos/make-icons.mjs
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "mobile/assets/images");
const FONT = `data:font/ttf;base64,${fs.readFileSync(path.join(ROOT, "mobile/assets/fonts/KageMark-Black.ttf")).toString("base64")}`;

// Colours from mobile/src/theme/tokens.ts.
const DARK = { bg: "#0A0512", ink: "#FBFAF9", shadow: "#836EF9" };
const LIGHT = { bg: "#FBFAF9", ink: "#0E100F", shadow: "#5B41E0" };

// glyph: font size in px; offset: shadow offset as a share of it (splash: 13/132).
const mark = ({ glyph, ink, shadow }) => {
  const off = Math.round(glyph * 0.1);
  const g = `font-family:K;font-size:${glyph}px;line-height:1;position:absolute;left:0;top:0`;
  // Shift left/up by half the offset so glyph + shadow sit centred together.
  return `<div style="position:relative;width:${glyph}px;height:${glyph}px;transform:translate(${-off / 2}px,${-off / 2}px)">
    ${shadow ? `<div style="${g};color:${shadow};transform:translate(${off}px,${off}px)">影</div>` : ""}
    <div style="${g};color:${ink}">影</div></div>`;
};
const glow = `radial-gradient(circle at 50% 42%, rgba(131,110,249,.30), rgba(131,110,249,0) 60%),
  radial-gradient(circle at 12% 100%, rgba(160,5,93,.22), rgba(160,5,93,0) 45%)`;

const images = [
  { file: "icon.png", size: 1024, bg: `${glow}, ${DARK.bg}`, body: mark({ glyph: 560, ...DARK }) },
  { file: "android-icon-background.png", size: 1024, bg: `${glow}, ${DARK.bg}`, body: "" },
  // Adaptive icons are masked to the inner ~66%; keep the mark well inside it.
  { file: "android-icon-foreground.png", size: 1024, body: mark({ glyph: 400, ...DARK }) },
  { file: "android-icon-monochrome.png", size: 1024, body: mark({ glyph: 400, ink: "#FFFFFF" }) },
  { file: "splash-icon.png", size: 512, body: mark({ glyph: 400, ...LIGHT }) },
  { file: "splash-icon-dark.png", size: 512, body: mark({ glyph: 400, ...DARK }) },
  { file: "favicon.png", size: 196, bg: DARK.bg, body: mark({ glyph: 128, ...DARK }) },
];

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage();
for (const img of images) {
  await page.setViewport({ width: img.size, height: img.size, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><style>
    @font-face{font-family:K;src:url("${FONT}")}
    html,body{margin:0;width:${img.size}px;height:${img.size}px;background:${img.bg ?? "transparent"}}
    body{display:flex;align-items:center;justify-content:center}</style><body>${img.body}</body>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(OUT, img.file), omitBackground: !img.bg });
  console.log("wrote", img.file);
}
await browser.close();
