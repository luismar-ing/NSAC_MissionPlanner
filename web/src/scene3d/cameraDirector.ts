/**
 * Camera director of the live scene (spec 8.3): one continuous camera path Earth → Moon → south pole → site,
 * driven by missionTime (hence by missionPhase), with no cuts. Each phase has its own framing ("anchor"),
 * and the framings are blended with smooth weights around the phase changes, so the camera never jumps.
 * The user can take the camera at any time (drag, wheel, arrow keys): the director stops and the camera
 * orbits the nearest body until "guided camera" is chosen again. With prefers-reduced-motion the director
 * holds a fixed framing per phase (a cut at each phase change, no sweeping motion).
 *
 * Pure maths on world positions in scene units (float64); renderer.ts applies the pose camera-relatively.
 */
import type { MissionTimeline } from "../lib/mission";
import { phaseAt, type PlayPhase } from "../lib/mission";
import type { Vec3 } from "./scale";

export interface Pose {
  position: Vec3;
  target: Vec3;
  up: Vec3;
}

/** Everything the framings need at an instant (scene units, world frame). */
export interface DirectorInput {
  t: number;
  moon: Vec3; // Moon centre
  sunDir: Vec3;
  earthRadius: number; // drawn radii
  moonRadius: number;
  padUpAtLaunch: Vec3; // local vertical of the pad at launch_utc (fixed framing of the launch)
  moonNorth: Vec3; // Moon spin axis (body +Z) in world
  site: Vec3; // landing point on the drawn Moon surface
}

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: Vec3) => Math.sqrt(dot(a, a));
export const unit = (a: Vec3): Vec3 => {
  const n = len(a) || 1;
  return [a[0] / n, a[1] / n, a[2] / n];
};
const lerp = (a: Vec3, b: Vec3, w: number): Vec3 => [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w, a[2] + (b[2] - a[2]) * w];

function smoothstep(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

/** Up vector orthogonal to the view direction, as close as possible to `preferred`. */
function orthoUp(view: Vec3, preferred: Vec3): Vec3 {
  const u = sub(preferred, mul(view, dot(preferred, view)));
  if (len(u) < 1e-6) return orthoUp(view, Math.abs(view[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0]);
  return unit(u);
}

function pose(position: Vec3, target: Vec3, preferredUp: Vec3): Pose {
  return { position, target, up: orthoUp(unit(sub(target, position)), preferredUp) };
}

/** Launch: fixed view of the Earth from above the pad, a little to the side (the rocket climbs and orbits in view). */
export function launchPose(i: DirectorInput): Pose {
  const up = i.padUpAtLaunch;
  const side = unit(cross(up, Math.abs(up[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]));
  const target = mul(up, i.earthRadius * 0.6);
  const position = add(add(target, mul(up, i.earthRadius * 2.2)), mul(side, i.earthRadius * 2.4));
  return pose(position, target, [0, 0, 1]);
}

/**
 * Transit: the whole Earth–Moon line seen from the lunar-north side of the orbit plane, with the Earth on the
 * left and the Moon on the right. The side comes from the Moon's spin axis (within ~7° of its orbit normal),
 * whose sign never changes; a normal built from Moon × Sun would flip at new and full Moon and swap the camera
 * to the other side mid-mission. "Up" lies in the orbit plane, perpendicular to the Earth–Moon line, so it is
 * never parallel to the view (celestial north is, almost, from up here).
 */
export function transitPose(i: DirectorInput): Pose {
  const d = len(i.moon);
  const along = unit(i.moon);
  const n = unit(sub(i.moonNorth, mul(along, dot(i.moonNorth, along)))); // spin axis, made perpendicular to the line
  const target = mul(i.moon, 0.5);
  const position = add(add(target, mul(n, d * 1.15)), mul(along, -d * 0.25));
  return pose(position, target, cross(n, along));
}

/** Rotates `v` about the unit axis `k` by `angle` (Rodrigues). */
function rotateAbout(v: Vec3, k: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c)));
}

/**
 * Landing: closing in on the Moon from the Earth side and swinging round the south pole to just beyond it (the
 * side the site framing looks from, so the camera never crosses over the site looking straight down), while
 * the target slides from the Moon's centre to the site. The up vector is carried round with the swing (rotated
 * about the same axis by the same angle): it stays perpendicular to the view and continuous all the way, even
 * when the camera passes right below the pole, where "lunar north up" would be undefined.
 */
export function landingPose(i: DirectorInput, progress: number): Pose {
  const w = smoothstep(progress);
  const toEarth = unit(mul(i.moon, -1));
  const south = mul(i.moonNorth, -1);
  const end = unit(add(mul(toEarth, -0.45), mul(south, 0.89)));
  const dir = unit(lerp(toEarth, end, w));
  const dist = i.moonRadius * (8 - 5 * w); // 8 → 3 radii from the centre
  const position = add(i.moon, mul(dir, dist));
  const target = lerp(i.moon, i.site, w);
  // swing: rotation about `axis` taking toEarth to dir
  const axis = unit(cross(toEarth, end));
  const swung = Math.atan2(dot(cross(toEarth, dir), axis), dot(toEarth, dir));
  const up0 = orthoUp(mul(toEarth, -1), i.moonNorth); // lunar north up, seen from the Earth side
  return pose(position, target, rotateAbout(up0, axis, swung));
}

