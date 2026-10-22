/**
 * T4.3.a: camera director. Over the whole mission, sampled frame by frame at playback speed, the camera never
 * jumps (view direction, up vector and position change per frame stay under thresholds); taking the camera
 * hands control to the user without a jump, and "guided camera" gives it back.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Plan, SceneEphemeris, Trajectory } from "../src/lib/contract";
import { parseInstant } from "../src/lib/contract";
import { timelineOf, type MissionTimeline } from "../src/lib/mission";
import { CameraController, directorPose, reducedMotionPose, sitePose, type DirectorInput, type Pose } from "../src/scene3d/cameraDirector";
import { indexEphemeris, rotate, sceneStateAt } from "../src/scene3d/ephemeris";
import { padUp } from "../src/scene3d/launch";
import { bodyRadius, EARTH_RADII_KM, MOON_RADIUS_KM, pointToScene, toScene, type Vec3 } from "../src/scene3d/scale";
import { siteBodyFixedKm, sitePositionKm } from "../src/scene3d/trajectory";

const DATA = join(__dirname, "..", "public", "data");
const eph = JSON.parse(readFileSync(join(DATA, "scene", "ephemeris.json"), "utf-8")) as SceneEphemeris;
const ix = indexEphemeris(eph);
const plans = JSON.parse(readFileSync(join(DATA, "plans.json"), "utf-8")) as { plans: Plan[] } | Plan[];
const planList = Array.isArray(plans) ? plans : plans.plans;

function setup(planId: string) {
  const plan = planList.find((p) => p.id === planId)!;
  const traj = JSON.parse(readFileSync(join(DATA, "trajectory", `${plan.trajectory_id}.json`), "utf-8")) as Trajectory;
  const tl = timelineOf(plan, traj);
  const padUpAtLaunch = padUp(sceneStateAt(ix, parseInstant(traj.phases.launch_utc)).earthQuat);
  const siteBody = siteBodyFixedKm(traj, ix);
  const input = (t: number): DirectorInput => {
    const s = sceneStateAt(ix, t);
    return {
      t,
      moon: toScene(s.moonKm),
      sunDir: s.sunDir,
      earthRadius: bodyRadius(EARTH_RADII_KM.equatorial),
      moonRadius: bodyRadius(MOON_RADIUS_KM),
      padUpAtLaunch,
      moonNorth: rotate(s.moonQuat, [0, 0, 1]),
      site: pointToScene(sitePositionKm(siteBody, s.moonKm, s.moonQuat), s.moonKm),
    };
  };
  return { plan, traj, tl, input };
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: Vec3) => Math.hypot(...a);
const angle = (a: Vec3, b: Vec3) => {
  const c = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (len(a) * len(b));
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
};
const view = (p: Pose) => sub(p.target, p.position);

function jumps(tl: MissionTimeline, input: (t: number) => DirectorInput, stepMs: number) {
  let maxDir = 0;
  let maxUp = 0;
  let maxRel = 0;
  let atDir = 0;
  let atUp = 0;
  let prev = directorPose(tl, input(tl.startMs));
  for (let t = tl.startMs + stepMs; t <= tl.endMs; t += stepMs) {
    const p = directorPose(tl, input(t));
    const d = angle(view(prev), view(p));
    const u = angle(prev.up, p.up);
    if (d > maxDir) [maxDir, atDir] = [d, t];
    if (u > maxUp) [maxUp, atUp] = [u, t];
    maxRel = Math.max(maxRel, len(sub(p.position, prev.position)) / len(view(prev)));
    prev = p;
  }
  // where the worst frames are, in hours from launch (for diagnosis)
  const h = (t: number) => ((t - tl.launchMs) / 3_600_000).toFixed(1);
  return { maxDir, maxUp, maxRel, where: `view worst at T+${h(atDir)} h, up worst at T+${h(atUp)} h (injection T+${h(tl.injectionMs)}, lunar arrival T+${h(tl.lunarArrivalMs)}, landing T+${h(tl.landingMs)})` };
}

describe("camera director: continuous path, no jumps between frames", () => {
  for (const planId of ["haworth_20270309_7d", "connecting_ridge_20270102_7d", "malapert_massif_20271015_14d"]) {
    it(`${planId}: at 6 h/s (6 min of mission per frame at 60 fps) and at 1 h/s`, () => {
      const { tl, input } = setup(planId);
      const fast = jumps(tl, input, 6 * 60_000);
      const slow = jumps(tl, input, 60_000);
      console.log(
        `camera ${planId}: per frame at 6 h/s → view ${fast.maxDir.toFixed(2)}°, up ${fast.maxUp.toFixed(2)}°, move ${(fast.maxRel * 100).toFixed(1)} % of the distance; at 1 h/s → ${slow.maxDir.toFixed(2)}°, ${slow.maxUp.toFixed(2)}°, ${(slow.maxRel * 100).toFixed(1)} % · ${fast.where}`,
      );
      expect(fast.maxDir).toBeLessThan(6);
      expect(fast.maxUp).toBeLessThan(6);
      expect(fast.maxRel).toBeLessThan(0.2);
      expect(slow.maxDir).toBeLessThan(1.5);
    });
  }

  it("no jumps across the year either: 25 plans, every site, at 6 h/s", () => {
    const ids = planList.filter((p) => p.window_days === 7).filter((_, i) => i % 73 === 0).map((p) => p.id);
    let worst = { dir: 0, up: 0, rel: 0 };
    for (const id of ids) {
      const { tl, input } = setup(id);
      const j = jumps(tl, input, 6 * 60_000);
      if (j.maxUp > 6 || j.maxDir > 6) console.log(`camera ${id}: view ${j.maxDir.toFixed(2)}°, up ${j.maxUp.toFixed(2)}° · ${j.where}`);
      worst = { dir: Math.max(worst.dir, j.maxDir), up: Math.max(worst.up, j.maxUp), rel: Math.max(worst.rel, j.maxRel) };
    }
    console.log(`camera, ${ids.length} plans at 6 h/s: worst view ${worst.dir.toFixed(2)}°, up ${worst.up.toFixed(2)}°, move ${(worst.rel * 100).toFixed(1)} %`);
    expect(ids.length).toBeGreaterThanOrEqual(25);
    expect(new Set(ids.map((id) => id.replace(/_\d{8}_\d+d$/, ""))).size).toBe(5);
    expect(worst.dir).toBeLessThan(6);
    expect(worst.up).toBeLessThan(6);
    expect(worst.rel).toBeLessThan(0.2);
  });

  it("ends at the site framing exactly at landing, after travelling Earth → Moon", () => {
    const { tl, input } = setup("haworth_20270309_7d");
    const atLanding = directorPose(tl, input(tl.landingMs));
    const site = sitePose(input(tl.landingMs));
    expect(len(sub(atLanding.position, site.position))).toBeLessThan(1e-9);
    const start = directorPose(tl, input(tl.startMs));
    expect(len(start.target)).toBeLessThan(bodyRadius(EARTH_RADII_KM.equatorial)); // looks at the Earth at launch
    expect(len(sub(atLanding.target, input(tl.landingMs).site))).toBeLessThan(1e-9); // looks at the site at the end
  });
});

describe("reduced motion", () => {
  it("holds one framing per phase: static within a phase apart from the bodies' own motion", () => {
    const { tl, input } = setup("haworth_20270309_7d");
    const a = reducedMotionPose(tl, input(tl.startMs));
    const b = reducedMotionPose(tl, input(tl.injectionMs - 60_000));
    expect(len(sub(a.position, b.position))).toBeLessThan(1e-9); // launch framing does not move at all
    const c = reducedMotionPose(tl, input(tl.injectionMs + 60_000));
    expect(len(sub(a.position, c.position))).toBeGreaterThan(10); // cut at the phase change instead of a sweep
  });
});

describe("user take-over (cancel) and guided camera", () => {
  it("cancelling keeps the current pose, then the user orbits the nearest body; resume returns to the director", () => {
    const { tl, input } = setup("haworth_20270309_7d");
    const t = tl.lunarArrivalMs + 3 * 3_600_000; // approaching the Moon
    const i = input(t);
    const current = directorPose(tl, i);
    const c = new CameraController();
    c.cancel(current, [0, 0, 0], i.moon);
    expect(c.mode).toBe("manual");
    expect(c.orbit?.body).toBe("moon");
    const same = c.manualPose([0, 0, 0], i.moon)!;
    expect(len(sub(same.position, current.position))).toBeLessThan(1e-6); // no jump when taking over
    expect(len(sub(same.target, current.target))).toBeLessThan(1e-9);
    c.rotate(0.3, 0.1);
    c.zoom(2, 0.1);
    const moved = c.manualPose([0, 0, 0], i.moon)!;
    expect(len(sub(moved.position, current.position))).toBeGreaterThan(1);
    expect(len(sub(moved.position, moved.target))).toBeCloseTo(2 * len(view(current)), 6);
    // the manual camera follows the Moon as time goes on
    const later = input(t + 3_600_000);
    const follow = c.manualPose([0, 0, 0], later.moon)!;
    expect(len(sub(sub(follow.target, later.moon), sub(moved.target, i.moon)))).toBeLessThan(1e-9);
    c.resume();
    expect(c.mode).toBe("director");
    expect(c.manualPose([0, 0, 0], i.moon)).toBeNull();
  });
});
