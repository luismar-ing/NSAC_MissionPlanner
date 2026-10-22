/**
 * Performance audit of spec 8.7 (T5.2.c) on the production build:
 *
 *   npm --prefix web run build && npm --prefix web run preview   (port 4173, in another terminal)
 *   node web/scripts/perf.mjs [url]                               (default http://localhost:4173/)
 *
 * Headless Chrome (puppeteer-core with the installed browser, CHROME_PATH overrides), cold cache every run.
 * Measures the initial load of the 2D shell (until the first calendar draw, the app's "shell-ready" mark) on an
 * unthrottled and on a "normal connection" profile, the bytes it downloads, and the update times the app itself
 * records (constraint change → calendar redraw, tray scrubber → all panels). Frame rate and the WebGL context
 * count need a real GPU and a visible window: they are measured in the browser (docs/performance.md).
 */
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const URL_ = process.argv[2] ?? "http://localhost:4173/";
const exe = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome"].filter(Boolean).find((p) => existsSync(p));
if (!exe) throw new Error("No Chrome/Edge found: set CHROME_PATH");

// "normal connection": 20 Mbit/s down, 5 Mbit/s up, 40 ms round trip (a typical home or venue network)
const PROFILES = {
  unthrottled: null,
  normal: { offline: false, download: (20e6 / 8) * 0.9, upload: (5e6 / 8) * 0.9, latency: 40 },
  // worst case: a host that does not compress JSON (asks the server for identity encoding)
  normalUncompressed: { offline: false, download: (20e6 / 8) * 0.9, upload: (5e6 / 8) * 0.9, latency: 40, identity: true },
};
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--window-size=1920,1080"], defaultViewport: { width: 1920, height: 1080 } });

async function load(profile) {
  const ctx = await browser.createBrowserContext(); // cold cache, no service worker, nothing shared
  const page = await ctx.newPage();
  const cdp = await page.createCDPSession();
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  if (profile) await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: profile.latency, downloadThroughput: profile.download, uploadThroughput: profile.upload });
  if (profile?.identity) await cdp.send("Network.setExtraHTTPHeaders", { headers: { "Accept-Encoding": "identity" } });
  let bytes = 0;
  cdp.on("Network.loadingFinished", (e) => (bytes += e.encodedDataLength));
  const t0 = Date.now();
  await page.goto(URL_, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => performance.getEntriesByName("shell-ready").length > 0, { timeout: 60_000 });
  const shellMs = await page.evaluate(() => performance.getEntriesByName("shell-ready")[0].startTime);
  const wall = Date.now() - t0;
  return { page, ctx, shellMs, wall, bytes };
}

const result = {};
for (const [name, profile] of Object.entries(PROFILES)) {
  const runs = [];
  for (let i = 0; i < 3; i++) {
    const r = await load(profile);
    runs.push(r);
    if (i < 2 || name !== "unthrottled") await r.ctx.close();
  }
  result[name] = { shellReadyMs: runs.map((r) => Math.round(r.shellMs)), medianMs: Math.round(median(runs.map((r) => r.shellMs))), downloadedKB: Math.round(median(runs.map((r) => r.bytes)) / 1024) };
  if (name === "unthrottled") result._page = runs[2];
}

// update times, on the last unthrottled page: constraint → calendar redraw; tray scrubber with 5 panels
const { page, ctx } = result._page;
delete result._page;
const updates = await page.evaluate(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const set = (el, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, String(v));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const out = { constraintToDrawMs: [], constraintToFrameMs: [], scrubberAllPanelsMs: [] };
  const box = [...document.querySelectorAll('input[type="checkbox"]')].find((c) => /Minimum sunlight/.test(c.closest("label").textContent));
  box.click();
  await wait(300);
  const slider = document.querySelector('input[aria-label="Minimum sunlight"]');
  const canvas = document.querySelector('[data-testid="calendar-canvas"]');
  for (const v of [40, 55, 70, 85, 60, 75, 90, 50, 65, 80]) {
    set(slider, v);
    await wait(250);
    out.constraintToDrawMs.push(Number(canvas.dataset.lastUpdateMs));
    out.constraintToFrameMs.push(Number(canvas.dataset.lastFrameMs));
  }
  // pin 5 plans with double-clicks on the calendar (valid cells of the five sites)
  const r = canvas.getBoundingClientRect();
  const rowH = 36, gap = 3, axisH = 22, labelW = Math.min(220, Math.max(130, r.width * 0.14));
  for (let s = 0; s < 5; s++) {
    const day = 40 + s * 50;
    const x = r.left + labelW + ((day + 0.5) * (r.width - labelW)) / 365;
    const y = r.top + axisH + s * (rowH + gap) + rowH / 2;
    canvas.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, clientX: x, clientY: y }));
    await wait(150);
  }
  for (let i = 0; i < 50 && document.querySelectorAll('[data-testid="plan-panel"]').length < 5; i++) await wait(100);
  out.panels = document.querySelectorAll('[data-testid="plan-panel"]').length;
  const scrub = document.querySelector('input[aria-label="Time since arrival (all panels)"]');
  const host = document.querySelector('[data-testid="scrubber"]');
  for (let h = 6; h <= 66; h += 6) {
    set(scrub, h);
    await wait(250);
    out.scrubberAllPanelsMs.push(Number(host.dataset.lastUpdateMs));
  }
  return out;
});
await ctx.close();
await browser.close();

const stats = (xs) => ({ median: median(xs), max: Math.max(...xs) });
console.log(JSON.stringify({ load: result, updates: { panels: updates.panels, constraintToDrawMs: stats(updates.constraintToDrawMs), constraintToNextFrameMs: stats(updates.constraintToFrameMs), scrubberAllPanelsMs: stats(updates.scrubberAllPanelsMs) } }, null, 2));
