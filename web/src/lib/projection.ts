/**
 * Azimuth/elevation → pixel projection shared by the comparison silhouettes (T3.3.b) and the horizon
 * panorama (T3.4). One function for both guarantees that the Sun and Earth sit at the same place relative to
 * the terrain in every view (spec 9: the same thing looks the same everywhere).
 */

export interface Projection {
  width: number;
  height: number;
  startAz: number; // azimuth at the left edge (0 = North at the left)
  fov: number; // horizontal field of view (deg); 360 = full panorama
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
  fov = 360,
): Projection {
  if (exaggeration === null) return { width, height, startAz, fov, minEl: range.minDeg, maxEl: range.maxDeg };
  const span = height / (exaggeration * (width / fov)); // degrees shown vertically
  return { width, height, startAz, fov, minEl: range.minDeg, maxEl: range.minDeg + span };
}

/** Start azimuth that centres a field of view on an azimuth. */
export function centredOn(az: number, fov: number): number {
  return (((az - fov / 2) % 360) + 360) % 360;
}

/** Horizontal pixels per degree. */
export function pxPerDeg(p: Projection): number {
  return p.width / p.fov;
}

/** Actual vertical exaggeration of a projection (for the label "Vertical ×N"). */
export function exaggerationOf(p: Projection): number {
  return p.height / (p.maxEl - p.minEl) / pxPerDeg(p);
}

/** x of an azimuth; outside the field of view it falls beyond the right edge (clipped by the SVG). */
export function azToX(p: Projection, az: number): number {
  return ((((az - p.startAz) % 360) + 360) % 360) * pxPerDeg(p);
}

export function elToY(p: Projection, el: number): number {
  return ((p.maxEl - el) / (p.maxEl - p.minEl)) * p.height;
}

/** Pixel size of an angular diameter (horizontal scale), e.g. the 0.53° Sun disc. */
export function angularSizePx(p: Projection, deg: number): number {
  return deg * pxPerDeg(p);
}

/**
 * SVG path of the terrain silhouette (filled down to the bottom edge) from a mask of bins of `azStep`
 * degrees (bin i at azimuth i·azStep). Points sit at the bins' own azimuths, so any start azimuth works.
 */
export function silhouettePath(p: Projection, elevDeg: number[], azStep = 360 / elevDeg.length): string {
  const n = elevDeg.length;
  const k = pxPerDeg(p);
  const first = Math.floor(p.startAz / azStep);
  const last = Math.ceil((p.startAz + p.fov) / azStep);
  const xs: string[] = [];
  const pts: string[] = [];
  for (let b = first; b <= last; b++) {
    const x = ((b * azStep - p.startAz) * k).toFixed(1);
    xs.push(x);
    pts.push(`${x},${elToY(p, elevDeg[((b % n) + n) % n]).toFixed(1)}`);
  }
  return `M${xs[0]},${p.height} L${pts.join(" L")} L${xs[xs.length - 1]},${p.height} Z`;
}

/** SVG path of a sky track (samples [from, to)), broken where it wraps around the left/right edge. */
export function trackPath(p: Projection, az: ArrayLike<number>, el: ArrayLike<number>, stride = 1, from = 0, to = az.length): string {
  let d = "";
  let prevX: number | null = null;
  for (let i = from; i < to; i += stride) {
    const x = azToX(p, az[i]);
    const y = elToY(p, el[i]);
    const jump = prevX === null || Math.abs(x - prevX) > p.width / 2;
    d += `${jump ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)} `;
    prevX = x;
  }
  return d.trim();
}
