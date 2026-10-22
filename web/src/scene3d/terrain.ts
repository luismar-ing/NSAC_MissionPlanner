/**
 * Site terrain at real local scale (spec 5.9, 8.3; D9: simplified terrain in the MVP; contract §13).
 *
 * - Polar context `terrain/_polar/lod0` (POLAR_STEREO, ±302 km every 2 km) covers everything visible from a
 *   few km above any site (horizon ≈ 100 km away); the site levels lod0 (±20 km / 400 m), lod1 (±10 km /
 *   80 m) and lod2 (±3 km / 40 m) refine the centre.
 * - Loaded BY DISTANCE (camera → site), never before the landing approach: polar + lod0 within 200 km, lod1
 *   within 30 km, lod2 within 10 km. Each finer patch cuts a hole in the coarser one and carries a skirt on its
 *   edge, so seams never show cracks and surfaces never overlap (no depth fighting).
 * - Geometry is in the Moon-fixed frame, RELATIVE TO THE SITE (km → scene units), so the numbers stay small
 *   near the camera; the group is placed at the site anchor and turned with the Moon (camera-relative render).
 */
import * as THREE from "three";
import type { TerrainHeader } from "../lib/contract";
import { COLORS } from "../styles/tokens";
import type { Vec3 } from "./scale";
import { MOON_RADIUS_KM } from "./scale";

const M_PER_UNIT = 1e6; // 1 scene unit = 1000 km

const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => {
  const n = Math.hypot(...a) || 1;
  return [a[0] / n, a[1] / n, a[2] / n];
};
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** South polar stereographic (R = 1737.4 km, true scale at the pole) → lon, lat in degrees (checked with pyproj). */
export function polarToLonLat(x: number, y: number): [number, number] {
  const rho = Math.hypot(x, y);
  const c = 2 * Math.atan(rho / (2 * MOON_RADIUS_KM * 1000)); // angular distance from the south pole
  return [(Math.atan2(x, y) * 180) / Math.PI, -90 + (c * 180) / Math.PI];
}

/** Moon-fixed position (km) of latitude / longitude at a radius. */
export function bodyFixedKm(latDeg: number, lonDeg: number, radiusKm: number): Vec3 {
  const la = (latDeg * Math.PI) / 180;
  const lo = (lonDeg * Math.PI) / 180;
  return [radiusKm * Math.cos(la) * Math.cos(lo), radiusKm * Math.cos(la) * Math.sin(lo), radiusKm * Math.sin(la)];
}

/** East / North / Up unit vectors of the site, in the Moon-fixed frame (ENU_SITE of contract §13). */
export function enuBasis(siteBodyKm: Vec3): { east: Vec3; north: Vec3; up: Vec3 } {
  const up = unit(siteBodyKm);
  const east = unit(cross([0, 0, 1], up));
  return { east, north: cross(up, east), up };
}

export interface TerrainData {
  header: TerrainHeader;
  heights: Float32Array;
}

/** Index buffer of a grid's cells, skipping cells inside the square hole |x|,|y| < hole (m) around the site. */
function gridIndex(nx: number, ny: number, cellXY: (i: number, j: number) => [number, number], hole: number): number[] {
  const idx: number[] = [];
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      if (hole > 0) {
        const [x, y] = cellXY(i + 0.5, j + 0.5);
        if (Math.abs(x) < hole && Math.abs(y) < hole) continue;
      }
      const a = j * nx + i;
      const b = a + 1;
      const c = a + nx;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  return idx;
}

/**
 * Geometry of a site level (ENU_SITE): positions relative to the site in the Moon-fixed frame (scene units),
 * a hole of half-size `hole` m for the next finer level, and a skirt `skirt` m deep along the outer edge.
 */
