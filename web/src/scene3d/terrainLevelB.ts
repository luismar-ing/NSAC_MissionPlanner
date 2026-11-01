/**
 * Level B terrain (spec 8.4, T6.1): standing on the site at the observer height h_obs, the 3D ground is the
 * terrain the scene already draws (terrain.ts: lod2 ±3 km / 40 m, lod1 ±10 km / 80 m, lod0 ±20 km / 400 m, then
 * the polar context ±302 km / 2 km). This module holds the pure geometry of that view (no drawing):
 *
 * - `meshHorizonDeg`: the skyline those meshes make, seen from h_obs, by azimuth. Checked against the 2D
 *   horizon mask (spec 5.2, computed from the full-resolution DEM) so the 3D outline and the panorama agree.
 * - `surfaceLook`: the first-person camera at h_obs looking at an azimuth / elevation (ENU of the site).
 *
 * Site levels are ENU_SITE grids (azimuthal equidistant; height = the site's Up coordinate, curvature included:
 * contract §13), so a node's elevation angle is simply atan2(h − h_obs, distance).
 */
import { rotate, type Quat, type SceneState } from "./ephemeris";
import { enuBasis, type TerrainData } from "./terrain";
import { MOON_RADIUS_KM, type Vec3 } from "./scale";

const R_M = MOON_RADIUS_KM * 1000;
const DEG = Math.PI / 180;

/** Bilinear height (m, relative to the level's origin elevation) at grid coordinates (m), or null outside. */
export function sampleHeight(t: TerrainData, x: number, y: number): number | null {
  const { nx, ny, spacing_m, x0_m, y0_m } = t.header.grid;
  const fi = (x - x0_m) / spacing_m;
  const fj = (y0_m - y) / spacing_m;
  if (fi < 0 || fj < 0 || fi > nx - 1 || fj > ny - 1) return null;
  const i = Math.min(nx - 2, Math.floor(fi));
  const j = Math.min(ny - 2, Math.floor(fj));
  const u = fi - i;
  const v = fj - j;
  const h = t.heights;
  const a = h[j * nx + i];
  const b = h[j * nx + i + 1];
  const c = h[(j + 1) * nx + i];
  const d = h[(j + 1) * nx + i + 1];
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

export interface SurfaceTerrain {
  /** Site levels, finest first (lod2, lod1, lod0); missing levels are skipped. */
  levels: TerrainData[];
  /** Polar context (POLAR_STEREO), for what lies beyond the site levels. */
  polar: TerrainData | null;
  /** Site latitude / longitude (deg) and elevation (m), from the site levels' origin. */
  site: { lat: number; lon: number; elevation_m: number };
}

/** South polar stereographic coordinates (m) of the point at geodesic distance d (m), azimuth az (rad) from the site. */
function polarXY(site: SurfaceTerrain["site"], d: number, az: number): [number, number] {
  const la = site.lat * DEG;
  const lo = site.lon * DEG;
  const up: Vec3 = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
  const east: Vec3 = [-Math.sin(lo), Math.cos(lo), 0];
  const north: Vec3 = [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)];
  const g = d / R_M;
  const p = [0, 1, 2].map((k) => Math.cos(g) * up[k] + Math.sin(g) * (Math.sin(az) * east[k] + Math.cos(az) * north[k]));
  const lat = Math.asin(p[2]);
  const lon = Math.atan2(p[1], p[0]);
  const rho = 2 * R_M * Math.tan((Math.PI / 2 + lat) / 2); // colatitude from the south pole
  return [rho * Math.sin(lon), rho * Math.cos(lon)];
}

/** Step along the ray (m): finer near the observer, where the finest levels are. */
const stepAt = (d: number) => (d < 3_000 ? 20 : d < 10_000 ? 40 : d < 20_000 ? 200 : 1_000);

/**
 * Highest elevation angle (deg) of the drawn terrain along azimuth `azDeg` (0 = north, 90 = east), seen from
 * `hObs` m above the site, out to `rMaxM` (the 2D mask uses 100 km). Negative values are kept (not clipped).
 */
