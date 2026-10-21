/**
 * Shared scales of the comparison tray (spec 8.1, 9): every panel uses the SAME vertical axis so differences
 * between plans are visible without reading numbers. Azimuth is always 0–360°.
 */
import type { PlanData } from "./planData";

export interface ElevationScale {
  minDeg: number;
  maxDeg: number;
}

/** Common elevation range over all visible plans (masks + Sun/Earth tracks in their windows), with margin. */
export function sharedElevationScale(plans: PlanData[], margin = 0.5): ElevationScale {
  let lo = -2;
  let hi = 2;
  for (const p of plans) {
    for (const v of p.horizon.elev_deg) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    for (const arr of [p.series.sunEl, p.series.earthEl]) {
      for (let i = 0; i < arr.length; i++) {
        lo = Math.min(lo, arr[i]);
        hi = Math.max(hi, arr[i]);
      }
    }
  }
  return { minDeg: Math.floor(lo - margin), maxDeg: Math.ceil(hi + margin) };
}
