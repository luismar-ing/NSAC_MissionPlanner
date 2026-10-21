/**
 * Azimuth/elevation → pixel projection shared by the comparison silhouettes (T3.3.b) and the horizon
 * panorama (T3.4). One function for both guarantees that the Sun and Earth sit at the same place relative to
 * the terrain in every view (spec 9: the same thing looks the same everywhere).
 */

export interface Projection {
  width: number;
  height: number;
  startAz: number; // azimuth at the left edge (0 = North at the left)
  minEl: number; // elevation at the bottom edge (deg)
  maxEl: number; // elevation at the top edge (deg)
}

/**
 * Builds a projection. `exaggeration` = vertical px per degree ÷ horizontal px per degree; null = fit [lo, hi].
 * With an exaggeration the bottom edge stays at `minDeg`, so the terrain (the subject) never leaves the view;
 * a higher exaggeration zooms on the horizon and lets high Sun/Earth positions go off the top.
 */
export function makeProjection(
  width: number,
  height: number,
  range: { minDeg: number; maxDeg: number },
  exaggeration: number | null = null,
  startAz = 0,
): Projection {
  if (exaggeration === null) return { width, height, startAz, minEl: range.minDeg, maxEl: range.maxDeg };
  const span = height / (exaggeration * (width / 360)); // degrees shown vertically
  return { width, height, startAz, minEl: range.minDeg, maxEl: range.minDeg + span };
}

/** Actual vertical exaggeration of a projection (for the label "Vertical ×N"). */
export function exaggerationOf(p: Projection): number {
  return p.height / (p.maxEl - p.minEl) / (p.width / 360);
}

export function azToX(p: Projection, az: number): number {
  return ((((az - p.startAz) % 360) + 360) % 360) * (p.width / 360);
}

export function elToY(p: Projection, el: number): number {
  return ((p.maxEl - el) / (p.maxEl - p.minEl)) * p.height;
}

/** Pixel size of an angular diameter (horizontal scale), e.g. the 0.53° Sun disc. */
export function angularSizePx(p: Projection, deg: number): number {
  return deg * (p.width / 360);
}

/** SVG path of the terrain silhouette (filled down to the bottom edge) from a 360-bin mask. */
export function silhouettePath(p: Projection, elevDeg: number[], azStep = 360 / elevDeg.length): string {
  const pts: string[] = [];
  const n = elevDeg.length;
  // walk the panel from left to right, wrapping around the mask
  for (let i = 0; i <= n; i++) {
    const az = p.startAz + i * azStep;
    const bin = Math.round(((((az % 360) + 360) % 360) / azStep)) % n;
    const x = i * azStep * (p.width / 360);
    pts.push(`${x.toFixed(1)},${elToY(p, elevDeg[bin]).toFixed(1)}`);
  }
  return `M0,${p.height} L${pts.join(" L")} L${p.width},${p.height} Z`;
}

/** SVG path of a sky track, broken where it wraps around the left/right edge. */
export function trackPath(p: Projection, az: ArrayLike<number>, el: ArrayLike<number>, stride = 1): string {
  let d = "";
  let prevX: number | null = null;
  for (let i = 0; i < az.length; i += stride) {
    const x = azToX(p, az[i]);
    const y = elToY(p, el[i]);
    const jump = prevX === null || Math.abs(x - prevX) > p.width / 2;
    d += `${jump ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)} `;
    prevX = x;
  }
  return d.trim();
}
