// @vitest-environment jsdom
/**
 * T5.1.a: linked views (spec 4.1: "choosing a plan, a site or a time in one view updates the others", spec 8).
 * One test per cell of the view × state matrix (the matrix itself is in PROGRESS.md): the change is made
 * through the UI of the source view, and every other view is checked in the DOM.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { cellRect, makeLayout } from "../src/lib/calendar";
import { timelineOf } from "../src/lib/mission";
import { loadPlanData } from "../src/lib/planData";
import { longestZeroRun } from "../src/lib/ribbon";
import { fmtMetric, METRICS, num, round, type MetricKey } from "../src/lib/why";
import { appStore, DEFAULT_CONSTRAINTS } from "../src/store/appStore";

// the WebGL scene has its own tests; here it is a stub that still registers the plan-switch bridge
vi.mock("../src/scene3d/SceneHost", async () => {
  const { useEffect } = await import("react");
  const { sceneBridge } = await import("../src/scene3d/bridge");
  return {
    SceneHost: () => {
      useEffect(() => {
        sceneBridge.setPlan = () => {};
        return () => {
          sceneBridge.setPlan = null;
        };
      }, []);
      return <div data-testid="scene-host" />;
    },
  };
});

const DATA = join(__dirname, "..", "public", "data");
const fileFetch = (async (url: string) => {
  try {
    return new Response(readFileSync(join(DATA, url.replace(/^.*\/data\//, "").replace(/^\/base\//, ""))), { status: 200 });
  } catch {
    return new Response("", { status: 404 });
  }
}) as typeof fetch;

const W = 1200; // every element measures 1200 px wide (calendar layout, silhouettes, panorama)
const A = "haworth_20270309_7d";
const B = "malapert_massif_20271015_7d";
const C = "connecting_ridge_20270102_7d";
const HOUR = 3_600_000;

beforeAll(async () => {
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => W });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 200 });
  HTMLElement.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, right: W, bottom: 200, width: W, height: 200, toJSON() {} }) as DOMRect;
  window.scrollTo = () => {};
  globalThis.fetch = fileFetch;
  await appStore.getState().loadCore();
  await appStore.getState().loadWindows(7);
});

// a clean global state for every cell
beforeEach(() => {
  const st = appStore.getState();
  st.setViewMode("compare");
  for (const id of [...st.comparePlans]) st.unpinPlan(id);
  st.selectPlan(null);
  st.selectSite(null);
  st.setWindow(7);
  st.setConstraints({ ...DEFAULT_CONSTRAINTS });
  st.setCompareTime(0);
});
afterEach(cleanup);

const plan = (id: string) => appStore.getState().plansById.get(id)!;
const arrivalMs = (id: string) => Date.parse(plan(id).arrival_utc);
const canvas = () => screen.getByTestId("calendar-canvas");
const tray = () => screen.getByTestId("tray-grid");
const panelOf = (id: string) => tray().querySelector<HTMLElement>(`[data-plan-id="${id}"]`)!;
const siteArea = () => screen.getByRole("region", { name: "At the site" });

/** Client coordinates of a calendar cell (same layout maths as the component). */
function cellPoint(siteId: string, isoDate: string): { clientX: number; clientY: number } {
  const index = appStore.getState().windowIndex[7]!;
  const layout = makeLayout(W, index.siteIds.length, index.nDays);
  const day = Math.round((Date.parse(isoDate) - Date.parse(index.firstArrival)) / 86_400_000);
  const [x, y, w, h] = cellRect(layout, index.siteIds.indexOf(siteId), day);
  return { clientX: x + w / 2, clientY: y + h / 2 };
}

async function renderApp(pinned: string[] = [], selected: string | null = null) {
  const st = appStore.getState();
  for (const id of pinned) st.pinPlan(id);
  if (selected) st.selectPlan(selected);
  render(<App />);
  await waitFor(() => expect(canvas().dataset.pinnedCells).toBe(String(pinned.length)));
  if (pinned.length) await waitFor(() => expect(screen.getAllByTestId("plan-panel")).toHaveLength(pinned.length));
}

