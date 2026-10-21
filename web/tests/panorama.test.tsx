// @vitest-environment jsdom
/** T3.4: horizon panorama (level A). */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { DataStore } from "../src/lib/data";
import { loadPlanData, type PlanData } from "../src/lib/planData";
import { makeProjection } from "../src/lib/projection";
import { appStore } from "../src/store/appStore";
import { HorizonSilhouette } from "../src/panels2d/HorizonSilhouette";
import { TimeControl } from "../src/components/TimeControl";
import { sharedElevationScale } from "../src/lib/scale";
import { discRadii, EARTH_DIAMETER_DEG, Panorama, panoramaRange, sampleAtTime, SUN_DIAMETER_DEG } from "../src/views/Panorama";

const REAL = join(__dirname, "..", "public", "data");
const fileFetch = (async (url: string) => {
  try {
    return new Response(readFileSync(join(REAL, url.replace(/^.*\/data\//, "").replace(/^\/base\//, ""))), { status: 200 });
  } catch {
    return new Response("", { status: 404 });
  }
}) as typeof fetch;
const WIDTH = 1800;
let haworth: PlanData;

beforeAll(async () => {
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => WIDTH });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 220 });
  globalThis.fetch = fileFetch;
  await appStore.getState().loadCore();
  const st = appStore.getState();
  haworth = await loadPlanData(new DataStore("/base/", fileFetch as never), st.plansById.get("haworth_20270309_7d")!, st.sites);
});
afterEach(cleanup);

describe("disc sizes at angular scale (spec 8.4)", () => {
  it("Sun 0.53° and Earth 1.9° in px follow the horizontal scale of every field of view", () => {
    for (const fov of [360, 120, 60]) {
      const p = makeProjection(WIDTH, 260, { minDeg: -3, maxDeg: 12 }, null, 0, fov);
      const r = discRadii(p);
      expect(2 * r.sun).toBeCloseTo(SUN_DIAMETER_DEG * (WIDTH / fov), 9);
      expect(2 * r.earth).toBeCloseTo(EARTH_DIAMETER_DEG * (WIDTH / fov), 9);
    }
    // 1800 px for 60° → 30 px/°: Sun 15.9 px, Earth 57 px
    const r60 = discRadii(makeProjection(WIDTH, 260, { minDeg: -3, maxDeg: 12 }, null, 0, 60));
    expect(2 * r60.sun).toBeCloseTo(15.9, 9);
    expect(2 * r60.earth).toBeCloseTo(57, 9);
  });

  it("the rendered discs have those radii", () => {
    render(<Panorama data={haworth} timeMs={haworth.series.startMs} />);
    const sun = screen.getByTestId("sun-disc");
    expect(Number(sun.querySelector(".disc")!.getAttribute("r"))).toBeCloseTo((0.53 * (WIDTH / 360)) / 2, 9);
    fireEvent.click(screen.getByRole("button", { name: "60°" }));
    const earth = screen.getByTestId("earth-disc");
    expect(Number(earth.querySelector(".disc")!.getAttribute("r"))).toBeCloseTo((1.9 * 30) / 2, 9);
  });
});

describe("panorama content", () => {
  it("elevation range −3° to 12°, extended down only if the terrain is lower", () => {
    expect(panoramaRange([0, 1, 2])).toEqual({ minDeg: -3, maxDeg: 12 });
    expect(panoramaRange([-4.2, 1])).toEqual({ minDeg: -5.5, maxDeg: 12 });
  });

  it("time → sample of the window, flagged outside it", () => {
    const s = haworth.series;
    expect(sampleAtTime(haworth, s.startMs)).toEqual({ k: 0, inside: true });
    expect(sampleAtTime(haworth, s.startMs + 90 * 60_000)).toEqual({ k: 3, inside: true });
    expect(sampleAtTime(haworth, s.startMs - 1)).toEqual({ k: 0, inside: false });
    expect(sampleAtTime(haworth, s.startMs + 8 * 86_400_000)).toEqual({ k: s.n - 1, inside: false });
  });

  it("always shows UTC time, az/el of both bodies and the light / link status from the data", () => {
    const t = haworth.series.startMs + 50 * 30 * 60_000; // sample 50
    render(<Panorama data={haworth} timeMs={t} />);
    expect(screen.getByTestId("panorama").dataset.sample).toBe("50");
    expect(screen.getByText(/2027-03-10 01:00 UTC/)).toBeTruthy();
    const s = haworth.series;
    expect(screen.getByText(`az ${s.sunAz[50].toFixed(1)}° · el ${s.sunEl[50] >= 0 ? "+" : ""}${s.sunEl[50].toFixed(2)}°`)).toBeTruthy();
    expect(screen.getByTestId("status-light").textContent).toContain(s.sunVis[50] ? "Sunlit" : "In shadow");
    expect(screen.getByTestId("status-link").textContent).toContain(s.earthVis[50] ? "Earth link" : "No Earth link");
  });

  it("recentres on the Sun: the Sun disc moves to the middle", () => {
    render(<Panorama data={haworth} timeMs={haworth.series.startMs} />);
    fireEvent.click(screen.getByRole("button", { name: "Sun" }));
    const tr = screen.getByTestId("sun-disc").getAttribute("transform")!;
    expect(Number(tr.match(/translate\(([-\d.]+),/)![1])).toBeCloseTo(WIDTH / 2, 6);
  });

  it("draws no canvas (SVG only)", () => {
    render(<Panorama data={haworth} timeMs={haworth.series.startMs} />);
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
  });
});

describe("time control and coherence with the panels (T3.4.b)", () => {
  it("at the same instant the panorama and the panel silhouette use exactly the same az/el", () => {
    const scale = sharedElevationScale([haworth]);
    for (const h of [0, 0.5, 13, 50.5, 99, 167.5]) {
      render(
        <>
          <HorizonSilhouette data={haworth} scale={scale} exaggeration={null} compareTime={h} />
          <Panorama data={haworth} timeMs={haworth.series.startMs + h * 3_600_000} />
        </>,
      );
      for (const [panel, pano] of [
        ["sun-marker", "sun-disc"],
        ["earth-marker", "earth-disc"],
      ]) {
        const a = screen.getByTestId(panel);
        const b = screen.getByTestId(pano);
        expect(b.dataset.az, `${panel} at ${h} h`).toBe(a.dataset.az);
        expect(b.dataset.el).toBe(a.dataset.el);
        expect(b.dataset.visible).toBe(a.dataset.visible);
      }
      cleanup();
    }
  });

  it("the time control moves missionTime within the plan window and can match the tray clock", () => {
    const s = haworth.series;
    appStore.getState().selectPlan("haworth_20270309_7d");
    expect(appStore.getState().missionTime).toBe(s.startMs);
    render(<TimeControl startMs={s.startMs} windowDays={7} stepMin={s.stepMin} />);
    const slider = screen.getByRole("slider", { name: /mission time/i }) as HTMLInputElement;
    expect(Number(slider.max)).toBe(167.5);
    fireEvent.change(slider, { target: { value: "25.5" } });
    expect(appStore.getState().missionTime).toBe(s.startMs + 25.5 * 3_600_000);
    expect(slider.getAttribute("aria-valuetext")).toBe("Day 2, 01:30");
    appStore.getState().setCompareTime(70);
    fireEvent.click(screen.getByRole("button", { name: "Match tray clock" }));
    expect(appStore.getState().missionTime).toBe(s.startMs + 70 * 3_600_000);
    appStore.getState().setCompareTime(0);
    appStore.getState().selectPlan(null);
  });
});
