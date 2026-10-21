/**
 * Data contract v1 (docs/DATA_CONTRACT.md) as zod schemas.
 * Mirrors pipeline/contract.py rule by rule; parity is tested against the shared fixtures
 * in pipeline/tests/fixtures/contract (web/tests/contract.test.ts).
 * Cross-file checks (contract section 14) belong to the data loader (T3.1.a).
 */
import { z } from "zod";

export const CONTRACT_VERSION = "1.0.0";

const NORM_TOL = 1e-6;
const DAY_MS = 86_400_000;
const INSTANT_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/;
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// ------------------------------------------------------------------ time

/** '2027-01-01T00:00:00Z' -> epoch ms (UTC). Returns NaN for impossible dates. */
export function parseInstant(s: string): number {
  const m = INSTANT_RE.exec(s);
  if (!m) return NaN;
  const [y, mo, d, h, mi, se] = m.slice(1).map(Number);
  const t = Date.UTC(y, mo - 1, d, h, mi, se);
  const back = new Date(t);
  const ok =
    back.getUTCFullYear() === y && back.getUTCMonth() === mo - 1 && back.getUTCDate() === d &&
    back.getUTCHours() === h && back.getUTCMinutes() === mi && back.getUTCSeconds() === se;
  return ok ? t : NaN;
}

/** '2027-01-01' -> epoch ms at 00:00Z. Returns NaN for impossible dates. */
export function parseDay(s: string): number {
  return DAY_RE.test(s) ? parseInstant(`${s}T00:00:00Z`) : NaN;
}

export function formatInstant(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
}

const yyyymmdd = (ms: number) => formatInstant(ms).slice(0, 10).replaceAll("-", "");
const isMidnight = (ms: number) => ms % DAY_MS === 0;

const Instant = z.string().refine((s) => !Number.isNaN(parseInstant(s)), "instant must be ISO 8601 UTC 'YYYY-MM-DDTHH:MM:SSZ'");
const Day = z.string().refine((s) => !Number.isNaN(parseDay(s)), "day must be 'YYYY-MM-DD'");
const SiteId = z.string().regex(/^[a-z0-9_]+$/);
const NonEmpty = z.string().min(1);
const Lat = z.number().gte(-90).lte(90);
const Lon = z.number().gte(-180).lt(180);
const Pct = z.number().gte(0).lte(100);
const HoursOfDay = z.number().gte(0).lte(24);
const PosInt = z.number().int().gt(0);

type Ctx = z.core.$RefinementCtx;
const fail = (ctx: Ctx, message: string) => ctx.addIssue({ code: "custom", message });

function checkVectors(ctx: Ctx, name: string, rows: number[][], n: number, unit: boolean) {
  if (rows.length !== n) return fail(ctx, `${name} has ${rows.length} samples, expected n = ${n}`);
  for (const v of rows) {
    if (!v.every(Number.isFinite)) return fail(ctx, `${name} contains non-finite values`);
    if (unit && Math.abs(Math.hypot(...v) - 1) > NORM_TOL) return fail(ctx, `${name} not normalized (norm outside 1 ± ${NORM_TOL})`);
  }
}

const vec = (k: number) => z.array(z.array(z.number()).length(k));

// ------------------------------------------------------------------ manifest

export const DateRangeSchema = z
  .strictObject({
    arrival_start: Day,
    arrival_end: Day,
    timeseries_start_utc: Instant,
    timeseries_end_utc: Instant,
    scene_start_utc: Instant,
    scene_end_utc: Instant,
  })
  .superRefine((d, ctx) => {
    if (parseDay(d.arrival_start) > parseDay(d.arrival_end)) fail(ctx, "arrival_start after arrival_end");
    if (parseInstant(d.timeseries_start_utc) >= parseInstant(d.timeseries_end_utc)) fail(ctx, "empty or inverted timeseries range");
    if (parseInstant(d.scene_start_utc) >= parseInstant(d.scene_end_utc)) fail(ctx, "empty or inverted scene range");
  });