/** Site framing at REAL local scale (spec 5.9): metres-scale view from just above the site. */
export const SITE_VIEW_KM = { height: 1.5, back: 5, ahead: 10 } as const;

/**
 * Site: 1.5 km above the ground, 5 km behind the landing point, looking 10 km past it towards the horizon on
 * the Earth's side (the Earth stays low over the horizon at the pole, so it is in view). Scene units = 1000 km.
 */
export function sitePose(i: DirectorInput): Pose {
  const normal = unit(sub(i.site, i.moon));
  const toEarth = unit(mul(i.site, -1)); // the Earth is at the origin
  const horiz = unit(sub(toEarth, mul(normal, dot(toEarth, normal))));
  const k = 1 / 1000; // km → scene units
  const position = add(add(i.site, mul(normal, SITE_VIEW_KM.height * k)), mul(horiz, -SITE_VIEW_KM.back * k));
  const target = add(i.site, mul(horiz, SITE_VIEW_KM.ahead * k));
  return pose(position, target, normal);
}

type Quat = [number, number, number, number]; // [x, y, z, w]

/** Camera orientation (view direction + up) as a quaternion of the basis [right, up, −forward]. */
function poseQuat(p: Pose): Quat {
  const f = unit(sub(p.target, p.position));
  const r = unit(cross(f, p.up));
  const u = cross(r, f);
  // rotation matrix with columns r, u, −f
  const m00 = r[0], m01 = u[0], m02 = -f[0];
  const m10 = r[1], m11 = u[1], m12 = -f[1];
  const m20 = r[2], m21 = u[2], m22 = -f[2];
  const tr = m00 + m11 + m22;
  let q: Quat;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    q = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, 0.25 * s];
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
    q = [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
    q = [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s];
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
    q = [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
  }
  return q;
}

function slerpQ(a: Quat, b: Quat, u: number): Quat {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const bb: Quat = d < 0 ? [-b[0], -b[1], -b[2], -b[3]] : b;
  d = Math.abs(d);
  if (d > 0.9995) {
    const q = a.map((v, i) => v + (bb[i] - v) * u) as Quat;
    const n = Math.hypot(...q);
    return q.map((v) => v / n) as Quat;
  }
  const th = Math.acos(d);
  const s = Math.sin(th);
  return a.map((v, i) => (v * Math.sin((1 - u) * th) + bb[i] * Math.sin(u * th)) / s) as Quat;
}

function rotateQ([x, y, z, w]: Quat, v: Vec3): Vec3 {
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
}

/**
 * Blend of two framings: positions and target distances are interpolated, the orientation (view direction and
 * up together) with a quaternion slerp. Turning the camera as one rigid rotation keeps a constant angular
 * speed; blending the view and the up vectors separately breaks down when the two ups are nearly opposite
 * (their mix almost vanishes and its direction swings within a frame).
 */
export function lerpPose(a: Pose, b: Pose, w: number): Pose {
  if (w <= 0) return a;
  if (w >= 1) return b;
  const position = lerp(a.position, b.position, w);
  const dist = len(sub(a.target, a.position)) * (1 - w) + len(sub(b.target, b.position)) * w;
  const q = slerpQ(poseQuat(a), poseQuat(b), w);
  const forward = mul(rotateQ(q, [0, 0, -1]), 1);
  const up = rotateQ(q, [0, 1, 0]);
  return { position, target: add(position, mul(forward, dist)), up };
}

/** Blend windows around the phase changes (ms): long enough to stay smooth at the fastest playback speed. */
export const WINDOWS = {
  launchToTransit: [-30 * 60_000, 8 * 3_600_000], // around injection
  transitToLanding: [-8 * 3_600_000, 1 * 3_600_000], // around lunar arrival
  approach: [-8 * 3_600_000, 0], // final approach to the site, ending exactly at landing
} as const;

const weight = (t: number, at: number, [a, b]: readonly [number, number]) => smoothstep((t - (at + a)) / (b - a));

/**
 * Final approach: from thousands of km to a few km of the site. The distance to the site is interpolated on a
 * LOG scale (constant relative speed: each frame covers the same fraction of the remaining distance), the
 * direction from the site and the camera orientation turn smoothly (slerp).
 */
export function approachPose(a: Pose, b: Pose, anchor: Vec3, w: number): Pose {
  if (w <= 0) return a;
  if (w >= 1) return b;
  const ra = sub(a.position, anchor);
  const rb = sub(b.position, anchor);
  const da = len(ra);
  const db = len(rb);
  const dir = unit(lerp(unit(ra), unit(rb), w));
  const position = add(anchor, mul(dir, Math.exp(Math.log(da) * (1 - w) + Math.log(db) * w)));
  const ta = len(sub(a.target, a.position));
  const tb = len(sub(b.target, b.position));
  const q = slerpQ(poseQuat(a), poseQuat(b), w);
  const forward = rotateQ(q, [0, 0, -1]);
  return { position, target: add(position, mul(forward, Math.exp(Math.log(ta) * (1 - w) + Math.log(tb) * w))), up: rotateQ(q, [0, 1, 0]) };
}

