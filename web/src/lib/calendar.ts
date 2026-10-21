/**
 * Pure geometry and colour mapping of the arrival calendar (spec 8.5). The calendar is drawn TRANSPOSED
 * (one row per site, one column per arrival day) so the full year fits as a compact strip on a 1920×1080
 * screen (spec 8.0 "calendario compacto"); see PROGRESS.md, T3.2.a.
 */
import { lutIndex, MODE_METRIC, type CalendarMode } from "./colorScale";
import type { WindowIndex } from "./constraints";

export interface CalendarLayout {
  width: number; // CSS px
  labelW: number;
  axisH: number;
  rowH: number;
  rowGap: number;
  nSites: number;
  nDays: number;
}

export function makeLayout(width: number, nSites: number, nDays: number): CalendarLayout {
  return { width, labelW: Math.min(220, Math.max(130, width * 0.14)), axisH: 22, rowH: 26, rowGap: 2, nSites, nDays };
}

export const plotWidth = (l: CalendarLayout) => l.width - l.labelW;
export const dayWidth = (l: CalendarLayout) => plotWidth(l) / l.nDays;
export const calendarHeight = (l: CalendarLayout) => l.axisH + l.nSites * (l.rowH + l.rowGap);

/** Pixel rectangle of a cell (x, y, w, h) in CSS px. */
export function cellRect(l: CalendarLayout, site: number, day: number): [number, number, number, number] {
  const dw = dayWidth(l);
  return [l.labelW + day * dw, l.axisH + site * (l.rowH + l.rowGap), dw, l.rowH];
}

/** Cell under a point, or null (gaps between rows and the label/axis areas return null). */
export function cellAt(l: CalendarLayout, x: number, y: number): { site: number; day: number } | null {
  if (x < l.labelW || x >= l.width || y < l.axisH) return null;
  const row = Math.floor((y - l.axisH) / (l.rowH + l.rowGap));
  const within = (y - l.axisH) % (l.rowH + l.rowGap);
  if (row >= l.nSites || within >= l.rowH) return null;
  const day = Math.floor((x - l.labelW) / dayWidth(l));
  return day >= 0 && day < l.nDays ? { site: row, day } : null;
}

/** LUT index of every cell for a mode ([site][day] layout, like the index). */
export function cellColorIndices(index: WindowIndex, mode: CalendarMode, out?: Uint8Array): Uint8Array {
  const values = index.metrics[MODE_METRIC[mode]];
  const res = out ?? new Uint8Array(values.length);
  for (let i = 0; i < values.length; i++) res[i] = lutIndex(mode, values[i]);
  return res;
}

/** Month boundaries (day offsets and short labels) for the top axis. */
export function monthTicks(firstArrival: string, nDays: number): { day: number; label: string }[] {
  const t0 = Date.parse(`${firstArrival}T00:00:00Z`);
  const ticks: { day: number; label: string }[] = [];
  for (let d = 0; d < nDays; d++) {
    const date = new Date(t0 + d * 86_400_000);
    if (date.getUTCDate() === 1) ticks.push({ day: d, label: date.toLocaleString("en", { month: "short", timeZone: "UTC" }) });
  }
  return ticks;
}

export function arrivalDate(firstArrival: string, day: number): string {
  return new Date(Date.parse(`${firstArrival}T00:00:00Z`) + day * 86_400_000).toISOString().slice(0, 10);
}
