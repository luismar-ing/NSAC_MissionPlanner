/**
 * Screenshots of every view at 1920×1080 (T5.2.a), for the projector review: docs/figures/screens/*.png.
 *
 *   npm --prefix web run dev            (in another terminal)
 *   node web/scripts/screens.mjs [url]  (default http://localhost:5173/)
 *
 * Drives a headless Chrome (puppeteer-core with the installed browser; CHROME_PATH overrides the path) through
 * the demo flow of spec 12. It reads the app's store module from the Vite dev server to set the state, so it
 * needs the dev server, not the build.
 */
import { existsSync, mkdirSync } from "node:fs";
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

const PLANS = ["connecting_ridge_20270110_7d", "haworth_20270111_7d", "nobile_rim_1_20270113_7d"]; // the rehearsal's picks (T5.1.c)
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ["--window-size=1920,1080", "--use-angle=default", "--enable-unsafe-swiftshader", "--hide-scrollbars"],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("response", (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url()}`));
page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && errors.push(`${m.type()}: ${m.text()}`));
await page.goto(URL_, { waitUntil: "networkidle0" });
await page.waitForSelector('[data-testid="calendar-canvas"]');

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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name, scrollTo) => {
  if (scrollTo) await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "start" }), scrollTo);
  else await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(600);
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log(`saved ${name}.png`);
};

// compare mode: constraints set, three plans pinned, the first one selected, tray clock at 30 h
await app((s, plans) => {
  const st = s.getState();
  st.setConstraints({ minSunPct: 80, maxDarkH: 24 });
  for (const id of plans) st.pinPlan(id);
  st.selectPlan(plans[0]);
  st.setCompareTime(30);
}, PLANS);
await page.waitForFunction(() => document.querySelectorAll('[data-testid="plan-panel"]').length === 3);
await page.waitForSelector('[data-testid="panorama"]');
await shot("01-compare-search");
await shot("02-compare-tray", ".tray-area");
await shot("03-compare-site", ".site-area");

// live mode: the scene grows out of the selected panel
await page.click(`[data-plan-id="${PLANS[0]}"] .live-btn`);
await page.waitForFunction(() => document.querySelector('[data-testid="scene-host"]')?.dataset.status === "ready");
await sleep(2500); // textures
const timeline = await app(async (s) => {
  const st = s.getState();
  const plan = st.plansById.get(st.selectedPlanId);
  const t = await st.data.trajectory(plan.trajectory_id);
  const p = t.phases;
  return { launch: Date.parse(p.launch_utc), injection: Date.parse(p.injection_utc), lunar: Date.parse(p.lunar_arrival_utc), landing: Date.parse(p.landing_utc) };
});
const at = async (ms, phase) => {
  await app((s, t, ph) => {
    s.getState().setMissionTime(t);
    s.getState().setMissionPhase(ph);
  }, ms, phase);
  await sleep(1500);
};
await at(timeline.launch + 90_000, "launch");
await shot("04-live-launch");
await at((timeline.injection + timeline.lunar) / 2, "transit");
await shot("05-live-transit");
await at(timeline.landing - 2 * 3_600_000, "landing");
await sleep(2000); // terrain levels
await shot("06-live-landing");
await at(timeline.landing + 14 * 3_600_000, "site");
await sleep(2000);
await shot("07-live-site");
await shot("08-live-site-panels", ".live-site");

await browser.close();
console.log(errors.length ? `console errors/warnings:\n${errors.join("\n")}` : "console: no errors or warnings");