export const ParamsSchema = z
  .strictObject({
    step_min: PosInt,
    h_obs_m: z.number().gt(0),
    antenna_margin_deg: z.number().gte(0),
    sun_criterion: z.enum(["upper_limb", "disk_fraction"]),
    sun_radius_deg: z.number().gt(0),
    sun_fraction_threshold: z.number().gt(0).lt(1).nullable(),
    horizon: z.strictObject({
      az_step_deg: z.number().gt(0).lte(360),
      r_max_km: z.number().gt(0),
      clip_negative: z.boolean(),
    }),
    window_days: z.array(PosInt).min(1),
    transit_days: z.number().gt(0),
    score_weights: z.strictObject({ w1: z.number().gte(0), w2: z.number().gte(0), w3: z.number().gte(0) }),
    trajectory_mode: z.enum(["REAL", "ILLUSTRATIVE"]),
    scale_mode: NonEmpty,
    moon_frame: z.enum(["MOON_ME", "MOON_PA"]),
    scene_frame: NonEmpty,
    spice_kernels: z.array(NonEmpty),
    dem_product: NonEmpty.nullable(),
  })
  .superRefine((p, ctx) => {
    if ((p.sun_criterion === "disk_fraction") !== (p.sun_fraction_threshold !== null))
      fail(ctx, "sun_fraction_threshold is required with disk_fraction and null with upper_limb");
    if (new Set(p.window_days).size !== p.window_days.length) fail(ctx, "repeated window_days");
    const bins = 360 / p.horizon.az_step_deg;
    if (Math.abs(bins - Math.round(bins)) > 1e-9) fail(ctx, "360 is not a multiple of horizon.az_step_deg");
  });

export const ManifestSchema = z
  .strictObject({
    contract_version: z.string().regex(/^\d+\.\d+\.\d+$/),
    data_version: NonEmpty,
    generated_utc: Instant,
    data_status: z.enum(["REAL", "SYNTHETIC"]),
    date_range: DateRangeSchema,
    params: ParamsSchema,
    sites: z.array(SiteId).min(1),
    files: z.record(z.string(), z.strictObject({ bytes: z.number().int().gte(0), sha256: z.string().regex(/^[0-9a-f]{64}$/) })).optional(),
  })
  .superRefine((m, ctx) => {
    const { date_range: dr, params: p } = m;
    const a0 = parseDay(dr.arrival_start);
    const a1 = parseDay(dr.arrival_end);
    if (parseInstant(dr.timeseries_start_utc) !== a0) fail(ctx, "timeseries_start_utc must be arrival_start at 00:00Z (contract §2)");
    const expectedEnd = a1 + (1 + Math.max(...p.window_days)) * DAY_MS;
    if (parseInstant(dr.timeseries_end_utc) !== expectedEnd) fail(ctx, `timeseries_end_utc must be ${formatInstant(expectedEnd)} (contract §2)`);
    if (parseInstant(dr.scene_start_utc) > a0 - p.transit_days * DAY_MS) fail(ctx, "scene does not cover the first launch (contract §2)");
    if (parseInstant(dr.scene_end_utc) < expectedEnd) fail(ctx, "scene does not cover the end of the timeseries (contract §2)");
    if (new Set(m.sites).size !== m.sites.length) fail(ctx, "repeated sites");
  });

// ------------------------------------------------------------------ sites and plans

export const SiteSchema = z.strictObject({
  id: SiteId,
  name: NonEmpty,
  lat: Lat,
  lon: Lon,
  elevation_m: z.number(),
  source: NonEmpty,
});

export const SitesSchema = z
  .array(SiteSchema)
  .min(1)
  .superRefine((sites, ctx) => {
    if (new Set(sites.map((s) => s.id)).size !== sites.length) fail(ctx, "repeated site ids");
  });

export const PlanSchema = z
  .strictObject({
    id: NonEmpty,
    site_id: SiteId,
    arrival_utc: Instant,
    window_days: PosInt,
    transit_days: z.number().gt(0),
    launch_utc: Instant,
    trajectory_id: NonEmpty,
  })
  .superRefine((p, ctx) => {
    const arrival = parseInstant(p.arrival_utc);
    if (!isMidnight(arrival)) fail(ctx, "arrival_utc must be 00:00:00Z of the arrival day");
    const launch = arrival - p.transit_days * DAY_MS;
    if (Math.abs(parseInstant(p.launch_utc) - launch) > 1000) fail(ctx, `launch_utc must be arrival_utc - transit_days = ${formatInstant(launch)}`);
    const stamp = yyyymmdd(arrival);
    if (p.id !== `${p.site_id}_${stamp}_${p.window_days}d`) fail(ctx, `id must be ${p.site_id}_${stamp}_${p.window_days}d`);
    if (p.trajectory_id !== `${p.site_id}_${stamp}`) fail(ctx, `trajectory_id must be ${p.site_id}_${stamp}`);
  });

