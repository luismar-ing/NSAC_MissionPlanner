/**
 * Lit polar map as a step of the zoom (T6.2.b, spec 8.3): the published LOLA average illumination of 85°S-90°S
 * (PGDA, Mazarico et al. 2011; pipeline/illumination_map.py) laid on the Moon's south pole as a disc. It is a
 * child of the Moon mesh, so it follows the Moon's position, orientation and scale. Unlit, in the Sun's colour:
 * dark = (almost) never sunlit, orange = sunlit most of the time. It shows while the camera closes in on the pole
 * during the landing and fades out before the real terrain takes over. Context only, never a site metric.
 */
import * as THREE from "three";
import type { MissionTimeline } from "../lib/mission";
import { COLORS } from "../styles/tokens";
import { LOCAL_TO_BODY } from "./bodies";
import { approachProgress } from "./cameraDirector";
import { MOON_RADIUS_KM } from "./scale";
import { bodyFixedKm, polarToLonLat } from "./terrain";

export interface PolarMapHeader {
  extent_m: { left: number; right: number; bottom: number; top: number };
  size_px: number;
}

/** The disc floats this fraction of the radius above the drawn sphere (no depth fighting with it). */
export const POLAR_MAP_LIFT = 1.002;
const OPACITY = 0.75; // some of the relief shows through the data layer

const smoothstep = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/**
 * Disc over the projection's inscribed circle (85°S for this product), in the Moon sphere's own local frame (the
 * sphere geometry has radius `sphereR`; LOCAL_TO_BODY maps local to body-fixed). UVs follow the map image.
 */
export function polarMapGeometry(h: PolarMapHeader, sphereR: number, rings = 48, sectors = 128): THREE.BufferGeometry {
  const { left, right, bottom, top } = h.extent_m;
  const half = Math.min(right, top, -left, -bottom);
  const k = (sphereR / MOON_RADIUS_KM) * POLAR_MAP_LIFT;
  const pos: number[] = [];
  const uv: number[] = [];
  for (let i = 0; i <= rings; i++) {
    for (let j = 0; j <= sectors; j++) {
      const r = (half * i) / rings;
      const a = (2 * Math.PI * j) / sectors;
      const x = r * Math.sin(a);
      const y = r * Math.cos(a);
      const [lon, lat] = polarToLonLat(x, y);
      const p = bodyFixedKm(lat, lon, MOON_RADIUS_KM);
      pos.push(p[0] * k, p[1] * k, p[2] * k);
      uv.push((x - left) / (right - left), (y - bottom) / (top - bottom));
    }
  }
  const idx: number[] = [];
  const row = sectors + 1;
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < sectors; j++) {
      const a = i * row + j;
      const b = a + row;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.applyQuaternion(LOCAL_TO_BODY.clone().invert()); // body-fixed -> the sphere's local frame
  return geo;
}

/**
 * Opacity at instant t: fades in during the first hour after lunar arrival (the swing round the south pole), and
 * out as the final approach goes on, gone before the switch to the real local scale (λ) brings in the terrain.
 */
export function polarMapOpacity(tl: MissionTimeline, t: number, lambda: number): number {
  const fadeIn = smoothstep((t - tl.lunarArrivalMs) / 3_600_000);
  // the camera only looks down on the pole during the final approach: keep the map until just before the switch to
  // real local scale (λ starts at approach progress 0.82, cameraDirector.localBlend)
  const fadeOut = 1 - smoothstep((approachProgress(tl, t) - 0.68) / 0.12);
  return OPACITY * fadeIn * fadeOut * (1 - smoothstep(lambda / 0.2));
}

/** Loads the header and the map image (an extra: on any failure the scene simply has no map). */
export function createPolarMap(baseUrl: string, sphereR: number): THREE.Mesh {
  // double-sided: the disc's winding is whatever the ring order gives, and it is only ever seen from outside
  const material = new THREE.MeshBasicMaterial({ color: COLORS.sun, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
  mesh.name = "polar-map";
  mesh.visible = false;
  mesh.frustumCulled = false;
  fetch(`${baseUrl}data/illumination/south_avg.json`)
    .then((r) => (r.ok ? (r.json() as Promise<PolarMapHeader>) : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((h) => {
      new THREE.TextureLoader().load(`${baseUrl}data/illumination/south_avg.png`, (tex) => {
        // the pixels are data (fraction x 255), not a colour picture: read them linearly, so 0.5 shows as half
        tex.colorSpace = THREE.LinearSRGBColorSpace;
        material.map = tex;
        material.needsUpdate = true;
        mesh.geometry.dispose();
        mesh.geometry = polarMapGeometry(h, sphereR);
      });
    })
    .catch(() => {
      /* no map: the zoom goes on without the step */
    });
  return mesh;
}