async function siteHeading(name: RegExp) {
  await waitFor(() => expect(within(siteArea()).getByText(name, { selector: "strong" })).toBeTruthy());
}

/* ------------------------------------------------------------------ plan */

describe("plan", () => {
  it("calendar click → tray panel selected, site section shows the plan, calendar marks the cell", async () => {
    await renderApp([A, B]);
    const at = cellPoint("malapert_massif", "2027-10-15");
    fireEvent.mouseDown(canvas(), at);
    fireEvent.mouseUp(canvas(), at);
    expect(appStore.getState().selectedPlanId).toBe(B);
    expect(canvas().dataset.selectedCell).toMatch(/^malapert_massif:/);
    expect(panelOf(B).className).toContain("selected");
    expect(panelOf(A).className).not.toContain("selected");
    await siteHeading(/Malapert Massif/);
    expect(canvas().dataset.selectedSite).toBe("malapert_massif");
  });

  it("tray title → calendar cell and site, site section", async () => {
    await renderApp([A, B]);
    fireEvent.click(within(panelOf(A)).getByRole("button", { name: /Haworth/, pressed: false }));
    expect(appStore.getState().selectedPlanId).toBe(A);
    expect(canvas().dataset.selectedCell).toMatch(/^haworth:/);
    expect(canvas().dataset.selectedSite).toBe("haworth");
    expect(screen.getByRole("button", { name: /^Select Haworth/ }).getAttribute("aria-pressed")).toBe("true");
    await siteHeading(/Haworth/);
  });

  it("tray 3D button → live view on that plan; a thumbnail switches it; back in compare every view shows the new plan", async () => {
    await renderApp([A, B, C]);
    fireEvent.click(screen.getByRole("button", { name: "Open Haworth in the 3D live view" }));
    expect(await screen.findByRole("heading", { name: "Live view · Haworth" })).toBeTruthy();
    const strip = await screen.findByTestId("thumb-strip");
    await waitFor(() => expect(within(strip).getAllByTestId("thumb")).toHaveLength(2));
    fireEvent.click(within(strip).getByRole("button", { name: /Show Connecting Ridge/ }));
    expect(await screen.findByRole("heading", { name: /Live view · Connecting Ridge/ })).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.getAllByTestId("plan-panel")).toHaveLength(3));
    expect(panelOf(C).className).toContain("selected");
    expect(canvas().dataset.selectedCell).toMatch(/^connecting_ridge:/);
    await siteHeading(/Connecting Ridge/);
  });

  it("site section 'Open 3D view' → live view on the selected plan", async () => {
    await renderApp([A], A);
    await siteHeading(/Haworth/);
    fireEvent.click(within(siteArea()).getByRole("button", { name: "Open 3D view" }));
    expect(await screen.findByRole("heading", { name: "Live view · Haworth" })).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ pinned plans */

describe("pinned plans", () => {
  it("calendar double-click pins → tray panel, calendar marker, live thumbnails", async () => {
    await renderApp([A], A);
    fireEvent.doubleClick(canvas(), cellPoint("malapert_massif", "2027-10-15"));
    await waitFor(() => expect(screen.getAllByTestId("plan-panel")).toHaveLength(2));
    expect(panelOf(B)).toBeTruthy();
    expect(canvas().dataset.pinnedCells).toBe("2");
    fireEvent.click(within(siteArea()).getByRole("button", { name: "Open 3D view" }));
    const strip = await screen.findByTestId("thumb-strip");
    await waitFor(() => expect(within(strip).getAllByTestId("thumb").map((t) => t.dataset.planId)).toEqual([B]));
  });

  it("tray × unpins → calendar marker and the site panel's comparison", async () => {
    await renderApp([A, B, C], A);
    const table = await screen.findByTestId("site-compare");
    await waitFor(() => expect(within(table).getByText(/Malapert Massif/)).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Remove Malapert Massif from the comparison" }));
    await waitFor(() => expect(screen.getAllByTestId("plan-panel")).toHaveLength(2));
    expect(canvas().dataset.pinnedCells).toBe("2");
    await waitFor(() => expect(within(screen.getByTestId("site-compare")).queryByText(/Malapert Massif/)).toBeNull());
  });
});

/* ------------------------------------------------------------------ site */

describe("site", () => {
  it("calendar site name → site marked, plan moves to the same date at that site, tray and site section follow", async () => {
    await renderApp([A, "malapert_massif_20270309_7d"], A);
    fireEvent.click(screen.getByRole("button", { name: /^Select Malapert Massif/ }));
    expect(appStore.getState().selectedSite).toBe("malapert_massif");
    expect(appStore.getState().selectedPlanId).toBe("malapert_massif_20270309_7d"); // same arrival, same L
    expect(canvas().dataset.selectedSite).toBe("malapert_massif");
    expect(canvas().dataset.selectedCell).toMatch(/^malapert_massif:/);
    expect(screen.getByRole("button", { name: /^Select Malapert Massif/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /^Select Haworth/ }).getAttribute("aria-pressed")).toBe("false");
    expect(panelOf("malapert_massif_20270309_7d").className).toContain("selected");
    await siteHeading(/Malapert Massif/);
    await waitFor(() => expect(siteArea().querySelector(".site-heading")!.textContent).toMatch(/Malapert Massif · Arrival 2027-03-09 · 7 days/));
  });

  it("without a selected plan, choosing a site only marks it", async () => {
    await renderApp();
    fireEvent.click(screen.getByRole("button", { name: /^Select Haworth/ }));
    expect(canvas().dataset.selectedSite).toBe("haworth");
    expect(appStore.getState().selectedPlanId).toBeNull();
  });
});

/* ------------------------------------------------------------------ time */

describe("time", () => {
  it("tray scrubber → every panel, the site time control and the panorama", async () => {
    await renderApp([A, B], A);
    const panorama = await screen.findByTestId("panorama");
    fireEvent.change(screen.getByRole("slider", { name: "Time since arrival (all panels)" }), { target: { value: "30" } });
    for (const p of screen.getAllByTestId("plan-panel")) expect(within(p).getByTestId("silhouette").dataset.sample).toBe("60");
    expect((screen.getByRole("slider", { name: "Mission time at the site" }) as HTMLInputElement).value).toBe("30");
    expect(panorama.dataset.sample).toBe("60");
    expect(appStore.getState().missionTime).toBe(arrivalMs(A) + 30 * HOUR);
  });

  it("site time control → panorama, every panel and the tray scrubber", async () => {
    await renderApp([A, B], A);
    const panorama = await screen.findByTestId("panorama");
    fireEvent.change(screen.getByRole("slider", { name: "Mission time at the site" }), { target: { value: "45.5" } });
    expect(panorama.dataset.sample).toBe("91");
    for (const p of screen.getAllByTestId("plan-panel")) expect(within(p).getByTestId("silhouette").dataset.sample).toBe("91");
    expect((screen.getByRole("slider", { name: "Time since arrival (all panels)" }) as HTMLInputElement).value).toBe("45.5");
  });

  it("live mission clock at the site → arrival panorama and thumbnails; back in compare the tray is at the same moment", async () => {
    await renderApp([A, B], A);
    fireEvent.click(screen.getByRole("button", { name: "Open Haworth in the 3D live view" }));
    await screen.findByTestId("mission-controls");
    const traj = await appStore.getState().data.trajectory(plan(A).trajectory_id);
    const tl = timelineOf(plan(A), traj);
    fireEvent.click(screen.getByRole("button", { name: "At the site" }));
    fireEvent.change(screen.getByRole("slider", { name: /mission time/i }), { target: { value: String((tl.landingMs + 20 * HOUR - tl.startMs) / 60_000) } });
    const dock = await screen.findByTestId("live-site");
    await waitFor(() => expect(within(dock).getByTestId("panorama").dataset.sample).toBe("40"));
    expect(screen.getByTestId("thumb-clock").textContent).toBe("Day 1, 20:00");
    const thumb = within(screen.getByTestId("thumb-strip")).getByTestId("thumb");
    await waitFor(() => expect(within(thumb).getByTestId("silhouette").dataset.sample).toBe("40"));
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.getAllByTestId("plan-panel")).toHaveLength(2));
    for (const p of screen.getAllByTestId("plan-panel")) await waitFor(() => expect(within(p).getByTestId("silhouette").dataset.sample).toBe("40"));
    expect(appStore.getState().compareTime).toBe(20);
  });

  it("live mission clock before landing (transit) leaves the tray clock alone", async () => {
    await renderApp([A, B], A);
    act(() => appStore.getState().setCompareTime(12));
    fireEvent.click(screen.getByRole("button", { name: "Open Haworth in the 3D live view" }));
    await screen.findByTestId("mission-controls");
    fireEvent.click(screen.getByRole("button", { name: "Transit" }));
    expect(appStore.getState().missionPhase).toBe("transit");
    expect(appStore.getState().compareTime).toBe(12);
  });
});

/* ------------------------------------------------------------------ window length and constraints */

describe("window length and constraints", () => {
  it("calendar window L → same site and arrival with the new L in the site section and the calendar", async () => {
    await renderApp([], A);
    await siteHeading(/Haworth/);
    fireEvent.click(screen.getByRole("button", { name: "14 days" }));
    expect(appStore.getState().selectedPlanId).toBe("haworth_20270309_14d");
    await waitFor(() => expect(within(siteArea()).getByText(/14 days/)).toBeTruthy());
    await waitFor(() => expect(canvas().dataset.selectedCell).toMatch(/^haworth:/));
  });

  it("constraint control → calendar valid cells and the count", async () => {
    await renderApp();
    const status = await screen.findByText(/plans meet the constraints/);
    const total = Number(/of (\d+)/.exec(status.textContent!)![1]);
    expect(status.textContent).toMatch(new RegExp(`^${total} of ${total}`));
    fireEvent.click(screen.getByRole("checkbox", { name: /Minimum sunlight/ }));
    await waitFor(() => expect(Number(/^(\d+)/.exec(screen.getByText(/plans meet the constraints/).textContent!)![1])).toBeLessThan(total));
    expect(appStore.getState().validCount!.valid).toBeLessThan(total);
  });
});

/* ------------------------------------------------------------------ T5.1.b: the same figures in every view */

describe("same figures in every view (T5.1.b)", () => {
  // two plans whose exact decimals sit on a rounding half (score 0.975, sunlight 68.45) and an ordinary one
  const P = ["connecting_ridge_20270304_7d", "connecting_ridge_20270318_7d", A];

  it("the shared rounding is half up on the decimal value", () => {
    expect(round(0.745, 2)).toBe("0.75");
    expect(round(0.975, 2)).toBe("0.98");
    expect(round(68.45, 1)).toBe("68.5");
    expect(round(43.15, 1)).toBe("43.2");
    expect(round(1, 2)).toBe("1.00");
    expect(round(0.04999, 1)).toBe("0.0");
    expect(num(100)).toBe("100");
    expect(num(68.45)).toBe("68.5");
    expect(fmtMetric("score", 0.975)).toBe("0.98");
  });

  it("3 plans: tray box, site panel, comparison table, calendar tooltip, ribbon and why text agree", async () => {
    await renderApp(P);
    for (const id of P) {
      const rows = await appStore.getState().data.windows(plan(id).site_id, 7);
      const row = rows.rows.find((r) => r.start === plan(id).arrival_utc)!;
      const expected = Object.fromEntries(METRICS.map(({ key }) => [key, fmtMetric(key, row[key])])) as Record<MetricKey, string>;

      // tray: metrics box
      const box = within(panelOf(id)).getByTestId("metrics-box");
      for (const { key } of METRICS) expect(box.querySelector(`[data-metric="${key}"] .metric-value`)!.textContent, `${id} tray ${key}`).toBe(expected[key]);
      // tray: time ribbon's longest dark = the metric
      const ribbonText = within(panelOf(id)).getByText(/Longest dark:|No dark stretch/).textContent!;
      expect(ribbonText, `${id} ribbon`).toBe(row.longest_dark_h === 0 ? "No dark stretch" : `Longest dark: ${expected.longest_dark_h} h`);

      // site panel: metrics list and the "this plan" row of the comparison table
      act(() => appStore.getState().selectPlan(id));
      const sitePanel = await screen.findByLabelText(new RegExp(`Site features: ${plan(id).site_id === "haworth" ? "Haworth" : "Connecting Ridge"}`));
      await waitFor(() => expect(sitePanel.closest("section")!.ownerDocument.querySelector(".site-heading")!.textContent).toContain(plan(id).arrival_utc.slice(0, 10)));
      for (const { key } of METRICS) expect(sitePanel.querySelector(`[data-key="${key}"] dd`)!.textContent, `${id} site ${key}`).toBe(expected[key]);
      const thisRow = within(screen.getByTestId("site-compare")).getAllByRole("row").find((r) => r.className === "this-plan")!;
      expect([...thisRow.querySelectorAll("td")].map((td) => td.textContent)).toEqual([expected.sun_pct, expected.longest_dark_h, expected.earth_h_min, expected.score]);

      // calendar: hover tooltip of the plan's cell
      fireEvent.mouseMove(canvas(), cellPoint(plan(id).site_id, plan(id).arrival_utc));
      await waitFor(() => expect(document.querySelector(".calendar .tooltip")).not.toBeNull());
      const tipText = document.querySelector(".calendar .tooltip")!.textContent!;
      expect(tipText).toContain(plan(id).arrival_utc.slice(0, 10)); // the tooltip is for this plan's cell
      expect(tipText, `${id} calendar`).toContain(`Sunlight ${expected.sun_pct} %`);
      expect(tipText).toContain(`Longest dark ${expected.longest_dark_h} h`);
      expect(tipText).toContain(`Earth ${expected.earth_h_mean} h/day (min ${expected.earth_h_min})`);
      expect(tipText).toContain(`Score ${expected.score}`);
      fireEvent.mouseLeave(canvas());

      // why text: every number it quotes is one of the box's figures (same rounding)
      const why = within(panelOf(id)).getByTestId("why").textContent!;
      const quoted = [...why.matchAll(/(\d+(?:\.\d+)?)(?=% sunlight| h| \))|\((\d\.\d\d)\)/g)].map((m) => m[1] ?? m[2]);
      const shown = new Set(Object.values(expected).flatMap((v) => [v, v.replace(/\.0$/, "")]));
      for (const q of quoted) expect(shown.has(q), `${id} why "${why}" quotes ${q}`).toBe(true);
    }
    // the edge cases really are shown rounded half up
    expect(within(panelOf(P[0])).getByTestId("metrics-box").querySelector('[data-metric="score"] .metric-value')!.textContent).toBe("0.98");
    expect(within(panelOf(P[1])).getByTestId("metrics-box").querySelector('[data-metric="sun_pct"] .metric-value')!.textContent).toBe("68.5");
  });

  it("the ribbon's longest dark equals longest_dark_h for every 7-day plan of every site", async () => {
    const st = appStore.getState();
    let n = 0;
    const bad: string[] = [];
    for (const site of st.sites) {
      const rows = (await st.data.windows(site.id, 7)).rows;
      for (const r of rows) {
        const id = `${site.id}_${r.start.slice(0, 10).replace(/-/g, "")}_7d`;
        const pd = await loadPlanData(st.data, plan(id), st.sites);
        const run = longestZeroRun(pd.series.sunVis);
        const h = run ? ((run.end - run.start) * pd.series.stepMin) / 60 : 0;
        if (round(h, 1) !== fmtMetric("longest_dark_h", r.longest_dark_h)) bad.push(`${id}: ribbon ${h} vs ${r.longest_dark_h}`);
        n++;
      }
    }
    console.log(`ribbon vs metric: ${n} plans, ${bad.length} mismatches`);
    expect(bad).toEqual([]);
  }, 60_000);
});
