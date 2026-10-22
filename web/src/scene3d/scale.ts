/**
 * Scale mode of the 3D scene (spec 5.9, decision D8).
 *
 * - Distances: one scene unit = 1000 km, applied UNIFORMLY to every position (a similarity transform), so
 *   every angle survives exactly: the Sun direction, the Moon's phase and the orientations are those of the
 *   data. Only lengths change.
 * - Body sizes: the Earth and the Moon are drawn `bodyExaggeration` times larger than their true radii
 *   (fixed factor, D8), otherwise at Earth–Moon distance they would be a few pixels. The final zoom to the
 *   site switches to the real local scale (`bodyExaggeration = 1`, T4.3.b).
 * - Precision: positions are kept in float64 (JS numbers) in world units and rendered RELATIVE TO THE CAMERA
 *   (`RelativeOrigin`): what reaches the GPU in float32 is the small offset from the camera, never a large
 *   absolute coordinate. Together with the logarithmic depth buffer (renderer.ts) this avoids jitter and
 *   depth fighting across the ~1e-6 to ~1e6 unit range (metres at the site to Earth–Moon distance).
 */

/** Radii from the NAIF PCK `pck00011.tpc` (BODY399_RADII, BODY301_RADII), in km. */
export const EARTH_RADII_KM = { equatorial: 6378.1366, polar: 6356.7519 } as const;
export const MOON_RADIUS_KM = 1737.4; // same sphere as the LOLA DEM (pipeline/dem.py)

export const KM_PER_UNIT = 1000;

export interface ScaleMode {
  kmPerUnit: number;
  bodyExaggeration: number; // radius factor for the Earth and the Moon (1 = true size)
}

/** D8: Earth and Moon drawn 6× larger, distances to scale. */
export const SPACE_SCALE: ScaleMode = { kmPerUnit: KM_PER_UNIT, bodyExaggeration: 6 };
/** Final zoom to the site: everything at its real size (spec 5.9). */
export const LOCAL_SCALE: ScaleMode = { kmPerUnit: KM_PER_UNIT, bodyExaggeration: 1 };

export type Vec3 = [number, number, number];

/** Position in km (scene frame) → scene units. Uniform, so directions and angles are unchanged. */
export function toScene([x, y, z]: Vec3, mode: ScaleMode = SPACE_SCALE): Vec3 {
  const k = 1 / mode.kmPerUnit;
  return [x * k, y * k, z * k];
}

/** Drawn radius of a body in scene units. */
export function bodyRadius(radiusKm: number, mode: ScaleMode = SPACE_SCALE): number {
  return (radiusKm * mode.bodyExaggeration) / mode.kmPerUnit;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec3) => Math.sqrt(dot(a, a));

/** Angle (rad) between two vectors, robust near 0 and π (atan2 of |a×b| and a·b). */
export function angleBetween(a: Vec3, b: Vec3): number {
  const c: Vec3 = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  return Math.atan2(norm(c), dot(a, b));
}

/**
 * Sun–Moon–Earth angle (the Moon's phase angle as seen from the Earth's centre): angle at the Moon between
 * the direction to the Sun and the direction to the Earth. The Sun is a direction (`sunDir`, parallel rays).
 */
export function phaseAngle(moonPos: Vec3, sunDir: Vec3): number {
  return angleBetween(sunDir, sub([0, 0, 0], moonPos));
}

/**
 * Floating origin for camera-relative rendering. World positions stay in float64; each frame the camera's
 * world position becomes the origin and objects are placed at `world − origin`, so the GPU only sees small
 * numbers near the camera.
 */
export class RelativeOrigin {
  origin: Vec3 = [0, 0, 0];

  setOrigin(p: Vec3): void {
    this.origin = [p[0], p[1], p[2]];
  }

  /** Render-space position (relative to the camera) of a world position. */
  relative(world: Vec3): Vec3 {
    return sub(world, this.origin);
  }
}

/** Short text for the scale indicator (ScaleIndicator.tsx). */
export function scaleSummary(mode: ScaleMode): { exaggerated: boolean; factor: number } {
  return { exaggerated: mode.bodyExaggeration !== 1, factor: mode.bodyExaggeration };
}