export const PlansSchema = z
  .array(PlanSchema)
  .min(1)
  .superRefine((plans, ctx) => {
    if (new Set(plans.map((p) => p.id)).size !== plans.length) fail(ctx, "repeated plan ids");
  });

// ------------------------------------------------------------------ site series

export const HorizonSchema = z
  .strictObject({
    site_id: SiteId,
    az_step_deg: z.number().gt(0).lte(360),
    h_obs_m: z.number().gt(0),
    r_max_km: z.number().gt(0),
    elev_deg: z.array(z.number()),
  })
  .superRefine((h, ctx) => {
    const n = Math.round(360 / h.az_step_deg);
    if (h.elev_deg.length !== n) fail(ctx, `elev_deg has ${h.elev_deg.length} values, expected ${n}`);
    if (h.elev_deg.some((e) => !Number.isFinite(e) || Math.abs(e) > 90)) fail(ctx, "elev_deg outside [-90, 90]");
  });

const SERIES = ["sun_az", "sun_el", "earth_az", "earth_el", "sun_vis", "earth_vis"] as const;

export const TimeseriesSchema = z
  .strictObject({
    site_id: SiteId,
    start_utc: Instant,
    step_min: PosInt,
    n: PosInt,
    angle_scale: z.number().gt(0),
    sun_az: z.array(z.number().int()),
    sun_el: z.array(z.number().int()),
    earth_az: z.array(z.number().int()),
    earth_el: z.array(z.number().int()),
    sun_vis: z.array(z.number().int()),
    earth_vis: z.array(z.number().int()),
  })
  .superRefine((t, ctx) => {
    for (const name of SERIES) {
      if (t[name].length !== t.n) return fail(ctx, `${name} has ${t[name].length} values, expected n = ${t.n}`);
    }
    const s = t.angle_scale;
    for (const name of ["sun_az", "earth_az"] as const) {
      if (t[name].some((v) => v * s < 0 || v * s >= 360)) fail(ctx, `${name} outside [0, 360) degrees`);
    }
    for (const name of ["sun_el", "earth_el"] as const) {
      if (t[name].some((v) => Math.abs(v * s) > 90)) fail(ctx, `${name} outside [-90, 90] degrees`);
    }
    for (const name of ["sun_vis", "earth_vis"] as const) {
      if (t[name].some((v) => v !== 0 && v !== 1)) fail(ctx, `${name} only accepts 0 or 1`);
    }
  });

export const DayRowSchema = z.strictObject({
  date: Day,
  sun_pct: Pct,
  earth_h: HoursOfDay,
  longest_dark_h: HoursOfDay,
  longest_comm_gap_h: HoursOfDay,
});

export const DailySchema = z
  .strictObject({ site_id: SiteId, days: z.array(DayRowSchema).min(1) })
  .superRefine((d, ctx) => {
    for (let i = 1; i < d.days.length; i++) {
      if (parseDay(d.days[i].date) - parseDay(d.days[i - 1].date) !== DAY_MS)
        return fail(ctx, `non-consecutive days: ${d.days[i - 1].date} -> ${d.days[i].date}`);
    }
  });

export const WindowRowSchema = z.strictObject({
  start: Instant,
  sun_pct: Pct,
  longest_dark_h: z.number().gte(0),
  earth_h_min: HoursOfDay,
  earth_h_mean: HoursOfDay,
  longest_comm_gap_h: z.number().gte(0),
  score: z.number().gte(0).lte(1),
});

