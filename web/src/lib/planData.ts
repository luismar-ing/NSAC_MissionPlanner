/**
 * Everything a 2D comparison panel needs for one plan (spec 8.1): the plan, its site, the horizon mask,
 * the site's series sliced to the plan window [arrival, arrival + L) and the window metrics row.
 */
import type { Horizon, Plan, Site, Timeseries, WindowRow } from "./contract";
import { parseInstant } from "./contract";
import type { DataStore } from "./data";

export interface PlanWindowSeries {
  startMs: number; // arrival (UTC ms)
  stepMin: number;
  n: number; // samples in the window
  sunAz: Float32Array; // degrees
  sunEl: Float32Array;
  earthAz: Float32Array;
  earthEl: Float32Array;
  sunVis: Uint8Array;
  earthVis: Uint8Array;
}

export interface PlanData {
  plan: Plan;
  site: Site;
  horizon: Horizon;
  series: PlanWindowSeries;
  metrics: WindowRow;
}

/** Slice of the site's timeseries covering the plan window, in degrees (dequantised). */
export function sliceWindow(ts: Timeseries, arrivalUtc: string, windowDays: number): PlanWindowSeries {
  const step = ts.step_min * 60_000;
  const startMs = parseInstant(arrivalUtc);
  const k0 = Math.round((startMs - parseInstant(ts.start_utc)) / step);
  const n = Math.round((windowDays * 86_400_000) / step);
  if (k0 < 0 || k0 + n > ts.n) throw new Error(`window ${arrivalUtc} + ${windowDays} d is outside the timeseries`);
  const deg = (a: number[]) => Float32Array.from(a.slice(k0, k0 + n), (v) => v * ts.angle_scale);
  return {
    startMs,
    stepMin: ts.step_min,
    n,
    sunAz: deg(ts.sun_az),
    sunEl: deg(ts.sun_el),
    earthAz: deg(ts.earth_az),
    earthEl: deg(ts.earth_el),
    sunVis: Uint8Array.from(ts.sun_vis.slice(k0, k0 + n)),
    earthVis: Uint8Array.from(ts.earth_vis.slice(k0, k0 + n)),
  };
}

export async function loadPlanData(data: DataStore, plan: Plan, sites: Site[]): Promise<PlanData> {
  const site = sites.find((s) => s.id === plan.site_id);
  if (!site) throw new Error(`unknown site ${plan.site_id}`);
  const [horizon, ts, windows] = await Promise.all([
    data.horizon(plan.site_id),
    data.timeseries(plan.site_id),
    data.windows(plan.site_id, plan.window_days),
  ]);
  const metrics = windows.rows.find((r) => r.start === plan.arrival_utc);
  if (!metrics) throw new Error(`no window metrics for ${plan.id}`);
  return { plan, site, horizon, series: sliceWindow(ts, plan.arrival_utc, plan.window_days), metrics };
}

/** Sample index at a relative time (hours since arrival), clamped to the window. */
export function sampleAt(series: PlanWindowSeries, hours: number): number {
  return Math.min(series.n - 1, Math.max(0, Math.floor((hours * 60) / series.stepMin)));
}
