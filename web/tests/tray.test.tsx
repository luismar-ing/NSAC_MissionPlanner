// @vitest-environment jsdom
/** T3.3.a: tray grid with identical panels sharing one vertical scale. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { DataStore } from "../src/lib/data";
import { loadPlanData, sampleAt, sliceWindow } from "../src/lib/planData";
import { sharedElevationScale } from "../src/lib/scale";
import { appStore } from "../src/store/appStore";
import { Tray } from "../src/panels2d/Tray";

const REAL = join(__dirname, "..", "public", "data");
const fileFetch = (async (url: string) => {
  try {
    return new Response(readFileSync(join(REAL, url.replace(/^.*\/data\//, "").replace(/^\/base\//, ""))), { status: 200 });
  } catch {
    return new Response("", { status: 404 });
  }
}) as typeof fetch;

beforeAll(async () => {
  globalThis.fetch = fileFetch;
  // jsdom has no layout or ResizeObserver: give every element a fixed size
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 340 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 220 });
  await appStore.getState().loadCore();
});
afterEach(() => {
  cleanup();
  appStore.getState().comparePlans.slice().forEach((id) => appStore.getState().unpinPlan(id));
});

describe("plan data", () => {
  it("slices the window of a plan from the site series", async () => {
    const store = new DataStore("/base/", fileFetch as never);
    const ts = await store.timeseries("haworth");
    const w = sliceWindow(ts, "2027-03-10T00:00:00Z", 7);
    expect(w.n).toBe(7 * 48);
    // sun_pct of the window = mean of the sliced flags (same as windows/haworth_7d.json: 38.1 %)
    expect((100 * w.sunVis.reduce((a, b) => a + b, 0)) / w.n).toBeCloseTo(38.1, 1);
    expect(sampleAt(w, 0)).toBe(0);
    expect(sampleAt(w, 1000)).toBe(w.n - 1);
  });
});

describe("tray (spec 8.1)", () => {
  it("renders one identical panel per pinned plan, all with the same vertical scale", async () => {
    for (const id of ["haworth_20270310_7d", "malapert_massif_20271015_7d", "connecting_ridge_20270601_7d"]) appStore.getState().pinPlan(id);
    render(<Tray />);
    const panels = await screen.findAllByTestId("plan-panel");
    expect(panels).toHaveLength(3);
    const scales = new Set(panels.map((p) => p.dataset.scale));
    expect(scales.size).toBe(1);
    expect(screen.getAllByText("ILLUSTRATIVE")).toHaveLength(3);
    expect(screen.getByTestId("tray-grid").style.getPropertyValue("--cols")).toBe("3");
  });

  it("the shared scale covers every mask and track", async () => {
    const store = new DataStore("/base/", fileFetch as never);
    const st = appStore.getState();
    const plans = await Promise.all(["haworth_20270310_7d", "nobile_rim_1_20270101_14d"].map((id) => loadPlanData(store, st.plansById.get(id)!, st.sites)));
    const s = sharedElevationScale(plans);
    for (const p of plans) {
      expect(Math.min(...p.horizon.elev_deg, ...p.series.sunEl, ...p.series.earthEl)).toBeGreaterThanOrEqual(s.minDeg);
      expect(Math.max(...p.horizon.elev_deg, ...p.series.sunEl, ...p.series.earthEl)).toBeLessThanOrEqual(s.maxDeg);
    }
  });
});

describe("silhouette (T3.3.b)", () => {
  it("draws SVG only (no WebGL) with the Sun and Earth at compareTime", async () => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    const calls: string[] = [];
    HTMLCanvasElement.prototype.getContext = function (type: string) {
      calls.push(type);
      return null;
    } as never;
    for (const id of ["haworth_20270310_7d", "malapert_massif_20271015_7d"]) appStore.getState().pinPlan(id);
    appStore.getState().setCompareTime(70); // day 3, 22:00 after arrival
    render(<Tray />);
    const sil = await screen.findAllByTestId("silhouette");
    expect(sil).toHaveLength(2);
    expect(sil[0].dataset.sample).toBe(String(70 * 2)); // 30-min samples
    await waitFor(() => expect(sil[0].querySelector("svg")).not.toBeNull());
    expect(screen.getAllByTestId("sun-marker")).toHaveLength(2);
    expect(screen.getAllByTestId("earth-marker")).toHaveLength(2);
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
    expect(calls.filter((c) => c.startsWith("webgl"))).toEqual([]);
    HTMLCanvasElement.prototype.getContext = getContext;
    appStore.getState().setCompareTime(0);
  });

  it("marker fill follows the visibility flag of the sample", async () => {
    appStore.getState().pinPlan("haworth_20270310_7d");
    appStore.getState().pinPlan("malapert_massif_20271015_7d");
    render(<Tray />);
    const sil = await screen.findAllByTestId("silhouette");
    const store = new DataStore("/base/", fileFetch as never);
    const st = appStore.getState();
    const pd = await loadPlanData(store, st.plansById.get("haworth_20270310_7d")!, st.sites);
    await waitFor(() => expect(sil[0].querySelector("svg")).not.toBeNull());
    const sun = sil[0].querySelector('[data-testid="sun-marker"]') as SVGGElement;
    expect(sun.dataset.visible).toBe(String(pd.series.sunVis[0] === 1));
  });
});

describe("metrics box (T3.3.d)", () => {
  it("puts each best badge on the right panel", async () => {
    // Haworth 2027-03-09 (38.1 % Sun, 89.5 h dark) against Malapert 2027-10-15
    appStore.getState().pinPlan("haworth_20270309_7d");
    appStore.getState().pinPlan("malapert_massif_20271015_7d");
    render(<Tray />);
    const boxes = await screen.findAllByTestId("metrics-box");
    const store = new DataStore("/base/", fileFetch as never);
    const st = appStore.getState();
    const rows = await Promise.all(
      ["haworth_20270309_7d", "malapert_massif_20271015_7d"].map((id) => loadPlanData(store, st.plansById.get(id)!, st.sites).then((p) => p.metrics)),
    );
    for (const key of ["sun_pct", "longest_dark_h", "score"] as const) {
      const lower = key === "longest_dark_h";
      const vals = rows.map((r) => r[key]);
      const best = lower ? Math.min(...vals) : Math.max(...vals);
      boxes.forEach((b, i) => {
        const el = b.querySelector(`[data-metric="${key}"]`) as HTMLElement;
        const expected = vals[i] === best && !vals.every((v) => v === best);
        expect(el.dataset.best, `${key} panel ${i}`).toBe(String(expected));
      });
    }
    expect(boxes[0].querySelector('[data-testid="why"]')!.textContent).toContain("38.1");
  });
});

describe("compare scrubber (T3.3.e)", () => {
  it("moves every panel at once and records the update time", async () => {
    const ids = ["haworth_20270309_7d", "malapert_massif_20271015_7d", "connecting_ridge_20270601_7d", "nobile_rim_1_20270101_7d", "de_gerlache_rim_2_20270801_7d"];
    for (const id of ids) appStore.getState().pinPlan(id);
    render(<Tray />);
    await waitFor(() => expect(screen.getAllByTestId("silhouette")).toHaveLength(5));
    const slider = screen.getByRole("slider", { name: /time since arrival/i }) as HTMLInputElement;
    expect(slider.max).toBe(String(7 * 24 - 0.5));
    fireEvent.change(slider, { target: { value: "50.5" } }); // day 3, 02:30
    for (const s of screen.getAllByTestId("silhouette")) expect(s.dataset.sample).toBe("101");
    expect(slider.getAttribute("aria-valuetext")).toBe("Day 3, 02:30");
    const ms = Number(screen.getByTestId("scrubber").dataset.lastUpdateMs);
    expect(ms).toBeGreaterThanOrEqual(0);
    console.log(`scrubber (jsdom, 5 panels): ${ms} ms`);
    fireEvent.click(screen.getByRole("button", { name: "Forward one day" }));
    for (const s of screen.getAllByTestId("silhouette")) expect(s.dataset.sample).toBe("149");
    appStore.getState().setCompareTime(0);
  });

  it("selecting a panel sets selectedPlanId", async () => {
    appStore.getState().pinPlan("haworth_20270309_7d");
    appStore.getState().pinPlan("malapert_massif_20271015_7d");
    render(<Tray />);
    const panels = await screen.findAllByTestId("plan-panel");
    fireEvent.click(panels[1].querySelector(".plan-panel-title")!);
    expect(appStore.getState().selectedPlanId).toBe("malapert_massif_20271015_7d");
  });
});