export const WindowsSchema = z
  .strictObject({ site_id: SiteId, window_days: PosInt, rows: z.array(WindowRowSchema).min(1) })
  .superRefine((w, ctx) => {
    const limit = 24 * w.window_days;
    const starts = w.rows.map((r) => parseInstant(r.start));
    if (!starts.every(isMidnight)) fail(ctx, "every start must be 00:00:00Z");
    for (let i = 1; i < starts.length; i++) {
      if (starts[i] - starts[i - 1] !== DAY_MS) return fail(ctx, `non-consecutive rows: ${w.rows[i - 1].start} -> ${w.rows[i].start}`);
    }
    for (const r of w.rows) {
      if (r.longest_dark_h > limit || r.longest_comm_gap_h > limit) fail(ctx, `streak longer than the window (${limit} h) at ${r.start}`);
      if (r.earth_h_min > r.earth_h_mean + 1e-9) fail(ctx, `earth_h_min > earth_h_mean at ${r.start}`);
    }
  });

// ------------------------------------------------------------------ scene and trajectory

export const SceneEphemerisSchema = z
  .strictObject({
    frame: NonEmpty,
    start_utc: Instant,
    step_min: PosInt,
    n: PosInt,
    moon_pos_km: vec(3),
    sun_dir: vec(3),
    moon_frame: z.enum(["MOON_ME", "MOON_PA"]),
    moon_quat: vec(4),
    earth_frame: NonEmpty,
    earth_quat: vec(4),
  })
  .superRefine((e, ctx) => {
    checkVectors(ctx, "moon_pos_km", e.moon_pos_km, e.n, false);
    checkVectors(ctx, "sun_dir", e.sun_dir, e.n, true);
    checkVectors(ctx, "moon_quat", e.moon_quat, e.n, true);
    checkVectors(ctx, "earth_quat", e.earth_quat, e.n, true);
  });

export const TrajectorySchema = z
  .strictObject({
    id: NonEmpty,
    site_id: SiteId,
    mode: z.enum(["REAL", "ILLUSTRATIVE"]),
    frame: NonEmpty,
    t0_utc: Instant,
    t_s: z.array(z.number()).min(2),
    pos_km: vec(3),
    phases: z.strictObject({
      launch_utc: Instant,
      injection_utc: Instant,
      lunar_arrival_utc: Instant,
      landing_utc: Instant,
    }),
  })
  .superRefine((t, ctx) => {
    if (t.t_s[0] !== 0) fail(ctx, "t_s must start at 0");
    for (let i = 1; i < t.t_s.length; i++) {
      if (t.t_s[i] <= t.t_s[i - 1]) {
        fail(ctx, "t_s must be strictly increasing");
        break;
      }
    }
    if (t.pos_km.length !== t.t_s.length) fail(ctx, "pos_km and t_s have different lengths");
    const ph = t.phases;
    const times = [ph.launch_utc, ph.injection_utc, ph.lunar_arrival_utc, ph.landing_utc].map(parseInstant);
    if (times.some((x, i) => i > 0 && x < times[i - 1])) fail(ctx, "phases out of order (launch <= injection <= lunar_arrival <= landing)");
    const t0 = parseInstant(t.t0_utc);
    if (times[0] !== t0) fail(ctx, "t0_utc must equal phases.launch_utc");
    if (Math.abs((times[3] - t0) / 1000 - t.t_s[t.t_s.length - 1]) > 1) fail(ctx, "phases.landing_utc must match the last t_s instant");
    if (t.id !== `${t.site_id}_${yyyymmdd(times[3])}`) fail(ctx, `id must be ${t.site_id}_${yyyymmdd(times[3])}`);
  });

// ------------------------------------------------------------------ site features and terrain

export const AttributeSchema = z
  .strictObject({
    key: NonEmpty,
    label: NonEmpty,
    value: z.union([z.number(), z.string()]).nullable(),
    unit: z.string().nullable(),
    status: z.enum(["available", "not available"]),
    source: z.string().nullable(),
    method: z.string().nullable(),
  })
  .superRefine((a, ctx) => {
    if ((a.value === null) !== (a.status === "not available")) fail(ctx, `${a.key}: value is null if and only if status = 'not available'`);
    if (a.status === "available" && !(a.source && a.source.trim())) fail(ctx, `${a.key}: an available attribute needs a source (rule 1, spec 5.10)`);
  });

