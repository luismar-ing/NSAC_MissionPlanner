// @vitest-environment jsdom
/** T4.4.b: switching the live plan from a thumbnail (spec 8.0) — state, scene call and camera hop. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import type { TerrainHeader } from "../src/lib/contract";
import { timelineOf } from "../src/lib/mission";
import { sceneBridge } from "../src/scene3d/bridge";
import { hopPose, SWITCH_MS, switchEase, type Pose } from "../src/scene3d/cameraDirector";
import { MOON_RADIUS_KM, type Vec3 } from "../src/scene3d/scale";
import { bodyFixedKm } from "../src/scene3d/terrain";
import { appStore } from "../src/store/appStore";

// the WebGL scene is replaced by a stub that registers the bridge like SceneHost does
const setPlan = vi.fn();
vi.mock("../src/scene3d/SceneHost", async () => {
  const { useEffect } = await import("react");
  const { sceneBridge: bridge } = await import("../src/scene3d/bridge");
  return {
    SceneHost: () => {
      useEffect(() => {
        bridge.setPlan = setPlan;
        return () => {
          bridge.setPlan = null;
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

const A = "haworth_20270309_7d";
const B = "malapert_massif_20271015_7d";
const C = "connecting_ridge_20270102_7d";

beforeAll(async () => {
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 600 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 200 });
  globalThis.fetch = fileFetch;
  window.scrollTo = () => {};
  await appStore.getState().loadCore();
});
afterEach(cleanup);

describe("change of plan from a thumbnail (spec 8.0)", () => {
  it("switches the 3D plan without leaving live mode, at the same time since arrival, with one scene call", async () => {
    const st = appStore.getState();
    for (const id of [A, B, C]) st.pinPlan(id);
    st.selectPlan(A);
    st.setViewMode("live");
    render(<App />);
    await screen.findByTestId("mission-controls");
    expect(sceneBridge.setPlan).toBe(setPlan);
    fireEvent.click(screen.getByRole("button", { name: "At the site" }));
    const slider = screen.getByRole("slider", { name: /mission time/i });
    const plansById = st.plansById;
    const trajA = await st.data.trajectory(plansById.get(A)!.trajectory_id);
    const tlA = timelineOf(plansById.get(A)!, trajA);
    fireEvent.change(slider, { target: { value: String((tlA.landingMs + 30 * 3_600_000 - tlA.startMs) / 60_000) } });
    expect(appStore.getState().missionPhase).toBe("site");

    const strip = screen.getByTestId("thumb-strip");
    await waitFor(() => expect(within(strip).getAllByTestId("thumb")).toHaveLength(2));
    fireEvent.click(within(strip).getByRole("button", { name: /Show Malapert Massif/ }));
    await waitFor(() => expect(appStore.getState().selectedPlanId).toBe(B));

    const s = appStore.getState();
    expect(s.viewMode).toBe("live"); // never left live mode
    const planB = plansById.get(B)!;
    const trajB = await st.data.trajectory(planB.trajectory_id);
    const tlB = timelineOf(planB, trajB);
    expect(s.missionTime).toBe(tlB.landingMs + 30 * 3_600_000); // same moment of the stay: 30 h after arrival
    expect(s.missionPhase).toBe("site");
    expect(setPlan).toHaveBeenCalledTimes(1);
    expect(setPlan.mock.calls[0][0]).toMatchObject({ siteId: "malapert_massif", timeline: tlB });
    expect(screen.getByRole("heading", { name: /Live view · Malapert Massif/ })).toBeTruthy();

    // the strip now holds the previous plan; the mission clock is the new plan's
    await waitFor(() => expect(within(strip).getAllByTestId("thumb").map((t) => t.getAttribute("data-plan-id"))).toEqual([A, C]));
    await waitFor(() => expect(screen.getByTestId("mission-phase").textContent).toBe("At the site"));
    expect(within(strip).getByTestId("thumb-clock").textContent).toBe("Day 2, 06:00");
    // the site panel and panorama of the new plan follow
    await waitFor(() => expect(screen.getByLabelText(/Site features: Malapert Massif/)).toBeTruthy());
  });

  it("before landing the new plan opens at the same time before its own landing (clamped to its mission)", async () => {
    const st = appStore.getState();
    st.selectPlan(A);
    st.setViewMode("live");
    render(<App />);
    await screen.findByTestId("mission-controls");
    fireEvent.click(screen.getByRole("button", { name: "Transit" }));
    const tlA = timelineOf(st.plansById.get(A)!, await st.data.trajectory(st.plansById.get(A)!.trajectory_id));
    const rel = appStore.getState().missionTime! - tlA.landingMs;
    fireEvent.click(within(screen.getByTestId("thumb-strip")).getByRole("button", { name: /Show Connecting Ridge/ }));
    await waitFor(() => expect(appStore.getState().selectedPlanId).toBe(C));
    const tlC = timelineOf(st.plansById.get(C)!, await st.data.trajectory(st.plansById.get(C)!.trajectory_id));
    const t = appStore.getState().missionTime!;
    expect(t).toBe(Math.max(tlC.startMs, tlC.landingMs + rel));
    expect(appStore.getState().missionPhase).not.toBe("overview");
    expect(appStore.getState().viewMode).toBe("live");
    appStore.getState().setViewMode("compare");
  });
});

/* ------------------------------------------------------------------ the camera hop */

