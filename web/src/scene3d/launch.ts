/**
 * Illustrative launch (spec 5.8, 8.2; D8: minimal launch). ILLUSTRATIVE, not a real launch:
 *
 * - The pad is the same generic one as the pipeline's trajectory (pipeline/trajectory.py: latitude 0°,
 *   longitude 0°, on the equatorial radius), NOT a real spaceport. It turns with the Earth (IAU_EARTH).
 * - Before launch there is a short countdown with the rocket standing on the pad (PRELAUNCH_MS).
 * - The ascent itself is the first part of the trajectory file (radial climb to the parking orbit in the first
 *   ASCENT_MS), so the launch hands over to the trajectory with no jump: at launch_utc the pad IS the first
 *   trajectory point (checked by tests/launch.test.ts).
 */
import type { Trajectory } from "../lib/contract";
import { PRELAUNCH_MS } from "../lib/mission";
import { parseInstant } from "../lib/contract";
import { rotate, type Quat } from "./ephemeris";
import { trajectoryPositionKm } from "./trajectory";
import type { Vec3 } from "./scale";

/** Same generic pad and radius as pipeline/trajectory.py (PAD_LAT_DEG = PAD_LON_DEG = 0, R_EARTH_KM). */
export const PAD = { latDeg: 0, lonDeg: 0, radiusKm: 6378.137 } as const;
export { PRELAUNCH_MS };
/** Duration of the radial ascent in the trajectory file (pipeline ASCENT_MIN = 10). */
export const ASCENT_MS = 10 * 60_000;

/** Pad position (km, J2000, Earth-centred) for the Earth orientation `earthQuat` (IAU_EARTH → J2000). */
export function padPositionKm(earthQuat: Quat): Vec3 {
  const lat = (PAD.latDeg * Math.PI) / 180;
  const lon = (PAD.lonDeg * Math.PI) / 180;
  const body: Vec3 = [PAD.radiusKm * Math.cos(lat) * Math.cos(lon), PAD.radiusKm * Math.cos(lat) * Math.sin(lon), PAD.radiusKm * Math.sin(lat)];
  return rotate(earthQuat, body);
}

/** Local vertical at the pad (unit vector). */
export function padUp(earthQuat: Quat): Vec3 {
  const p = padPositionKm(earthQuat);
  const n = Math.hypot(...p);
  return [p[0] / n, p[1] / n, p[2] / n];
}

export type LaunchStage = "countdown" | "ascent" | "flight";

/** Stage of the launch at an instant: countdown on the pad, ascent (plume on), then the trajectory flight. */
export function launchStage(traj: Trajectory, tMs: number): LaunchStage {
  const launch = parseInstant(traj.phases.launch_utc);
  if (tMs < launch) return "countdown";
  if (tMs < launch + ASCENT_MS) return "ascent";
  return "flight";
}

/** Exhaust plume intensity 0–1: on during the ascent, ignition ramp in the last seconds of the countdown. */
export function plumeIntensity(traj: Trajectory, tMs: number): number {
  const launch = parseInstant(traj.phases.launch_utc);
  const dt = tMs - launch;
  if (dt < -10_000 || dt > ASCENT_MS) return 0;
  if (dt < 0) return (dt + 10_000) / 10_000; // ignition in the last 10 s
  return 1 - 0.5 * (dt / ASCENT_MS); // fading as it climbs
}

/**
 * Rocket position (km) at any instant of the mission: on the pad (turning with the Earth) before launch_utc,
 * then the trajectory, interpolated with the cubic of trajectory.ts (T4.2.c), up to the landing point.
 */
export function launchPositionKm(traj: Trajectory, earthQuat: Quat, tMs: number): Vec3 {
  if (tMs <= parseInstant(traj.phases.launch_utc)) return padPositionKm(earthQuat);
  return trajectoryPositionKm(traj, tMs);
}
