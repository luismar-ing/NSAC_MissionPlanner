/**
 * T6.1.a: Level B terrain. Standing on the site at h_obs, the skyline of the meshes the 3D scene draws (site
 * levels lod2/lod1/lod0 + polar context) must match the 2D horizon mask (spec 5.2, full-resolution DEM) at the
 * four cardinal bearings, so the 3D ground and the panorama tell the same story.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DataStore } from "../src/lib/data";
import { loadPlanData } from "../src/lib/planData";
import type { Plan } from "../src/lib/contract";
import { meshHorizonDeg, skyAzEl, surfaceLook, type SurfaceTerrain } from "../src/scene3d/terrainLevelB";
import { indexEphemeris, sceneStateAt } from "../src/scene3d/ephemeris";
import { bodyFixedKm } from "../src/scene3d/terrain";
import { MOON_RADIUS_KM } from "../src/scene3d/scale";
import type { SceneEphemeris } from "../src/lib/contract";

const REAL = join(__dirname, "..", "public", "data");
const fetcher = async (url: string) => {
  try {
    return new Response(readFileSync(join(REAL, url.replace(/^\/base\//, ""))), { status: 200 });
  } catch {
    return new Response("not found", { status: 404 });
  }
};
const data = new DataStore("/base/", fetcher);
const SITES = ["connecting_ridge", "haworth", "nobile_rim_1", "malapert_massif", "de_gerlache_rim_2"];
const H_OBS = 3; // D12

async function terrainOf(site: string): Promise<SurfaceTerrain> {
  const levels = await Promise.all([2, 1, 0].map((l) => data.terrain(site, l)));
  const polar = await data.terrain("_polar", 0);
  const o = levels[0].header.origin;
  return { levels, polar, site: { lat: o.lat, lon: o.lon, elevation_m: o.elevation_m } };
}

describe("Level B: the 3D skyline matches the 2D horizon mask", () => {
  it("at N, E, S, W for every site (and in every 10° for the statistics)", async () => {
    const rows: string[] = [];
    let worstCardinal = 0;
    const all: number[] = [];
    for (const site of SITES) {
      const t = await terrainOf(site);
      const mask = JSON.parse(readFileSync(join(REAL, "horizon", `${site}.json`), "utf-8")) as { elev_deg: number[]; az_step_deg: number; h_obs_m: number };
      expect(mask.h_obs_m).toBe(H_OBS);
      const errAt = (az: number) => meshHorizonDeg(t, az, H_OBS) - mask.elev_deg[Math.round(az / mask.az_step_deg) % mask.elev_deg.length];
      const card = [0, 90, 180, 270].map(errAt);
      worstCardinal = Math.max(worstCardinal, ...card.map(Math.abs));
      for (let az = 0; az < 360; az += 10) all.push(Math.abs(errAt(az)));
      rows.push(`${site}: N ${card[0].toFixed(2)}° E ${card[1].toFixed(2)}° S ${card[2].toFixed(2)}° W ${card[3].toFixed(2)}°`);
    }
    all.sort((a, b) => a - b);
    const mean = all.reduce((a, b) => a + b, 0) / all.length;
    console.log(`Level B skyline − 2D mask:\n  ${rows.join("\n  ")}\n  every 10°: mean |Δ| ${mean.toFixed(2)}°, p95 ${all[Math.floor(all.length * 0.95)].toFixed(2)}°, max ${all.at(-1)!.toFixed(2)}°`);
    expect(worstCardinal).toBeLessThan(0.5);
    expect(mean).toBeLessThan(0.25);
  });

  it("first-person look: forward points at the azimuth / elevation, up stays perpendicular", () => {
    const l = surfaceLook(90, 10, H_OBS);
    expect(l.position).toEqual([0, 0, H_OBS]);
    expect(l.forward[0]).toBeCloseTo(Math.cos((10 * Math.PI) / 180), 12); // east
    expect(l.forward[2]).toBeCloseTo(Math.sin((10 * Math.PI) / 180), 12);
    expect(l.forward.reduce((s, v, i) => s + v * l.up[i], 0)).toBeCloseTo(0, 12);
  });

  it("T6.1.b: the shadow casters agree with sun_vis (upper limb above the meshes' skyline, spec 5.3) over whole windows", async () => {
    const plans = JSON.parse(readFileSync(join(REAL, "plans.json"), "utf-8")) as Plan[] | { plans: Plan[] };
    const list = Array.isArray(plans) ? plans : plans.plans;
    const sites = JSON.parse(readFileSync(join(REAL, "sites.json"), "utf-8"));
    const siteList = Array.isArray(sites) ? sites : sites.sites;
    const lines: string[] = [];
    let agree = 0;
    let total = 0;
    for (const id of ["malapert_massif_20270106_7d", "haworth_20270615_7d", "de_gerlache_rim_2_20270901_7d"]) {
      const plan = list.find((p) => p.id === id)!;
      const pd = await loadPlanData(data, plan, siteList);
      const t = await terrainOf(plan.site_id);
      const cache = new Map<number, number>(); // skyline per 0.5° of azimuth (the Sun moves slowly)
      const sky = (az: number) => {
        const k = Math.round(az * 2) / 2;
        if (!cache.has(k)) cache.set(k, meshHorizonDeg(t, k, H_OBS));
        return cache.get(k)!;
      };
      let a = 0;
      const n = pd.series.sunVis.length;
      for (let i = 0; i < n; i++) {
        const lit = pd.series.sunEl[i] + 0.265 > sky(pd.series.sunAz[i]) ? 1 : 0;
        if (lit === pd.series.sunVis[i]) a++;
      }
      agree += a;
      total += n;
      lines.push(`${id}: ${((100 * a) / n).toFixed(1)} % of ${n} samples`);
    }
    console.log(`Level B shadows vs sun_vis:\n  ${lines.join("\n  ")}`);
    expect(agree / total).toBeGreaterThan(0.95);
  });

  it("TR.3.a: the sky labels' az/el (scene geometry) match the panorama's series at 3 instants per site (< 0.1°)", () => {
    const ix = indexEphemeris(JSON.parse(readFileSync(join(REAL, "scene", "ephemeris.json"), "utf-8")) as SceneEphemeris);
    const sites = JSON.parse(readFileSync(join(REAL, "sites.json"), "utf-8")) as { id: string; lat: number; lon: number; elevation_m: number }[];
    const list = Array.isArray(sites) ? sites : (sites as unknown as { sites: typeof sites }).sites;
    let worst = 0;
    const dAz = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
    for (const s of list) {
      const ts = JSON.parse(readFileSync(join(REAL, "timeseries", `${s.id}.json`), "utf-8"));
      const body = bodyFixedKm(s.lat, s.lon, MOON_RADIUS_KM + s.elevation_m / 1000);
      for (const k of [100, ts.n >> 1, ts.n - 200]) {
        const t = Date.parse(ts.start_utc) + k * ts.step_min * 60_000;
        const sky = skyAzEl(sceneStateAt(ix, t), body);
        const sc = ts.angle_scale;
        worst = Math.max(
          worst,
          dAz(sky.sun[0], ts.sun_az[k] * sc),
          Math.abs(sky.sun[1] - ts.sun_el[k] * sc),
          dAz(sky.earth[0], ts.earth_az[k] * sc),
          Math.abs(sky.earth[1] - ts.earth_el[k] * sc),
        );
      }
    }
    console.log(`sky labels vs series: worst ${worst.toFixed(3)}°`);
    expect(worst).toBeLessThan(0.1);
  });
});