export function siteLevelGeometry(t: TerrainData, siteBodyKm: Vec3, hole: number, skirt = 120): THREE.BufferGeometry {
  const { nx, ny, spacing_m, x0_m, y0_m } = t.header.grid;
  const { east, north, up } = enuBasis(siteBodyKm);
  const at = (x: number, y: number, h: number): Vec3 =>
    [0, 1, 2].map((c) => (east[c] * x + north[c] * y + up[c] * h) / M_PER_UNIT) as Vec3;
  const xy = (i: number, j: number): [number, number] => [x0_m + i * spacing_m, y0_m - j * spacing_m];
  const pos: number[] = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) pos.push(...at(...xy(i, j), t.heights[j * nx + i]));
  const idx = gridIndex(nx, ny, xy, hole);
  // skirt: the outer ring repeated `skirt` m lower, joined to the edge (hides cracks against the coarser level)
  const ring: number[] = [];
  for (let i = 0; i < nx; i++) ring.push(i);
  for (let j = 1; j < ny; j++) ring.push(j * nx + nx - 1);
  for (let i = nx - 2; i >= 0; i--) ring.push((ny - 1) * nx + i);
  for (let j = ny - 2; j > 0; j--) ring.push(j * nx);
  const base = pos.length / 3;
  ring.forEach((v, k) => {
    const i = v % nx;
    const j = Math.floor(v / nx);
    pos.push(...at(...xy(i, j), t.heights[v] - skirt));
    const nextV = ring[(k + 1) % ring.length];
    const a = v;
    const b = nextV;
    const c = base + k;
    const d = base + ((k + 1) % ring.length);
    idx.push(a, c, b, b, c, d);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // the skirt shades like the ground edge above it: with its own (horizontal) normals the low polar Sun lit it
  // like a wall and the patch border showed as a bright line
  const nrm = geo.getAttribute("normal") as THREE.BufferAttribute;
  ring.forEach((v, k) => nrm.setXYZ(base + k, nrm.getX(v), nrm.getY(v), nrm.getZ(v)));
  nrm.needsUpdate = true;
  return geo;
}

/** Geometry of the polar context, relative to the site, with a hole of half-size `hole` m around the site. */
export function polarGeometry(t: TerrainData, siteBodyKm: Vec3, hole: number): THREE.BufferGeometry {
  const { nx, ny, spacing_m, x0_m, y0_m } = t.header.grid;
  const base = MOON_RADIUS_KM + t.header.origin.elevation_m / 1000;
  const { east, north } = enuBasis(siteBodyKm);
  const body = (i: number, j: number, h: number) => {
    const [lon, lat] = polarToLonLat(x0_m + i * spacing_m, y0_m - j * spacing_m);
    return bodyFixedKm(lat, lon, base + h / 1000);
  };
  const pos: number[] = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const p = body(i, j, t.heights[j * nx + i]);
      pos.push((p[0] - siteBodyKm[0]) / 1000, (p[1] - siteBodyKm[1]) / 1000, (p[2] - siteBodyKm[2]) / 1000);
    }
  }
  // ENU (m) of a cell centre, for the hole test
  const cellXY = (i: number, j: number): [number, number] => {
    const p = body(i, j, 0);
    const d: Vec3 = [(p[0] - siteBodyKm[0]) * 1000, (p[1] - siteBodyKm[1]) * 1000, (p[2] - siteBodyKm[2]) * 1000];
    return [dot(d, east), dot(d, north)];
  };
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(gridIndex(nx, ny, cellXY, hole));
  geo.computeVertexNormals();
  return geo;
}

/** Distances (scene units, camera → site) at which each level is requested. */
export const LOAD_DISTANCE = { polar: 0.2, lod0: 0.2, lod1: 0.03, lod2: 0.01 } as const;
const HALF = { lod0: 20_000, lod1: 10_000, lod2: 3_000 } as const; // m, from contract §13 / D9

type Level = "polar" | "lod0" | "lod1" | "lod2";

/**
 * Loads the site's terrain progressively by camera distance and keeps the meshes (holes rebuilt when a finer
 * level arrives). `requested` records what was asked for (tests and the network check use it).
 */
export class TerrainManager {
  readonly group = new THREE.Group();
  readonly requested: Level[] = [];
  private data: Partial<Record<Level, TerrainData>> = {};
  private meshes: Partial<Record<Level, THREE.Mesh>> = {};
  private material = new THREE.MeshStandardMaterial({ color: COLORS.textMuted, roughness: 1, metalness: 0, transparent: true, opacity: 0 });

  constructor(
    private siteId: string,
    private siteBodyKm: Vec3,
    private load: (siteId: string, lod: number) => Promise<TerrainData>,
  ) {
    this.group.name = "terrain";
    this.group.visible = false;
  }

  private request(level: Level): void {
    if (this.requested.includes(level)) return;
    this.requested.push(level);
    const p = level === "polar" ? this.load("_polar", 0) : this.load(this.siteId, Number(level.slice(3)));
    p.then((d) => {
      this.data[level] = d;
      this.rebuild();
    }).catch(() => {
      /* terrain is a visual extra: without it the smooth Moon stays */
    });
  }

  /** (Re)builds every loaded level with the holes the finer loaded levels need. */
  private rebuild(): void {
    const finest = (l: Level): number => {
      if (l === "polar") return this.data.lod0 ? HALF.lod0 : 0;
      if (l === "lod0") return this.data.lod1 ? HALF.lod1 : 0;
      if (l === "lod1") return this.data.lod2 ? HALF.lod2 : 0;
      return 0;
    };
    for (const l of ["polar", "lod0", "lod1", "lod2"] as Level[]) {
      const d = this.data[l];
      if (!d) continue;
      const geo = l === "polar" ? polarGeometry(d, this.siteBodyKm, finest(l)) : siteLevelGeometry(d, this.siteBodyKm, finest(l));
      const old = this.meshes[l];
      if (old) {
        old.geometry.dispose();
        old.geometry = geo;
      } else {
        const m = new THREE.Mesh(geo, this.material);
        m.name = `terrain-${l}`;
        m.frustumCulled = false;
        this.meshes[l] = m;
        this.group.add(m);
      }
    }
  }

  /** Per frame: request levels by distance (scene units) and fade the terrain in with the local scale λ. */
  update(distance: number, lambda: number): void {
    if (lambda > 0) {
      if (distance < LOAD_DISTANCE.polar) this.request("polar");
      if (distance < LOAD_DISTANCE.lod0) this.request("lod0");
      if (distance < LOAD_DISTANCE.lod1) this.request("lod1");
      if (distance < LOAD_DISTANCE.lod2) this.request("lod2");
    }
    const fade = Math.min(1, Math.max(0, (lambda - 0.85) / 0.15));
    this.group.visible = fade > 0 && Object.keys(this.meshes).length > 0;
    this.material.opacity = fade;
    this.material.transparent = fade < 1;
    this.material.depthWrite = fade >= 1;
  }

  dispose(): void {
    for (const m of Object.values(this.meshes)) m?.geometry.dispose();
    this.material.dispose();
  }
}
