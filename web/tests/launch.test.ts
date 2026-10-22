/** T4.2.b: illustrative launch — the pad hands over to the trajectory with no jump; near-body mapping. */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { SceneEphemeris, Trajectory } from "../src/lib/contract";
import { parseInstant } from "../src/lib/contract";
import { indexEphemeris, sceneStateAt } from "../src/scene3d/ephemeris";
import { ASCENT_MS, launchPositionKm, launchStage, PAD, padPositionKm, plumeIntensity, PRELAUNCH_MS } from "../src/scene3d/launch";
import { angleBetween, CUTOFF_RADII, EARTH_RADII_KM, exaggerateNear, pointToScene, SPACE_SCALE, type Vec3 } from "../src/scene3d/scale";

const DATA = join(__dirname, "..", "public", "data");
const eph = JSON.parse(readFileSync(join(DATA, "scene", "ephemeris.json"), "utf-8")) as SceneEphemeris;
const ix = indexEphemeris(eph);
const allTraj = readdirSync(join(DATA, "trajectory")).filter((f) => f.endsWith(".json"));
const load = (f: string) => JSON.parse(readFileSync(join(DATA, "trajectory", f), "utf-8")) as Trajectory;
// a spread of plans: every site, dates through the year
const sample = allTraj.filter((_, i) => i % 61 === 0).map(load);
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe("continuity: the last point of the launch is the first point of the trajectory", () => {
  it("at launch_utc the pad is the trajectory's first point (sample of plans, every site)", () => {
    let worst = 0;
    for (const traj of sample) {
      const t = parseInstant(traj.phases.launch_utc);
      const pad = padPositionKm(sceneStateAt(ix, t).earthQuat);
      worst = Math.max(worst, dist(pad, traj.pos_km[0] as Vec3), dist(launchPositionKm(traj, sceneStateAt(ix, t).earthQuat, t), traj.pos_km[0] as Vec3));
    }
    console.log(`launch: ${sample.length} plans, max |pad(launch_utc) − trajectory[0]| = ${(worst * 1000).toFixed(1)} m`);
    expect(sample.length).toBeGreaterThan(25);
    expect(new Set(sample.map((t) => t.site_id)).size).toBe(5);
    expect(worst).toBeLessThan(1); // < 1 km
  });

  it("then follows the trajectory samples exactly, and ends at its last point", () => {
    const traj = sample[3];
    const t0 = parseInstant(traj.t0_utc);
    const q = sceneStateAt(ix, t0).earthQuat;
    for (const k of [1, 2, 5, 40, traj.t_s.length - 1]) {
      expect(dist(launchPositionKm(traj, q, t0 + traj.t_s[k] * 1000), traj.pos_km[k] as Vec3)).toBeLessThan(1e-6);
    }
    expect(dist(launchPositionKm(traj, q, t0 + 1e12), traj.pos_km[traj.pos_km.length - 1] as Vec3)).toBeLessThan(1e-6);
  });

  it("during the countdown the rocket stands on the pad, which turns with the Earth", () => {
    const traj = sample[0];
    const launch = parseInstant(traj.phases.launch_utc);
    const before = sceneStateAt(ix, launch - PRELAUNCH_MS).earthQuat;
    const p0 = launchPositionKm(traj, before, launch - PRELAUNCH_MS);
    const p1 = padPositionKm(sceneStateAt(ix, launch).earthQuat);
    expect(Math.hypot(...p0)).toBeCloseTo(PAD.radiusKm, 3); // within 1 m (interpolated rotation)
    // 5 minutes of Earth rotation at the equator ≈ 2π·6378 km / 1436 min · 5 ≈ 139.5 km
    expect(dist(p0, p1)).toBeGreaterThan(130);
    expect(dist(p0, p1)).toBeLessThan(150);
  });

  it("stages and plume: countdown, ignition in the last 10 s, ascent, then flight", () => {
    const traj = sample[0];
    const launch = parseInstant(traj.phases.launch_utc);
    expect(launchStage(traj, launch - 1)).toBe("countdown");
    expect(launchStage(traj, launch)).toBe("ascent");
    expect(launchStage(traj, launch + ASCENT_MS)).toBe("flight");
    expect(plumeIntensity(traj, launch - 60_000)).toBe(0);
    expect(plumeIntensity(traj, launch - 5_000)).toBeCloseTo(0.5, 9);
    expect(plumeIntensity(traj, launch)).toBe(1);
    expect(plumeIntensity(traj, launch + ASCENT_MS + 1)).toBe(0);
  });
});

describe("near-body mapping (bodies drawn 6× larger)", () => {
  const R = EARTH_RADII_KM.equatorial / 1000;
  it("puts the true surface on the drawn surface and keeps the direction from the centre", () => {
    const pad = padPositionKm(sceneStateAt(ix, ix.startMs).earthQuat);
    const m = eph.moon_pos_km[0] as Vec3;
    const p = pointToScene(pad, m, SPACE_SCALE);
    expect(Math.hypot(...p)).toBeCloseTo(R * SPACE_SCALE.bodyExaggeration * (PAD.radiusKm / EARTH_RADII_KM.equatorial), 4); // within ~50 m on a 38-unit sphere
    expect(angleBetween(p, pad)).toBeLessThan(1e-12);
  });
  it("is monotonic along a radius and the identity beyond the cut-off", () => {
    let prev = 0;
    for (let r = R; r < CUTOFF_RADII * R * 1.2; r += R / 20) {
      const r2 = Math.hypot(...exaggerateNear([r, 0, 0], [0, 0, 0], R, 6));
      expect(r2).toBeGreaterThan(prev);
      prev = r2;
    }
    expect(exaggerateNear([CUTOFF_RADII * R, 0, 0], [0, 0, 0], R, 6)).toEqual([CUTOFF_RADII * R, 0, 0]);
    expect(exaggerateNear([2 * R, 1, 0], [0, 0, 0], R, 1)).toEqual([2 * R, 1, 0]); // real scale: identity
  });
});
