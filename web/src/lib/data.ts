/**
 * Data loader (T3.1.a): manifest first, everything else on demand, validated with the contract schemas
 * (docs/DATA_CONTRACT.md) and cached. Applies the per-file cross checks of contract §14 at load time.
 * Spec 7: everything is precomputed; the browser only filters and draws.
 */
import type { z } from "zod";
import {
  CONTRACT_VERSION,
  DailySchema,
  HorizonSchema,
  ManifestSchema,
  PlansSchema,
  SceneEphemerisSchema,
  SiteFeaturesSchema,
  SitesSchema,
  TerrainHeaderSchema,
  TimeseriesSchema,
  TrajectorySchema,
  WindowsSchema,
  parseInstant,
  type Daily,
  type Horizon,
  type Manifest,
  type Plan,
  type SceneEphemeris,
  type Site,
  type SiteFeatures,
  type TerrainHeader,
  type Timeseries,
  type Trajectory,
  type Windows,
} from "./contract";

export type DataErrorKind = "network" | "parse" | "validation" | "consistency";

/** Typed loading error: what failed, on which file, and the zod issues when relevant. */
export class DataError extends Error {
  constructor(
    readonly kind: DataErrorKind,
    readonly path: string,
    message: string,
    readonly issues: string[] = [],
  ) {
    super(`${kind} error in ${path}: ${message}`);
    this.name = "DataError";
  }
}

/** Data folder under public/: "data" by default, overridable with ?data=<folder> (e.g. contract fixtures in tests). */
export function dataDirFromLocation(search: string = typeof window === "undefined" ? "" : window.location.search): string {
  const dir = new URLSearchParams(search).get("data");
  return dir && /^[\w./-]+$/.test(dir) && !dir.includes("..") ? dir : "data";
}

export function isSynthetic(manifest: Pick<Manifest, "data_status">): boolean {
  return manifest.data_status === "SYNTHETIC";
}

export interface Core {
  manifest: Manifest;
  sites: Site[];
  plans: Plan[];
}

type Fetcher = (url: string) => Promise<Response>;

export class DataStore {
  private cache = new Map<string, Promise<unknown>>();
  private manifest?: Manifest;

  constructor(
    readonly baseUrl: string,
    private readonly fetcher: Fetcher = (url) => fetch(url),
  ) {}

  /** Creates a store for the current page (Vite base URL + data folder from the query string). */
  static forPage(): DataStore {
    const base = import.meta.env.BASE_URL ?? "/";
    return new DataStore(`${base}${dataDirFromLocation()}/`);
  }

  private async raw(path: string, as: "json" | "buffer"): Promise<unknown> {
    let res: Response;
    try {
      res = await this.fetcher(this.baseUrl + path);
    } catch (e) {
      throw new DataError("network", path, (e as Error).message);
    }
    if (!res.ok) throw new DataError("network", path, `HTTP ${res.status}`);
    if (as === "buffer") return res.arrayBuffer();
    try {
      return await res.json();
    } catch (e) {
      throw new DataError("parse", path, (e as Error).message);
    }
  }

  private load<S extends z.ZodType>(path: string, schema: S, check?: (v: z.infer<S>) => void): Promise<z.infer<S>> {
    const cached = this.cache.get(path);
    if (cached) return cached as Promise<z.infer<S>>;
    const p = this.raw(path, "json").then((json) => {
      const r = schema.safeParse(json);
      if (!r.success) {
        const issues = r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
        throw new DataError("validation", path, issues[0] ?? "invalid", issues);
      }
      check?.(r.data);
      return r.data;
    });
    p.catch(() => this.cache.delete(path)); // allow a retry after a failure
    this.cache.set(path, p);
    return p;
  }

  private fail(path: string, message: string): never {
    throw new DataError("consistency", path, message);
  }

  async getManifest(): Promise<Manifest> {
    this.manifest = await this.load("manifest.json", ManifestSchema, (m) => {
      if (m.contract_version.split(".")[0] !== CONTRACT_VERSION.split(".")[0])
        this.fail("manifest.json", `contract_version ${m.contract_version} is incompatible with ${CONTRACT_VERSION}`);
    });
    return this.manifest;
  }

  private async m(): Promise<Manifest> {
    return this.manifest ?? this.getManifest();
  }

