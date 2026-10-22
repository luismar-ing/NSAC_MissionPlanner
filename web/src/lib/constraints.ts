/**
 * Constraint filtering and metric index (spec 5.6, 8.5, 8.7). Pure functions over typed arrays so the
 * calendar can re-highlight every cell in well under 100 ms when a control moves.
 * Rules mirror pipeline/windows.py meets_constraints: limits inclusive, a disabled control (null) is not evaluated.
 */
import type { WindowRow } from "./contract";
import type { Constraints } from "../store/appStore";

export const METRICS = ["sun_pct", "longest_dark_h", "earth_h_min", "earth_h_mean", "longest_comm_gap_h", "score"] as const;
export type Metric = (typeof METRICS)[number];

/** Metrics for one window length L: one Float32Array per metric, laid out [site][day] (row-major by site). */
export interface WindowIndex {
  windowDays: number;
  siteIds: string[];
  nDays: number;
  firstArrival: string; // YYYY-MM-DD
  metrics: Record<Metric, Float32Array>;
  /** The rows as loaded (float64): what the views DISPLAY. Float32 is only for the fast constraint mask. */
  rows: Record<string, WindowRow[]>;
}

export function meetsConstraints(row: Pick<WindowRow, "sun_pct" | "longest_dark_h" | "earth_h_min">, c: Constraints): boolean {
  return (
    (c.minSunPct === null || row.sun_pct >= c.minSunPct) &&
    (c.maxDarkH === null || row.longest_dark_h <= c.maxDarkH) &&
    (c.minEarthH === null || row.earth_h_min >= c.minEarthH)
  );
}

/** Builds the index from windows/{site}_{L}d.json rows (all sites must share the same arrival days). */
export function buildWindowIndex(windowDays: number, rowsBySite: Record<string, WindowRow[]>, siteIds: string[]): WindowIndex {
  const nDays = rowsBySite[siteIds[0]].length;
  const metrics = Object.fromEntries(METRICS.map((m) => [m, new Float32Array(siteIds.length * nDays)])) as Record<Metric, Float32Array>;
  siteIds.forEach((sid, s) => {
    const rows = rowsBySite[sid];
    if (rows.length !== nDays || rows[0].start !== rowsBySite[siteIds[0]][0].start)
      throw new Error(`windows of ${sid} do not share the arrival days of ${siteIds[0]}`);
    rows.forEach((r, d) => {
      for (const m of METRICS) metrics[m][s * nDays + d] = r[m];
    });
  });
  return { windowDays, siteIds, nDays, firstArrival: rowsBySite[siteIds[0]][0].start.slice(0, 10), metrics, rows: rowsBySite };
}

/** 1 where the window meets the constraints, laid out like the metrics ([site][day]). */
export function validMask(index: WindowIndex, c: Constraints, out?: Uint8Array): Uint8Array {
  const { sun_pct: sun, longest_dark_h: dark, earth_h_min: earth } = index.metrics;
  const n = sun.length;
  const mask = out ?? new Uint8Array(n);
  // Float32 storage: compare against the constraint rounded the same way so equality at the limit holds.
  const x = c.minSunPct === null ? null : Math.fround(c.minSunPct);
  const y = c.maxDarkH === null ? null : Math.fround(c.maxDarkH);
  const z = c.minEarthH === null ? null : Math.fround(c.minEarthH);
  for (let i = 0; i < n; i++) {
    mask[i] = (x === null || sun[i] >= x) && (y === null || dark[i] <= y) && (z === null || earth[i] >= z) ? 1 : 0;
  }
  return mask;
}

export function dayIndex(index: WindowIndex, arrival: string): number {
  return Math.round((Date.parse(arrival.slice(0, 10)) - Date.parse(index.firstArrival)) / 86_400_000);
}

/** Metrics of one cell (site, arrival day), or null outside the range. */
/** Metrics of one cell for display: from the loaded rows (float64), so they match the tray and the site panel. */
export function lookup(index: WindowIndex, siteId: string, arrival: string): Record<Metric, number> | null {
  const s = index.siteIds.indexOf(siteId);
  const d = dayIndex(index, arrival);
  if (s < 0 || d < 0 || d >= index.nDays) return null;
  const row = index.rows[siteId][d];
  return Object.fromEntries(METRICS.map((m) => [m, row[m]])) as Record<Metric, number>;
}

/** Number of valid cells (handy for the UI and for tests). */
export function countValid(mask: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < mask.length; i++) n += mask[i];
  return n;
}
