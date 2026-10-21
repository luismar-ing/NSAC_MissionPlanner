// @vitest-environment jsdom
/** T3.3.a: tray grid with identical panels sharing one vertical scale. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
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
