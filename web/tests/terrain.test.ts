// @vitest-environment jsdom
/** T4.3.b: terrain at real local scale — projection, geometry, progressive loading and precision. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Plan, SceneEphemeris, TerrainHeader, Trajectory } from "../src/lib/contract";
import { timelineOf } from "../src/lib/mission";
import { directorPose, localBlend, type DirectorInput } from "../src/scene3d/cameraDirector";
import { indexEphemeris, rotate, sceneStateAt } from "../src/scene3d/ephemeris";
import { padUp } from "../src/scene3d/launch";
import { bodyRadius, EARTH_RADII_KM, earthOffset, MOON_RADIUS_KM, pointToScene, toScene, type Vec3 } from "../src/scene3d/scale";
import { bodyFixedKm, enuBasis, LOAD_DISTANCE, polarGeometry, polarToLonLat, siteLevelGeometry, TerrainManager, type TerrainData } from "../src/scene3d/terrain";
import { siteBodyFixedKm, sitePositionKm } from "../src/scene3d/trajectory";
import { parseInstant } from "../src/lib/contract";

const DATA = join(__dirname, "..", "public", "data");
const readTerrain = (site: string, lod: number): TerrainData => {
  const header = JSON.parse(readFileSync(join(DATA, "terrain", site, `lod${lod}.json`), "utf-8")) as TerrainHeader;
  const buf = readFileSync(join(DATA, "terrain", site, header.bin_file));
  const ints = new Int16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2);
  return { header, heights: Float32Array.from(ints, (v) => v * header.height_scale_m + header.height_offset_m) };
};
const sites = JSON.parse(readFileSync(join(DATA, "sites.json"), "utf-8")) as { id: string; lat: number; lon: number; elevation_m: number }[];

describe("polar stereographic inverse (checked against pyproj)", () => {
  // reference values: pyproj Transformer(+proj=stere +lat_0=-90 +lat_ts=-90 +R=1737400 → lon/lat), T4.3.b
  const ref: [number, number, number, number][] = [
    [100000, 0, 90.0, -86.703121346],
    [0, 100000, 0.0, -86.703121346],
    [-50000, -120000, -157.380135052, -85.714873307],
    [302000, 302000, 45.0, -75.985682599],
    [-200000, 150000, -53.130102354, -81.769709745],
  ];
  it("matches pyproj to 1e-8 degrees", () => {
    for (const [x, y, lon, lat] of ref) {
      const [lo, la] = polarToLonLat(x, y);
      expect(lo).toBeCloseTo(lon, 8);
      expect(la).toBeCloseTo(lat, 8);
    }
  });
});

describe("site geometry", () => {
  for (const s of sites) {
    it(`${s.id}: ENU basis orthonormal, site at the centre of every level, holes and skirts`, () => {
      const siteBody = bodyFixedKm(s.lat, s.lon, MOON_RADIUS_KM + s.elevation_m / 1000);
      const { east, north, up } = enuBasis(siteBody);
      const d = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      expect(d(east, north)).toBeCloseTo(0, 12);
      expect(d(east, up)).toBeCloseTo(0, 12);
      expect(east[2]).toBeCloseTo(0, 12); // east is horizontal
      for (const lod of [0, 1, 2]) {
        const t = readTerrain(s.id, lod);
        const { nx, ny } = t.header.grid;
        const g = siteLevelGeometry(t, siteBody, lod < 2 ? [10_000, 3_000][lod] : 0);
        const pos = g.getAttribute("position");
        const c = Math.floor(ny / 2) * nx + Math.floor(nx / 2); // centre node = the site (contract §13)
        expect(Math.hypot(pos.getX(c), pos.getY(c), pos.getZ(c)) * 1e6).toBeLessThan(0.5); // < 0.5 m from the site
        expect(pos.count).toBe(nx * ny + 2 * (nx + ny) - 4); // grid + skirt ring
        const cells = (nx - 1) * (ny - 1);
        expect(g.getIndex()!.count).toBeLessThan(6 * cells + 6 * (2 * (nx + ny) - 4) + 1);
      }
    });
  }

  it("the polar context lands where the site levels are (same DEM): median height mismatch small", () => {
    const s = sites.find((x) => x.id === "haworth")!;
    const siteBody = bodyFixedKm(s.lat, s.lon, MOON_RADIUS_KM + s.elevation_m / 1000);
    const polar = polarGeometry(readTerrain("_polar", 0), siteBody, 0).getAttribute("position");
    const up = enuBasis(siteBody).up;
    // polar vertices within 15 km of the site: their height along "up" vs the lod0 surface there is ~ the same
    let n = 0;
    const diffs: number[] = [];
    const lod0 = readTerrain("haworth", 0);
    const { east, north } = enuBasis(siteBody);
    for (let i = 0; i < polar.count; i++) {
      const v: Vec3 = [polar.getX(i) * 1e6, polar.getY(i) * 1e6, polar.getZ(i) * 1e6]; // m, relative to the site
      const x = v[0] * east[0] + v[1] * east[1] + v[2] * east[2];
      const y = v[0] * north[0] + v[1] * north[1] + v[2] * north[2];
      if (Math.hypot(x, y) > 15_000) continue;
      const g = lod0.header.grid;
      const ii = Math.round((x - g.x0_m) / g.spacing_m);
      const jj = Math.round((g.y0_m - y) / g.spacing_m);
      const h = v[0] * up[0] + v[1] * up[1] + v[2] * up[2];
      diffs.push(Math.abs(h - lod0.heights[jj * g.nx + ii]));
      n++;
    }
    diffs.sort((a, b) => a - b);
    const median = diffs[Math.floor(diffs.length / 2)];
    console.log(`terrain: ${n} polar nodes within 15 km of Haworth, median |Δh| vs lod0 = ${median.toFixed(0)} m`);
    expect(n).toBeGreaterThan(100);
    expect(median).toBeLessThan(150);
  });
});

describe("progressive loading by distance, only during the approach", () => {
  it("requests nothing in space scale, then polar + lod0, lod1 and lod2 as the camera closes in", () => {
    const asked: string[] = [];
    const fake = (site: string, lod: number) => {
      asked.push(`${site}:${lod}`);
      return Promise.resolve(readTerrain(site, lod));
    };
    const m = new TerrainManager("haworth", bodyFixedKm(-86.36, -23.2, 1740), fake);
    m.update(0.001, 0); // close but still in space scale (λ = 0): nothing
    m.update(0.5, 0.3);
    expect(asked).toEqual([]);
    m.update(LOAD_DISTANCE.lod0 * 0.9, 0.3);
    expect(asked).toEqual(["_polar:0", "haworth:0"]);
    m.update(LOAD_DISTANCE.lod1 * 0.9, 0.6);
    expect(asked).toEqual(["_polar:0", "haworth:0", "haworth:1"]);
    m.update(LOAD_DISTANCE.lod2 * 0.9, 0.95);
    expect(asked).toEqual(["_polar:0", "haworth:0", "haworth:1", "haworth:2"]);
    m.update(0.001, 1);
    expect(asked).toHaveLength(4); // each level once
  });
});

describe("precision at the final approach (coordinate magnitudes)", () => {
  it("near the camera the camera-relative coordinates are small and float32 keeps them within 1 cm", () => {
    const eph = JSON.parse(readFileSync(join(DATA, "scene", "ephemeris.json"), "utf-8")) as SceneEphemeris;
    const ix = indexEphemeris(eph);
    const plans = JSON.parse(readFileSync(join(DATA, "plans.json"), "utf-8")) as Plan[];
    const plan = plans.find((p) => p.id === "haworth_20270309_7d")!;
    const traj = JSON.parse(readFileSync(join(DATA, "trajectory", `${plan.trajectory_id}.json`), "utf-8")) as Trajectory;
    const tl = timelineOf(plan, traj);
    const siteBody = siteBodyFixedKm(traj, ix);
    const t = tl.landingMs;
    const s = sceneStateAt(ix, t);
    const anchor = pointToScene(sitePositionKm(siteBody, s.moonKm, s.moonQuat), s.moonKm);
    const input: DirectorInput = {
      t,
      moon: toScene(s.moonKm),
      sunDir: s.sunDir,
      earthRadius: bodyRadius(EARTH_RADII_KM.equatorial),
      moonRadius: bodyRadius(MOON_RADIUS_KM),
      padUpAtLaunch: padUp(sceneStateAt(ix, parseInstant(traj.phases.launch_utc)).earthQuat),
      moonNorth: rotate(s.moonQuat, [0, 0, 1]),
      site: anchor,
    };
    expect(localBlend(tl, t)).toBe(1); // real local scale at landing
    const cam = directorPose(tl, input).position;
    const lod2 = siteLevelGeometry(readTerrain("haworth", 2), siteBody, 0).getAttribute("position");
    let worst = 0;
    let maxRel = 0;
    for (let i = 0; i < lod2.count; i += 7) {
      const local: Vec3 = rotate(s.moonQuat, [lod2.getX(i), lod2.getY(i), lod2.getZ(i)]);
      const world: Vec3 = [anchor[0] + local[0], anchor[1] + local[1], anchor[2] + local[2]];
      const rel: Vec3 = [world[0] - cam[0], world[1] - cam[1], world[2] - cam[2]]; // float64, as the renderer does
      maxRel = Math.max(maxRel, Math.hypot(...rel));
      worst = Math.max(worst, ...rel.map((v) => Math.abs(Math.fround(v) - v)));
    }
    console.log(`precision: |anchor| = ${Math.hypot(...anchor).toFixed(1)} units, terrain within ${(maxRel * 1000).toFixed(1)} km of the camera, worst float32 error ${(worst * 1e6 * 1000).toFixed(3)} mm`);
    expect(Math.hypot(...anchor)).toBeGreaterThan(300); // the site is ~380 000 km from the origin…
    expect(maxRel).toBeLessThan(0.02); // …but the terrain around it is within 20 km of the camera
    expect(worst * 1e6).toBeLessThan(0.01); // float32 error < 1 cm
  });
});

describe("real local scale is the real geometry", () => {
  it("at λ = 1 the vector site → Earth (with the Earth offset) is the true one; at λ = 0 nothing moves", () => {
    const eph = JSON.parse(readFileSync(join(DATA, "scene", "ephemeris.json"), "utf-8")) as SceneEphemeris;
    const ix = indexEphemeris(eph);
    const s = sceneStateAt(ix, Date.parse("2027-01-08T23:55:00Z"));
    const site = sites.find((x) => x.id === "connecting_ridge")!;
    const siteKm = sitePositionKm(bodyFixedKm(site.lat, site.lon, MOON_RADIUS_KM + site.elevation_m / 1000), s.moonKm, s.moonQuat);
    const anchor = pointToScene(siteKm, s.moonKm); // drawn site (×6), the fixed point
    const earth1 = earthOffset(siteKm, s.moonKm, 1);
    const trueVec = toScene([-siteKm[0], -siteKm[1], -siteKm[2]]);
    for (let c = 0; c < 3; c++) expect(earth1[c] - anchor[c]).toBeCloseTo(trueVec[c], 9);
    for (const v of earthOffset(siteKm, s.moonKm, 0)) expect(Math.abs(v)).toBe(0); // λ = 0: the Earth stays at the origin
    const shiftDeg = (Math.hypot(...earth1) / Math.hypot(...trueVec)) * (180 / Math.PI);
    console.log(`earth offset at real scale: ${(Math.hypot(...earth1) * 1000).toFixed(0)} km (≈ ${shiftDeg.toFixed(2)}° seen from the site)`);
  });
});
