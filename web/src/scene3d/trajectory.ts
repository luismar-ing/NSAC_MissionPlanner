/**
 * The plan's trajectory in the scene (spec 8.2, contract §11): position of the rocket at any instant and the
 * trail. Samples are uneven (100 s in the ascent, 412.5 s in the parking orbit, denser after injection, 180 s
 * in the last hour), so positions use a cubic Hermite curve with Catmull-Rom tangents for uneven spacing:
 * exact at every sample, smooth in between. (A straight line between parking-orbit samples, 28° apart, would
 * cut ~195 km inside the orbit; the cubic stays on it, see tests/trajectory.test.ts.)
 *
 * Trail style (spec 9, rule 2): solid when the trajectory is REAL, dashed when it is ILLUSTRATIVE.
 */
import type { Trajectory } from "../lib/contract";
import { parseInstant } from "../lib/contract";
import type { Vec3 } from "./scale";
import { conjugate, rotate, sceneStateAt, type EphemerisIndex } from "./ephemeris";

function index(traj: Trajectory, s: number): number {
  // last k with t_s[k] <= s (binary search), kept in [0, n − 2]
  const t = traj.t_s;
  let lo = 0;
  let hi = t.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (t[mid] <= s) lo = mid;
    else hi = mid;
  }
  return Math.min(lo, t.length - 2);
}

function tangent(traj: Trajectory, k: number, c: number): number {
  const t = traj.t_s;
  const p = traj.pos_km;
  const n = t.length;
  const a = Math.max(0, k - 1);
  const b = Math.min(n - 1, k + 1);
  return (p[b][c] - p[a][c]) / (t[b] - t[a]); // km/s
}

/** Rocket position (km, J2000, Earth-centred) at `tMs`; clamped to the first / last sample outside the flight. */
export function trajectoryPositionKm(traj: Trajectory, tMs: number): Vec3 {
  const t = traj.t_s;
  const s = Math.min(t[t.length - 1], Math.max(0, (tMs - parseInstant(traj.t0_utc)) / 1000));
  const k = index(traj, s);
  const h = t[k + 1] - t[k];
  const u = (s - t[k]) / h;
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;
  const p0 = traj.pos_km[k];
  const p1 = traj.pos_km[k + 1];
  return [0, 1, 2].map((c) => h00 * p0[c] + h10 * h * tangent(traj, k, c) + h01 * p1[c] + h11 * h * tangent(traj, k + 1, c)) as Vec3;
}

/** Dense resample of the trajectory for drawing the trail: `n` instants evenly spaced in time. */
export function trailSamples(traj: Trajectory, n = 800): { tMs: number[]; km: Vec3[] } {
  const t0 = parseInstant(traj.t0_utc);
  const end = traj.t_s[traj.t_s.length - 1];
  const tMs: number[] = [];
  const km: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    const t = t0 + ((end * i) / (n - 1)) * 1000;
    tMs.push(t);
    km.push(trajectoryPositionKm(traj, t));
  }
  return { tMs, km };
}

export interface TrailStyle {
  dashed: boolean;
  label: boolean; // show the ILLUSTRATIVE label
}

/** Spec 9 / rule 2: REAL → solid trail; ILLUSTRATIVE → dashed trail with its label. */
export function trailStyle(mode: Trajectory["mode"]): TrailStyle {
  return mode === "REAL" ? { dashed: false, label: false } : { dashed: true, label: true };
}

/* ------------------------------------------------------------------ the site after landing */


/**
 * Landing point in the Moon-fixed frame (MOON_ME, km from the Moon centre), from the trajectory's last point
 * and the Moon at landing_utc. After landing the rocket stays there and moves with the Moon (translation and
 * rotation), instead of staying at a fixed point in space while the Moon moves on (~3 600 km/h).
 */
export function siteBodyFixedKm(traj: Trajectory, ix: EphemerisIndex): Vec3 {
  const s = sceneStateAt(ix, parseInstant(traj.phases.landing_utc));
  const last = traj.pos_km[traj.pos_km.length - 1];
  const rel: Vec3 = [last[0] - s.moonKm[0], last[1] - s.moonKm[1], last[2] - s.moonKm[2]];
  return rotate(conjugate(s.moonQuat), rel);
}

/** Site position (km, J2000, Earth-centred) at the state's instant. */
export function sitePositionKm(siteBody: Vec3, moonKm: Vec3, moonQuat: [number, number, number, number]): Vec3 {
  const r = rotate(moonQuat, siteBody);
  return [moonKm[0] + r[0], moonKm[1] + r[1], moonKm[2] + r[2]];
}
