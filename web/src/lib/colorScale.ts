/**
 * Sequential colour ramps for the calendar heatmap (spec 8.5, 9). One hue per meaning (spec 9: the same
 * colour means the same thing everywhere): energy = Sun orange, comms = Earth blue, combined = "both" green.
 * On the dark surface "near zero" recedes toward the panel and high values are bright. Ramps are
 * interpolated in OKLab from the design tokens only (no new colours).
 */
import { COLORS } from "../styles/tokens";
import type { Metric } from "./constraints";

export type CalendarMode = "combined" | "energy" | "comms";

export const MODE_METRIC: Record<CalendarMode, Metric> = { combined: "score", energy: "sun_pct", comms: "earth_h_mean" };
const MODE_HUE: Record<CalendarMode, keyof typeof COLORS> = { combined: "both", energy: "sun", comms: "earth" };
/** Fixed domains so the colours mean the same value in every L and every session. */
export const MODE_DOMAIN: Record<CalendarMode, [number, number]> = { combined: [0, 1], energy: [0, 100], comms: [0, 24] };

type Lab = [number, number, number];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toLin = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function hexToOklab(hex: string): Lab {
  const [r, g, b] = hexToRgb(hex).map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

export function oklabToRgb([L, a, b]: Lab): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return rgb.map((c) => Math.round(Math.min(255, Math.max(0, toSrgb(c))))) as [number, number, number];
}

const mix = (a: Lab, b: Lab, t: number): Lab => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/**
 * 256-entry lookup table of "rgb(r,g,b)" strings: from the hue blended into the panel (≈ 0) to the pure
 * token hue (max), so the top colour is exactly the Sun / Earth / "both" colour used everywhere else.
 * (A lighter tint above the hue was tried and dropped: it leaves the sRGB gamut and clipping breaks the
 * monotonic lightness.)
 */
export function rampLut(mode: CalendarMode, steps = 256): string[] {
  const hue = hexToOklab(COLORS[MODE_HUE[mode]]);
  const low = mix(hexToOklab(COLORS.panelRaised), hue, 0.12);
  return Array.from({ length: steps }, (_, i) => {
    const [r, g, b] = oklabToRgb(mix(low, hue, i / (steps - 1)));
    return `rgb(${r},${g},${b})`;
  });
}

/** OKLab lightness of each LUT entry (used by tests: must increase monotonically). */
export function lutLightness(lut: string[]): number[] {
  return lut.map((c) => {
    const [r, g, b] = c.slice(4, -1).split(",").map(Number);
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    return hexToOklab(hex)[0];
  });
}

/** Index into the LUT for a value in the mode's fixed domain. */
export function lutIndex(mode: CalendarMode, value: number, steps = 256): number {
  const [lo, hi] = MODE_DOMAIN[mode];
  const t = Math.min(1, Math.max(0, (value - lo) / (hi - lo)));
  return Math.round(t * (steps - 1));
}