export const NearbyFeatureSchema = z.strictObject({
  name: NonEmpty,
  type: z.enum(["crater", "ridge", "massif", "other"]),
  lat: Lat,
  lon: Lon,
  distance_km: z.number().gte(0),
  source: NonEmpty,
});

export const SiteFeaturesSchema = z
  .strictObject({ site_id: SiteId, attributes: z.array(AttributeSchema), nearby_features: z.array(NearbyFeatureSchema) })
  .superRefine((f, ctx) => {
    if (new Set(f.attributes.map((a) => a.key)).size !== f.attributes.length) fail(ctx, "repeated attribute keys");
  });

export const TerrainHeaderSchema = z
  .strictObject({
    site_id: z.string().regex(/^([a-z0-9_]+|_polar)$/),
    lod: z.number().int().gte(0),
    frame: z.enum(["ENU_SITE", "POLAR_STEREO"]),
    origin: z.strictObject({ lat: Lat, lon: Lon, elevation_m: z.number() }),
    projection: z.string().nullable(),
    grid: z.strictObject({
      nx: z.number().int().gte(2),
      ny: z.number().int().gte(2),
      spacing_m: z.number().gt(0),
      x0_m: z.number(),
      y0_m: z.number(),
    }),
    height_encoding: z.literal("int16"),
    height_scale_m: z.number().gt(0),
    height_offset_m: z.number(),
    bin_file: z.string().regex(/^lod\d+\.bin$/),
    byte_length: z.number().int().gt(0),
  })
  .superRefine((h, ctx) => {
    if ((h.frame === "POLAR_STEREO") !== (h.projection !== null)) fail(ctx, "projection is required with POLAR_STEREO and null with ENU_SITE");
    if (h.bin_file !== `lod${h.lod}.bin`) fail(ctx, `bin_file must be lod${h.lod}.bin`);
    if (h.byte_length !== h.grid.nx * h.grid.ny * 2) fail(ctx, "byte_length must be nx · ny · 2");
  });

// ------------------------------------------------------------------ registry and types

export const SCHEMAS = {
  manifest: ManifestSchema,
  sites: SitesSchema,
  plans: PlansSchema,
  horizon: HorizonSchema,
  timeseries: TimeseriesSchema,
  daily: DailySchema,
  windows: WindowsSchema,
  scene_ephemeris: SceneEphemerisSchema,
  trajectory: TrajectorySchema,
  site_features: SiteFeaturesSchema,
  terrain_header: TerrainHeaderSchema,
} as const;

export type Kind = keyof typeof SCHEMAS;
export type Manifest = z.infer<typeof ManifestSchema>;
export type Site = z.infer<typeof SiteSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type Horizon = z.infer<typeof HorizonSchema>;
export type Timeseries = z.infer<typeof TimeseriesSchema>;
export type Daily = z.infer<typeof DailySchema>;
export type Windows = z.infer<typeof WindowsSchema>;
export type WindowRow = z.infer<typeof WindowRowSchema>;
export type SceneEphemeris = z.infer<typeof SceneEphemerisSchema>;
export type Trajectory = z.infer<typeof TrajectorySchema>;
export type SiteFeatures = z.infer<typeof SiteFeaturesSchema>;
export type TerrainHeader = z.infer<typeof TerrainHeaderSchema>;

/** Same rules as pipeline/validate.py kind_for_path (path relative to the data root, '/' separators). */
export function kindForPath(path: string): Kind {
  const parts = path.split("/");
  const name = parts[parts.length - 1];
  const parent = parts[parts.length - 2] ?? "";
  const prefix = name.split("__")[0];
  if (name.includes("__") && prefix in SCHEMAS) return prefix as Kind;
  if (name === "manifest.json" || name === "sites.json" || name === "plans.json") return name.slice(0, -5) as Kind;
  if (parent === "scene" && name === "ephemeris.json") return "scene_ephemeris";
  if (["horizon", "timeseries", "daily", "windows", "trajectory", "site_features"].includes(parent)) return parent as Kind;
  if (parts[parts.length - 3] === "terrain" && /^lod\d+\.json$/.test(name)) return "terrain_header";
  throw new Error(`cannot infer the kind of ${path}`);
}