  /** Initial shell data (spec 8.7: < 3 s): manifest, sites and plans. */
  async loadCore(): Promise<Core> {
    const manifest = await this.getManifest();
    const [sites, plans] = await Promise.all([
      this.load("sites.json", SitesSchema, (s) => {
        const ids = s.map((x) => x.id);
        if (ids.join() !== manifest.sites.join()) this.fail("sites.json", "site ids do not match manifest.sites"); // §14.1
        if (isSynthetic(manifest) && s.some((x) => !x.name.includes("SYNTHETIC") || x.source !== "SYNTHETIC"))
          this.fail("sites.json", "SYNTHETIC data must label every site as SYNTHETIC"); // §14.12
      }),
      this.load("plans.json", PlansSchema, (ps) => {
        const ids = new Set(manifest.sites);
        const bad = ps.find((p) => !ids.has(p.site_id) || !manifest.params.window_days.includes(p.window_days));
        if (bad) this.fail("plans.json", `plan ${bad.id} references an unknown site or window`); // §14.8
      }),
    ]);
    return { manifest, sites, plans };
  }

  private siteCheck(path: string, siteId: string) {
    return (v: { site_id: string }) => {
      if (v.site_id !== siteId) this.fail(path, `internal site_id ${v.site_id} ≠ ${siteId}`); // §14.3
    };
  }

  async horizon(siteId: string): Promise<Horizon> {
    const m = await this.m();
    const path = `horizon/${siteId}.json`;
    return this.load(path, HorizonSchema, (h) => {
      this.siteCheck(path, siteId)(h);
      if (h.h_obs_m !== m.params.h_obs_m || h.az_step_deg !== m.params.horizon.az_step_deg) this.fail(path, "parameters differ from the manifest"); // §14.5
    });
  }

  async timeseries(siteId: string): Promise<Timeseries> {
    const m = await this.m();
    const path = `timeseries/${siteId}.json`;
    return this.load(path, TimeseriesSchema, (t) => {
      this.siteCheck(path, siteId)(t);
      const end = parseInstant(t.start_utc) + t.n * t.step_min * 60_000;
      if (t.step_min !== m.params.step_min || t.start_utc !== m.date_range.timeseries_start_utc || end !== parseInstant(m.date_range.timeseries_end_utc))
        this.fail(path, "start_utc + n·step_min does not match the manifest date range"); // §14.4
    });
  }

  daily(siteId: string): Promise<Daily> {
    const path = `daily/${siteId}.json`;
    return this.load(path, DailySchema, this.siteCheck(path, siteId));
  }

  async windows(siteId: string, windowDays: number): Promise<Windows> {
    const m = await this.m();
    const path = `windows/${siteId}_${windowDays}d.json`;
    return this.load(path, WindowsSchema, (w) => {
      this.siteCheck(path, siteId)(w);
      if (w.window_days !== windowDays) this.fail(path, `window_days ${w.window_days} ≠ ${windowDays}`);
      if (w.rows[0].start.slice(0, 10) !== m.date_range.arrival_start || w.rows[w.rows.length - 1].start.slice(0, 10) !== m.date_range.arrival_end)
        this.fail(path, "rows do not span the arrival range"); // §14.7
    });
  }

  siteFeatures(siteId: string): Promise<SiteFeatures> {
    const path = `site_features/${siteId}.json`;
    return this.load(path, SiteFeaturesSchema, this.siteCheck(path, siteId));
  }

  async trajectory(trajectoryId: string): Promise<Trajectory> {
    const m = await this.m();
    const path = `trajectory/${trajectoryId}.json`;
    return this.load(path, TrajectorySchema, (t) => {
      if (t.mode !== m.params.trajectory_mode) this.fail(path, `mode ${t.mode} ≠ manifest ${m.params.trajectory_mode}`); // §14.9
    });
  }

  async scene(): Promise<SceneEphemeris> {
    const m = await this.m();
    return this.load("scene/ephemeris.json", SceneEphemerisSchema, (s) => {
      if (s.frame !== m.params.scene_frame || s.moon_frame !== m.params.moon_frame) this.fail("scene/ephemeris.json", "frames differ from the manifest"); // §14.10
    });
  }

  /** Terrain level: header plus heights in metres (decoded int16, row-major from north to south). */
  async terrain(siteId: string, lod: number): Promise<{ header: TerrainHeader; heights: Float32Array }> {
    const folder = `terrain/${siteId}/`;
    const header = await this.load(`${folder}lod${lod}.json`, TerrainHeaderSchema, this.siteCheck(`${folder}lod${lod}.json`, siteId));
    const buf = (await this.raw(folder + header.bin_file, "buffer")) as ArrayBuffer;
    if (buf.byteLength !== header.byte_length) this.fail(folder + header.bin_file, `${buf.byteLength} bytes, header says ${header.byte_length}`); // §14.11
    const ints = new Int16Array(buf); // little-endian on every supported browser platform
    const heights = new Float32Array(ints.length);
    for (let i = 0; i < ints.length; i++) heights[i] = ints[i] * header.height_scale_m + header.height_offset_m;
    return { header, heights };
  }
}