/** Progress of the final approach (0 before, 1 at landing and after), smoothed. */
export function approachProgress(tl: MissionTimeline, t: number): number {
  return weight(t, tl.landingMs, WINDOWS.approach);
}

/**
 * Local scale λ (0 = space scale, bodies ×6; 1 = real local scale): it changes only in the last stretch of the
 * approach, from ~300 km to ~50 km of the site (approach progress 0.82 → 0.96 on the log path; measured in the
 * browser), so the re-scaling, anchored at the site, only changes the curvature of the ground far below.
 */
export function localBlend(tl: MissionTimeline, t: number): number {
  return smoothstep((approachProgress(tl, t) - 0.82) / 0.14);
}

/** The director's pose at instant `i.t` (continuous in t). */
export function directorPose(tl: MissionTimeline, i: DirectorInput): Pose {
  const t = i.t;
  const lp = Math.min(1, Math.max(0, (t - tl.lunarArrivalMs) / (tl.landingMs - tl.lunarArrivalMs)));
  let p = launchPose(i);
  p = lerpPose(p, transitPose(i), weight(t, tl.injectionMs, WINDOWS.launchToTransit));
  p = lerpPose(p, landingPose(i, lp), weight(t, tl.lunarArrivalMs, WINDOWS.transitToLanding));
  return approachPose(p, sitePose(i), i.site, approachProgress(tl, t));
}

/** Reduced motion: one fixed framing per phase (a cut at each phase change, nothing sweeps). */
export function reducedMotionPose(tl: MissionTimeline, i: DirectorInput): Pose {
  const phase: PlayPhase = phaseAt(tl, i.t);
  if (phase === "launch") return launchPose(i);
  if (phase === "transit") return transitPose(i);
  if (phase === "landing") return landingPose(i, 0.5);
  return sitePose(i);
}

/* ------------------------------------------------------------------ user control (cancel the director) */

export interface ManualOrbit {
  body: "earth" | "moon";
  offset: Vec3; // target relative to the body centre
  yaw: number; // rad, around the body-to-target "up"
  pitch: number; // rad
  dist: number; // camera–target distance
  up: Vec3;
}

export class CameraController {
  mode: "director" | "manual" = "director";
  orbit: ManualOrbit | null = null;

  /** The user takes the camera: start orbiting the nearest body from the current pose (no jump). */
  cancel(current: Pose, earth: Vec3, moon: Vec3): void {
    if (this.mode === "manual") return;
    const body = len(sub(current.target, moon)) < len(sub(current.target, earth)) ? "moon" : "earth";
    const center = body === "moon" ? moon : earth;
    const rel = sub(current.position, current.target);
    const dist = len(rel);
    const up = current.up;
    const fwd0 = unit(orthoAny(up));
    const right0 = cross(fwd0, up);
    const r = unit(rel);
    this.orbit = {
      body,
      offset: sub(current.target, center),
      yaw: Math.atan2(dot(r, right0), dot(r, fwd0)),
      pitch: Math.asin(Math.max(-1, Math.min(1, dot(r, up)))),
      dist,
      up,
    };
    this.mode = "manual";
  }

  /** Back to the guided camera. */
  resume(): void {
    this.mode = "director";
    this.orbit = null;
  }

  /** Drag / keys: rotate; wheel: zoom (factor > 1 moves away). */
  rotate(dYaw: number, dPitch: number): void {
    if (!this.orbit) return;
    this.orbit.yaw += dYaw;
    this.orbit.pitch = Math.max(-1.45, Math.min(1.45, this.orbit.pitch + dPitch));
  }

  zoom(factor: number, minDist: number): void {
    if (!this.orbit) return;
    this.orbit.dist = Math.max(minDist, this.orbit.dist * factor);
  }

  /** Pose of the manual camera, following its body as it moves. */
  manualPose(earth: Vec3, moon: Vec3): Pose | null {
    const o = this.orbit;
    if (!o) return null;
    const target = add(o.body === "moon" ? moon : earth, o.offset);
    const fwd0 = unit(orthoAny(o.up));
    const right0 = cross(fwd0, o.up);
    const dir = add(mul(add(mul(fwd0, Math.cos(o.yaw)), mul(right0, Math.sin(o.yaw))), Math.cos(o.pitch)), mul(o.up, Math.sin(o.pitch)));
    return pose(add(target, mul(dir, o.dist)), target, o.up);
  }
}

/** A unit vector orthogonal to `v` (deterministic). */
function orthoAny(v: Vec3): Vec3 {
  return unit(cross(v, Math.abs(v[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]));
}
