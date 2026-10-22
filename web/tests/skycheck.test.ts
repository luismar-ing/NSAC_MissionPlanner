/**
 * 2D science vs 3D scene: the Earth and Sun elevations seen from each site, computed from the scene's
 * ephemeris (Moon position + MOON_ME quaternion, Earth-centred J2000) must agree with the site timeseries
 * (earth_el, sun_el, computed by the pipeline with SPICE). Same instants, true geometry (no exaggeration).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { SceneEphemeris } from "../src/lib/contract";
import { indexEphemeris, rotate, sceneStateAt } from "../src/scene3d/ephemeris";
import { MOON_RADIUS_KM, type Vec3 } from "../src/scene3d/scale";
import { bodyFixedKm } from "../src/scene3d/terrain";

const DATA = join(__dirname, "..", "public", "data");
const eph = JSON.parse(readFileSync(join(DATA, "scene", "ephemeris.json"), "utf-8")) as SceneEphemeris;
const ix = indexEphemeris(eph);
const sites = JSON.parse(readFileSync(join(DATA, "sites.json"), "utf-8")) as { id: string; lat: number; lon: number; elevation_m: number }[];

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const elevationDeg = (up: Vec3, dir: Vec3) => {
  const c = (up[0] * dir[0] + up[1] * dir[1] + up[2] * dir[2]) / (Math.hypot(...up) * Math.hypot(...dir));
  return 90 - (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
};

describe("Earth and Sun elevation: scene geometry = site timeseries", () => {
  for (const s of sites) {
    it(s.id, () => {
      const ts = JSON.parse(readFileSync(join(DATA, "timeseries", `${s.id}.json`), "utf-8")) as {
        start_utc: string;
        step_min: number;
        n: number;
        angle_scale: number;
        earth_el: number[];
        sun_el: number[];
      };
      const t0 = Date.parse(ts.start_utc);
      const siteBody = bodyFixedKm(s.lat, s.lon, MOON_RADIUS_KM + s.elevation_m / 1000);
      let worstEarth = 0;
      let worstSun = 0;
      let n = 0;
      for (let k = 0; k < ts.n; k += 97) {
        const t = t0 + k * ts.step_min * 60_000;
        const st = sceneStateAt(ix, t);
        const up = rotate(st.moonQuat, siteBody); // local vertical (radial), J2000
        const site: Vec3 = [st.moonKm[0] + up[0], st.moonKm[1] + up[1], st.moonKm[2] + up[2]];
        const earthEl = elevationDeg(up, sub([0, 0, 0], site));
        const sunEl = elevationDeg(up, st.sunDir);
        worstEarth = Math.max(worstEarth, Math.abs(earthEl - ts.earth_el[k] * ts.angle_scale));
        worstSun = Math.max(worstSun, Math.abs(sunEl - ts.sun_el[k] * ts.angle_scale));
        n++;
      }
      console.log(`sky ${s.id}: ${n} instants, max |Δ earth_el| = ${worstEarth.toFixed(3)}°, max |Δ sun_el| = ${worstSun.toFixed(3)}°`);
      expect(worstEarth).toBeLessThan(0.1);
      expect(worstSun).toBeLessThan(0.1);
    });
  }
});
