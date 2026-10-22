/**
 * Frame rate of the 3D scene (spec 8.7: 60 fps during playback and the zoom), T5.2.c:
 *
 *   npm --prefix web run build && npm --prefix web run preview   (port 4173)
 *   node web/scripts/fps.mjs [url]
 *
 * Headless Chrome on the machine's GPU (ANGLE/D3D11 on Windows; the script prints the renderer string so a
 * software fallback is visible), 1920×1080. It opens a plan in live mode through the UI and records the frame
 * intervals (requestAnimationFrame) during the transit at 6 h/s, the final approach and zoom at 1 h/s, and at
 * the site at real scale, then counts WebGL contexts after 10 compare ↔ live round trips.
 */
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const URL_ = process.argv[2] ?? "http://localhost:4173/";
const exe = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome"].filter(Boolean).find((p) => existsSync(p));
if (!exe) throw new Error("No Chrome/Edge found: set CHROME_PATH");

const browser = await puppeteer.launch({
  executablePath: exe,
  headless: true,
  args: ["--window-size=1920,1080", "--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--use-angle=d3d11"],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  const ctxs = new Set();
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...a) {
    const c = orig.call(this, type, ...a);
    if (c && /webgl/.test(type)) ctxs.add(c);
    return c;
  };
  window.__ctxs = ctxs;
});
await page.goto(URL_, { waitUntil: "networkidle0" });
const out = await page.evaluate(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms = 20000) => {
    const s = performance.now();
    while (!f()) {
      if (performance.now() - s > ms) throw new Error("timeout");
      await wait(30);
    }
  };
  const btn = (txt) => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === txt || b.getAttribute("aria-label") === txt);
  const set = (el, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, String(v));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const frames = async (ms) => {
    const ts = [];
    const t0 = performance.now();
    while (performance.now() - t0 < ms) ts.push(await new Promise((r) => requestAnimationFrame(r)));
    const d = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b);
    return { fps: +(d.length / ((ts.at(-1) - ts[0]) / 1000)).toFixed(1), p50ms: +d[Math.floor(d.length / 2)].toFixed(1), p95ms: +d[Math.floor(d.length * 0.95)].toFixed(1), maxMs: +d.at(-1).toFixed(1), frames: d.length };
  };
  await until(() => document.querySelector('[data-testid="calendar-canvas"]')?.style.height);
  const idle = await frames(2000); // reference: the compare view, no WebGL
  const canvas = document.querySelector('[data-testid="calendar-canvas"]');
  const r = canvas.getBoundingClientRect();
  const labelW = Math.min(220, Math.max(130, r.width * 0.14));
  const cell = (s, day) => ({ clientX: r.left + labelW + ((day + 0.5) * (r.width - labelW)) / 365, clientY: r.top + 22 + s * 39 + 18, bubbles: true });
  canvas.dispatchEvent(new MouseEvent("dblclick", cell(1, 67)));
  await wait(300);
  canvas.dispatchEvent(new MouseEvent("dblclick", cell(3, 287)));
  await until(() => document.querySelectorAll('[data-testid="plan-panel"]').length === 2);
  document.querySelector('[data-testid="plan-panel"] .live-btn').click();
  await until(() => document.querySelector('[data-testid="scene-host"]')?.dataset.status === "ready");
  await wait(3000); // textures
  const steps = [{ step: "compare view (no WebGL, reference)", ...idle }];
  btn("Transit").click();
  await wait(300);
  btn("Play the mission").click();
  steps.push({ step: "transit, 6 h/s", ...(await frames(5000)) });
  btn("Pause the mission").click();
  const slider = document.querySelector('.mission-controls input[type="range"]');
  btn("At the site").click();
  await wait(200);
  set(slider, Number(slider.value) - 9 * 60);
  await wait(500);
  btn("1 h/s").click();
  btn("Play the mission").click();
  steps.push({ step: "final approach + zoom to the site, 1 h/s", ...(await frames(9000)) });
  steps.push({ step: "at the site, real scale + terrain", ...(await frames(3000)) });
  btn("Pause the mission").click();
  for (let i = 0; i < 10; i++) {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await until(() => document.querySelectorAll('[data-testid="plan-panel"]').length === 2);
    await wait(200);
    document.querySelector('[data-testid="plan-panel"] .live-btn').click();
    await until(() => document.querySelector('[data-testid="scene-host"]')?.dataset.status === "ready");
    await wait(200);
  }
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  await wait(500);
  const c = [...window.__ctxs][0];
  const ext = c?.getExtension("WEBGL_debug_renderer_info");
  return {
    gpu: ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "n/a",
    viewport: `${innerWidth}×${innerHeight}`,
    steps,
    webglContextsAfter10RoundTrips: window.__ctxs.size,
    webglCanvasesInDomInCompare: [...document.querySelectorAll("canvas")].filter((cv) => [...window.__ctxs].some((x) => x.canvas === cv)).length,
  };
});
await browser.close();
console.log(JSON.stringify(out, null, 2));