export function meshHorizonDeg(t: SurfaceTerrain, azDeg: number, hObs: number, rMaxM = 100_000): number {
  const az = azDeg * DEG;
  const sx = Math.sin(az);
  const sy = Math.cos(az);
  let best = -90;
  for (let d = 20; d <= rMaxM; d += stepAt(d)) {
    let rel: number | null = null; // height above the observer's ground, in the site's Up direction
    for (const lvl of t.levels) {
      const h = sampleHeight(lvl, d * sx, d * sy);
      if (h !== null) {
        rel = h + lvl.header.origin.elevation_m - t.site.elevation_m;
        break;
      }
    }
    if (rel === null && t.polar) {
      const h = sampleHeight(t.polar, ...polarXY(t.site, d, az));
      // absolute height in the DEM, then the drop below the site's tangent plane (spec 5.2)
      if (h !== null) rel = h + t.polar.header.origin.elevation_m - t.site.elevation_m - (d * d) / (2 * R_M);
    }
    if (rel === null) continue;
    const e = Math.atan2(rel - hObs, d) / DEG;
    if (e > best) best = e;
  }
  return best;
}

/** First-person view at h_obs (ENU of the site, metres): looking towards azimuth / elevation (deg). */
export function surfaceLook(azDeg: number, elDeg: number, hObs: number): { position: Vec3; forward: Vec3; up: Vec3 } {
  const az = azDeg * DEG;
  const el = elDeg * DEG;
  return {
    position: [0, 0, hObs],
    forward: [Math.sin(az) * Math.cos(el), Math.cos(az) * Math.cos(el), Math.sin(el)],
    up: [-Math.sin(az) * Math.sin(el), -Math.cos(az) * Math.sin(el), Math.cos(el)],
  };
}

/** Observer height of the 2D horizon mask and the series (D12, manifest params.h_obs_m). */
export const H_OBS_M = 3;

const AU_KM = 149_597_870.7;
const quatConj = (q: Quat): Quat => [-q[0], -q[1], -q[2], q[3]];

/** Azimuth (deg, 0 = north, 90 = east) and elevation (deg) of a J2000 direction seen from the site. */
export function azElAtSite(dirJ2000: Vec3, moonQuat: Quat, siteBodyKm: Vec3): [number, number] {
  const d = rotate(quatConj(moonQuat), dirJ2000); // into the Moon-fixed frame
  const { east, north, up } = enuBasis(siteBodyKm);
  const e = d[0] * east[0] + d[1] * east[1] + d[2] * east[2];
  const n = d[0] * north[0] + d[1] * north[1] + d[2] * north[2];
  const u = d[0] * up[0] + d[1] * up[1] + d[2] * up[2];
  const az = ((Math.atan2(e, n) / DEG) % 360 + 360) % 360;
  return [az, Math.atan2(u, Math.hypot(e, n)) / DEG];
}

/** Where the Sun and the Earth stand in the site's sky at a scene state (the 3D labels of the surface view). */
export function skyAzEl(s: SceneState, siteBodyKm: Vec3): { sun: [number, number]; earth: [number, number] } {
  const siteW = rotate(s.moonQuat, siteBodyKm);
  const at: Vec3 = [s.moonKm[0] + siteW[0], s.moonKm[1] + siteW[1], s.moonKm[2] + siteW[2]]; // site, from the Earth
  const toEarth: Vec3 = [-at[0], -at[1], -at[2]];
  // the scene keeps the Earth → Sun direction only; seen from the Moon it shifts by up to ~0.15° (parallax), so
  // the Sun is placed at 1 AU (its ±1.7 % change of distance leaves < 0.003°)
  const toSun: Vec3 = [s.sunDir[0] * AU_KM - at[0], s.sunDir[1] * AU_KM - at[1], s.sunDir[2] * AU_KM - at[2]];
  return { sun: azElAtSite(toSun, s.moonQuat, siteBodyKm), earth: azElAtSite(toEarth, s.moonQuat, siteBodyKm) };
}