const sites = JSON.parse(readFileSync(join(DATA, "sites.json"), "utf-8")) as { id: string; lat: number; lon: number; elevation_m: number }[];
const polarHeader = JSON.parse(readFileSync(join(DATA, "terrain", "_polar", "lod0.json"), "utf-8")) as TerrainHeader;
const polarBuf = readFileSync(join(DATA, "terrain", "_polar", polarHeader.bin_file));
const polarInts = new Int16Array(polarBuf.buffer, polarBuf.byteOffset, polarBuf.byteLength / 2);

/** Terrain radius (km) under a Moon-fixed direction, from the polar context grid (south polar stereographic). */
function terrainRadiusKm(dir: Vec3): number {
  const lat = Math.asin(dir[2] / Math.hypot(...dir));
  const lon = Math.atan2(dir[1], dir[0]);
  const c = lat + Math.PI / 2; // angular distance from the south pole
  const rho = 2 * MOON_RADIUS_KM * 1000 * Math.tan(c / 2);
  const x = rho * Math.sin(lon);
  const y = rho * Math.cos(lon);
  const g = polarHeader.grid;
  const i = Math.round((x - g.x0_m) / g.spacing_m);
  const j = Math.round((g.y0_m - y) / g.spacing_m);
  const h = polarInts[j * g.nx + i] * polarHeader.height_scale_m + polarHeader.height_offset_m;
  return MOON_RADIUS_KM + polarHeader.origin.elevation_m / 1000 + h / 1000;
}

/** Site view of the director at real local scale, in the Moon-fixed frame (km): 1.5 km up, 5 km back, 10 km ahead. */
function siteView(s: (typeof sites)[number]): Pose {
  const p = bodyFixedKm(s.lat, s.lon, MOON_RADIUS_KM + s.elevation_m / 1000);
  const up = p.map((v) => v / Math.hypot(...p)) as Vec3;
  const east: Vec3 = [-Math.sin((s.lon * Math.PI) / 180), Math.cos((s.lon * Math.PI) / 180), 0];
  return {
    position: [p[0] + up[0] * 1.5 - east[0] * 5, p[1] + up[1] * 1.5 - east[1] * 5, p[2] + up[2] * 1.5 - east[2] * 5],
    target: [p[0] + east[0] * 10, p[1] + east[1] * 10, p[2] + east[2] * 10],
    up,
  };
}

describe("camera hop between sites (Moon-fixed frame, real local scale)", () => {
  it("ends exactly on both views, stays above the real terrain and moves smoothly frame to frame", () => {
    const R = MOON_RADIUS_KM - 8; // drawn sphere at real local scale (renderer: 8 km below the reference)
    let minClear = Infinity;
    let worstTurn = 0;
    let worstStep = 0;
    for (const a of sites) {
      for (const b of sites) {
        if (a.id === b.id) continue;
        const pa = siteView(a);
        const pb = siteView(b);
        expect(hopPose(pa, pb, 0, R)).toEqual(pa);
        expect(hopPose(pa, pb, 1, R)).toEqual(pb);
        const frames = Math.round((SWITCH_MS / 1000) * 60); // 60 fps
        let prev = pa;
        for (let k = 1; k <= frames; k++) {
          const p = hopPose(pa, pb, switchEase((k / frames) * SWITCH_MS), R);
          const r = Math.hypot(...p.position);
          minClear = Math.min(minClear, r - terrainRadiusKm(p.position));
          const f0 = prev.target.map((v, i) => v - prev.position[i]);
          const f1 = p.target.map((v, i) => v - p.position[i]);
          const cos = f0.reduce((s, v, i) => s + v * f1[i], 0) / (Math.hypot(...f0) * Math.hypot(...f1));
          worstTurn = Math.max(worstTurn, (Math.acos(Math.min(1, cos)) * 180) / Math.PI);
          // step relative to the altitude above the terrain (what the eye perceives as speed over the ground)
          const step = Math.hypot(...p.position.map((v, i) => v - prev.position[i]));
          worstStep = Math.max(worstStep, step / Math.max(0.5, r - terrainRadiusKm(p.position)));
          prev = p;
        }
      }
    }
    console.log(`hop between ${sites.length} sites: min clearance ${minClear.toFixed(2)} km, worst turn ${worstTurn.toFixed(2)}°/frame, worst step ${(worstStep * 100).toFixed(0)} % of the height per frame`);
    expect(minClear).toBeGreaterThan(0.3); // never through the terrain
    expect(worstTurn).toBeLessThan(6);
  });
});
