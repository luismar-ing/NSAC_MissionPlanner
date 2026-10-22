// @vitest-environment jsdom
/** T4.2.c: the rocket follows the trajectory and lands at arrival_utc; trail style and label (rule 2). */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Trajectory } from "../src/lib/contract";
import { parseInstant } from "../src/lib/contract";
import { trailSamples, trailStyle, trajectoryPositionKm } from "../src/scene3d/trajectory";
import type { Vec3 } from "../src/scene3d/scale";
import { appStore } from "../src/store/appStore";
import { LiveView } from "../src/views/LiveView";

const DATA = join(__dirname, "..", "public", "data");
const files = readdirSync(join(DATA, "trajectory")).filter((f) => f.endsWith(".json"));
const load = (f: string) => JSON.parse(readFileSync(join(DATA, "trajectory", f), "utf-8")) as Trajectory;
const sample = files.filter((_, i) => i % 37 === 0).map(load);
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const fileFetch = (async (url: string) => {
  try {
    return new Response(readFileSync(join(DATA, url.replace(/^.*\/data\//, "").replace(/^\/base\//, ""))), { status: 200 });
  } catch {
    return new Response("", { status: 404 });
  }
}) as typeof fetch;

beforeAll(async () => {
  globalThis.fetch = fileFetch;
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  await appStore.getState().loadCore();
});
afterEach(cleanup);

describe("rocket on the trajectory", () => {
  it("at arrival_utc the rocket is at the last point (landing), for a sample of plans of every site", () => {
    let worst = 0;
    for (const traj of sample) {
      const landing = parseInstant(traj.phases.landing_utc);
      expect(landing).toBe(parseInstant(traj.t0_utc) + traj.t_s[traj.t_s.length - 1] * 1000);
      worst = Math.max(worst, dist(trajectoryPositionKm(traj, landing), traj.pos_km[traj.pos_km.length - 1] as Vec3));
      // and it stays there afterwards (the stay at the site)
      worst = Math.max(worst, dist(trajectoryPositionKm(traj, landing + 86_400_000), traj.pos_km[traj.pos_km.length - 1] as Vec3));
    }
    console.log(`trajectory: ${sample.length} plans, max |rocket(arrival_utc) − last point| = ${worst.toExponential(2)} km`);
    expect(new Set(sample.map((t) => t.site_id)).size).toBe(5);
    expect(worst).toBeLessThan(1e-6);
  });

  it("passes through every sample exactly", () => {
    const traj = sample[2];
    const t0 = parseInstant(traj.t0_utc);
    for (let k = 0; k < traj.t_s.length; k += 5) expect(dist(trajectoryPositionKm(traj, t0 + traj.t_s[k] * 1000), traj.pos_km[k] as Vec3)).toBeLessThan(1e-6);
  });

  it("stays on the parking orbit between samples 28° apart (a straight line would cut ~195 km inside)", () => {
    const traj = sample[0];
    const t0 = parseInstant(traj.t0_utc);
    let worstCubic = 0;
    let worstLinear = 0;
    for (let k = 7; k < 20; k++) {
      // parking orbit: between the 412.5 s samples, radius 6378.137 + 200 km
      const mid = (traj.t_s[k] + traj.t_s[k + 1]) / 2;
      const r = Math.hypot(...trajectoryPositionKm(traj, t0 + mid * 1000));
      const a = traj.pos_km[k];
      const b = traj.pos_km[k + 1];
      const lin = Math.hypot((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      worstCubic = Math.max(worstCubic, Math.abs(r - 6578.137));
      worstLinear = Math.max(worstLinear, Math.abs(lin - 6578.137));
    }
    console.log(`parking orbit: max radius error cubic ${worstCubic.toFixed(1)} km vs linear ${worstLinear.toFixed(1)} km`);
    expect(worstCubic).toBeLessThan(15);
    expect(worstLinear).toBeGreaterThan(150);
  });

  it("the dense trail has no jumps (continuous curve from the pad to the site)", () => {
    for (const traj of sample.slice(0, 6)) {
      const { km } = trailSamples(traj, 800);
      const step = (traj.t_s[traj.t_s.length - 1] / 799) * 11.2; // generous: escape speed 11.2 km/s × step
      for (let i = 1; i < km.length; i++) expect(dist(km[i], km[i - 1])).toBeLessThan(step);
      expect(dist(km[0], traj.pos_km[0] as Vec3)).toBeLessThan(1e-6);
    }
  });
});

describe("trail style and label (spec 9, rule 2)", () => {
  it("REAL is solid without label; ILLUSTRATIVE is dashed with its label", () => {
    expect(trailStyle("REAL")).toEqual({ dashed: false, label: false });
    expect(trailStyle("ILLUSTRATIVE")).toEqual({ dashed: true, label: true });
    expect(sample.every((t) => t.mode === "ILLUSTRATIVE")).toBe(true); // D5: illustrative trajectories
  });

  it("the live view shows the ILLUSTRATIVE label while the mode is ILLUSTRATIVE", async () => {
    appStore.getState().selectPlan("haworth_20270309_7d");
    appStore.getState().setMissionPhase("transit");
    render(<LiveView />);
    const label = await screen.findByTestId("illustrative-label");
    expect(label.textContent).toContain("ILLUSTRATIVE");
  });
});
