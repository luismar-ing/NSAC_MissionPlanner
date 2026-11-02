/**
 * Battery state of charge over a plan's window (T6.4.a, extra). A simple energy balance on the site's own
 * sunlight series (sun_vis, spec 5.3): in sunlight the panels deliver SOLAR_W and the lander draws LOAD_W, so the
 * battery charges by the difference up to its capacity; in darkness it discharges at LOAD_W down to empty.
 *
 * The parameters are ASSUMPTIONS for illustration (a generic small lander), not data about any mission, and the
 * interface says so. No panel pointing, no temperature, no efficiency losses: the point is to show how the
 * longest dark stretch, not the sunlit percentage, decides whether a lander survives.
 */
export interface BatteryParams {
  capacityWh: number;
  loadW: number;
  solarW: number;
  startSoc: number; // 0-1 at arrival
}

/** ASSUMED parameters (round numbers, labelled as assumptions in the UI). */
export const ASSUMED_BATTERY: BatteryParams = { capacityWh: 5000, loadW: 250, solarW: 750, startSoc: 1 };

export interface BatteryRun {
  /** State of charge (0-1) at the end of each sample of the series. */
  soc: Float32Array;
  minSoc: number;
  minAt: number; // sample index of the minimum
  /** Samples spent empty (the lander would be out of power). */
  emptySamples: number;
}

export function batteryRun(sunVis: ArrayLike<number>, stepMin: number, p: BatteryParams = ASSUMED_BATTERY): BatteryRun {
  const n = sunVis.length;
  const soc = new Float32Array(n);
  const hours = stepMin / 60;
  let e = p.startSoc * p.capacityWh;
  let minSoc = p.startSoc;
  let minAt = 0;
  let emptySamples = 0;
  for (let i = 0; i < n; i++) {
    const net = (sunVis[i] ? p.solarW : 0) - p.loadW;
    e = Math.min(p.capacityWh, Math.max(0, e + net * hours));
    soc[i] = e / p.capacityWh;
    if (soc[i] < minSoc) {
      minSoc = soc[i];
      minAt = i;
    }
    if (e <= 0) emptySamples++;
  }
  return { soc, minSoc, minAt, emptySamples };
}

/** Hours of darkness a full battery lasts at the assumed load (capacity / load). */
export const batteryHours = (p: BatteryParams = ASSUMED_BATTERY) => p.capacityWh / p.loadW;
