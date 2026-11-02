/**
 * Screenshots of every screen (decision A7, TR.5.a) at 1920×1080 (projector) and 375×812 (phone):
 * docs/figures/screens/*.png. Each capture also reports the page width, to catch horizontal scrolling.
 *
 *   npm --prefix web run dev            (in another terminal)
 *   node web/scripts/screens.mjs [url]  (default http://localhost:5173/)
 *
 * Drives a headless Chrome (puppeteer-core with the installed browser; CHROME_PATH overrides the path) through
 * the landing page, the Mission Planner (globe, search panel, journey, site) and the Educator chapters. It reads
 * the app's store module from the Vite dev server to set the state, so it needs the dev server, not the build.
 */
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const URL_ = process.argv[2] ?? "http://localhost:5173/";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs", "figures", "screens");
const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);
const executablePath = CANDIDATES.find((p) => existsSync(p));
if (!executablePath) throw new Error("No Chrome/Edge found: set CHROME_PATH");
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith(".png")) rmSync(join(OUT, f)); // one set, always current

const PLANS = ["connecting_ridge_20270110_7d", "haworth_20270111_7d", "nobile_rim_1_20270113_7d"]; // the rehearsal's picks (T5.1.c)
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ["--window-size=1920,1080", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader", "--hide-scrollbars"],
});
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const overflow = [];

async function run(prefix, viewport) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  page.on("pageerror", (e) => errors.push(`${prefix}: ${e}`));
  page.on("response", (r) => r.status() >= 400 && errors.push(`${prefix}: HTTP ${r.status()} ${r.url()}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${prefix}: ${m.text()}`));
  await page.goto(URL_, { waitUntil: "networkidle0" });
  const app = (fn, ...args) =>
    page.evaluate(
      async (src, a) => {
        const url = performance.getEntriesByType("resource").map((e) => e.name).filter((n) => n.includes("/src/store/appStore.ts")).pop();
        const { appStore } = await import(url);
        return new Function("appStore", "args", `return (${src})(appStore, ...args)`)(appStore, a);
      },
      fn.toString(),
      args,
    );
  const click = (name) => page.evaluate((n) => [...document.querySelectorAll("button")].find((b) => b.textContent.trim().startsWith(n))?.click(), name);
  const shot = async (name, wait = 800) => {
    await sleep(wait);
    await page.screenshot({ path: join(OUT, `${prefix}-${name}.png`) });
    const w = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
    if (w.page > w.viewport) overflow.push(`${prefix}-${name}: ${w.page}px in ${w.viewport}px`);
    console.log(`saved ${prefix}-${name}.png · page ${w.page}px / ${w.viewport}px${w.page > w.viewport ? "  ← HORIZONTAL SCROLL" : ""}`);
  };
  const timeline = () =>
    app(async (s) => {
      const st = s.getState();
      const plan = st.plansById.get(st.selectedPlanId);
      const p = (await st.data.trajectory(plan.trajectory_id)).phases;
      return { launch: Date.parse(p.launch_utc), injection: Date.parse(p.injection_utc), lunar: Date.parse(p.lunar_arrival_utc), landing: Date.parse(p.landing_utc) };
    });
  const at = (ms, phase) =>
    app(
      (s, t, ph) => {
        s.getState().setMissionTime(t);
        s.getState().setMissionPhase(ph);
      },
      ms,
      phase,
    );

  await page.waitForFunction(() => document.querySelector(".landing-backdrop")?.dataset.moon === "live", { timeout: 20000 }).catch(() => {});
  await shot("01-landing", 1500);

  // Mission Planner: three plans pinned, the first one chosen, constraints set
  await page.click('.mode-card[data-mode="planner"]');
  await page.waitForSelector('[data-testid="mission-sidebar"]');
  await app((s, plans) => {
    const st = s.getState();
    st.setConstraints({ minSunPct: 80, maxDarkH: 24 });
    for (const id of plans) st.pinPlan(id);
    st.selectPlan(plans[0]);
    st.setCompareTime(30);
  }, PLANS);
  await page.waitForFunction(() => document.querySelector('[data-testid="scene-host"]')?.dataset.status === "ready", { timeout: 30000 });
  await shot("02-planner-globe", 3000);
  await click("Search and compare");
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="plan-panel"]').length === 3);
  await shot("03-planner-search", 1500);
  await app((s) => s.getState().setDrawerOpen(false));
  await click("Launch");
  await page.waitForSelector('[data-testid="mission-controls"]');
  await click("Pause the mission");
  const tl = await timeline();
  await at((tl.injection + tl.lunar) / 2, "transit");
  await shot("04-planner-transit", 2000);
  await at(tl.landing + 14 * 3_600_000, "site");
  await page.waitForSelector(".site-card");
  await shot("05-planner-site", 5000); // terrain levels, then the hop down to the observer's eye
  await click("Aerial view");
  await shot("06-planner-site-aerial", 2500);

  // Educator
  await app((s) => s.getState().setScreen("landing"));
  await page.waitForSelector('.mode-card[data-mode="educator"]');
  await page.click('.mode-card[data-mode="educator"]');
  await page.waitForSelector(".edu-bar");
  await app((s) => s.getState().setSurfaceView(true));
  await shot("07-educator-choose", 4000);
  await click("Begin the journey");
  await shot("08-educator-journey", 3000);
  await click("Skip ahead");
  await click("Next chapter");
  await click("Skip ahead");
  await click("Next chapter");
  await shot("09-educator-surface", 6000);
  await page.close();
}

await run("desk", { width: 1920, height: 1080, deviceScaleFactor: 1 });
await run("phone", { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await browser.close();
console.log(overflow.length ? `HORIZONTAL SCROLL:\n${overflow.join("\n")}` : "no horizontal scroll on any screen");
console.log(errors.length ? `console errors:\n${errors.join("\n")}` : "console: no errors");
