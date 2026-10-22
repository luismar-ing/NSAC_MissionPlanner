/**
 * Scene ephemeris at any instant (contract §10): scene/ephemeris.json holds hourly geometric states in J2000,
 * Earth-centred. Interpolation as the contract requires (T2.1.b): Moon position with cubic Catmull-Rom
 * (samples k−1 … k+2; linear would err by ~5 km mid-hour), rotations with slerp, the Sun direction linearly
 * and renormalised. Pure maths, no three.js, so it is testable against the data directly.
 */
import type { SceneEphemeris } from "../lib/contract";
import { parseInstant } from "../lib/contract";
import type { Vec3 } from "./scale";

export type Quat = [number, number, number, number]; // [x, y, z, w], the order of the data and of three.js

export interface SceneState {
  tMs: number;
  moonKm: Vec3; // Moon centre relative to the Earth centre, J2000, km
  sunDir: Vec3; // unit vector Earth → Sun, J2000
  moonQuat: Quat; // MOON_ME → J2000
  earthQuat: Quat; // IAU_EARTH → J2000
}

export interface EphemerisIndex {
  eph: SceneEphemeris;
  startMs: number;
  stepMs: number;
}

export function indexEphemeris(eph: SceneEphemeris): EphemerisIndex {
  return { eph, startMs: parseInstant(eph.start_utc), stepMs: eph.step_min * 60_000 };
}

/** Time range covered (the last sample included). */
export function ephemerisRange(ix: EphemerisIndex): [number, number] {
  return [ix.startMs, ix.startMs + (ix.eph.n - 1) * ix.stepMs];
}

export function catmullRom(p0: number, p1: number, p2: number, p3: number, u: number): number {
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
}

export function slerp(a: Quat, b: Quat, u: number): Quat {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const bb: Quat = d < 0 ? [-b[0], -b[1], -b[2], -b[3]] : b; // shortest arc (the data has no sign flips anyway)
  d = Math.abs(d);
  if (d > 0.9995) {
    // nearly identical: normalised lerp
    const q = a.map((v, i) => v + (bb[i] - v) * u) as Quat;
    const n = Math.hypot(...q);
    return q.map((v) => v / n) as Quat;
  }
  const th = Math.acos(d);
  const s = Math.sin(th);
  const wa = Math.sin((1 - u) * th) / s;
  const wb = Math.sin(u * th) / s;
  return a.map((v, i) => v * wa + bb[i] * wb) as Quat;
}

/** State at instant `tMs` (clamped to the covered range). */
export function sceneStateAt(ix: EphemerisIndex, tMs: number): SceneState {
  const { eph } = ix;
  const n = eph.n;
  const f = Math.min(n - 1, Math.max(0, (tMs - ix.startMs) / ix.stepMs));
  const k = Math.min(n - 2, Math.floor(f));
  const u = f - k;
  const at = (i: number) => Math.min(n - 1, Math.max(0, i));
  const [m0, m1, m2, m3] = [k - 1, k, k + 1, k + 2].map((i) => eph.moon_pos_km[at(i)]);
  const moonKm = [0, 1, 2].map((c) => catmullRom(m0[c], m1[c], m2[c], m3[c], u)) as Vec3;
  const s = [0, 1, 2].map((c) => eph.sun_dir[k][c] + (eph.sun_dir[k + 1][c] - eph.sun_dir[k][c]) * u) as Vec3;
  const sn = Math.hypot(...s);
  return {
    tMs: ix.startMs + f * ix.stepMs,
    moonKm,
    sunDir: s.map((v) => v / sn) as Vec3,
    moonQuat: slerp(eph.moon_quat[k] as Quat, eph.moon_quat[k + 1] as Quat, u),
    earthQuat: slerp(eph.earth_quat[k] as Quat, eph.earth_quat[k + 1] as Quat, u),
  };
}

/** Rotates vector `v` by quaternion `q` ([x,y,z,w]): q · v · q⁻¹. */
export function rotate(q: Quat, v: Vec3): Vec3 {
  const [x, y, z, w] = q;
  const [vx, vy, vz] = v;
  // t = 2 · (q.xyz × v)
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx)];
}

export function conjugate([x, y, z, w]: Quat): Quat {
  return [-x, -y, -z, w];
}

/** Longitude / latitude (deg) of a direction given in a body-fixed frame (X = lon 0, Z = north). */
export function lonLat([x, y, z]: Vec3): [number, number] {
  return [(Math.atan2(y, x) * 180) / Math.PI, (Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI];
}
