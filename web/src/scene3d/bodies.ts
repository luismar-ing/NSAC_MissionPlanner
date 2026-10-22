/**
 * The Earth, the Moon, the Sun and the stars of the live scene (spec 8.2), placed and oriented from the scene
 * ephemeris at missionTime (ephemeris.ts). World frame = J2000, Earth at the origin, scene units of 1000 km
 * (scale.ts, D8). The Sun is a direction: a directional light along `sunDir` plus a glow sprite at "infinity".
 */
import * as THREE from "three";
import { COLORS } from "../styles/tokens";
import type { SceneState } from "./ephemeris";
import type { SceneHandle } from "./renderer";
import { bodyRadius, EARTH_RADII_KM, MOON_RADIUS_KM, SPACE_SCALE, toScene, type ScaleMode } from "./scale";

/**
 * three.js maps an equirectangular texture with u = 0.5 (longitude 0) on +X, the north pole on +Y and
 * longitude +90° on −Z. Body-fixed frames (IAU_EARTH, MOON_ME) have longitude 0 on +X, +90° on +Y and the
 * north pole on +Z: a +90° rotation about X takes the sphere's local frame to the body-fixed frame.
 */
export const LOCAL_TO_BODY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);

/** Render-space distance of the things "at infinity" (Sun glow, stars), within the camera far plane. */
const SKY_DISTANCE = 5e6;

export interface Bodies {
  earth: THREE.Mesh;
  moon: THREE.Mesh;
  sunLight: THREE.DirectionalLight;
  sunGlow: THREE.Sprite;
  stars: THREE.Points;
  ambient: THREE.AmbientLight;
}

function glowTexture(): THREE.Texture {
  // radial gradient drawn once on a small canvas (no image file needed)
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.15, "rgba(255,255,255,0.9)");
    grad.addColorStop(0.4, "rgba(255,255,255,0.25)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(c);
}

/** Deterministic pseudo-random generator (mulberry32) so the decorative star field is the same every time. */
function rng(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Decorative star field (not a star catalogue): uniform random directions, stable between sessions. */
function starField(count = 2500): THREE.Points {
  const r = rng(20261022);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const base = new THREE.Color(COLORS.text);
  for (let i = 0; i < count; i++) {
    const z = 2 * r() - 1;
    const a = 2 * Math.PI * r();
    const s = Math.sqrt(1 - z * z);
    pos.set([s * Math.cos(a) * SKY_DISTANCE, s * Math.sin(a) * SKY_DISTANCE, z * SKY_DISTANCE], i * 3);
    const b = 0.25 + 0.75 * r() ** 3; // few bright stars, many faint ones
    col.set([base.r * b, base.g * b, base.b * b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, depthWrite: false });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = -1;
  return pts;
}

export function createBodies(scene: THREE.Scene, mode: ScaleMode = SPACE_SCALE): Bodies {
  const earthGeo = new THREE.SphereGeometry(bodyRadius(EARTH_RADII_KM.equatorial, mode), 128, 64);
  const earth = new THREE.Mesh(earthGeo, new THREE.MeshStandardMaterial({ color: COLORS.textMuted, roughness: 1, metalness: 0 }));
  earth.name = "earth";
  // the Earth is an ellipsoid: polar radius along the body Z axis = local Y of the sphere
  earth.scale.set(1, EARTH_RADII_KM.polar / EARTH_RADII_KM.equatorial, 1);

  const moonGeo = new THREE.SphereGeometry(bodyRadius(MOON_RADIUS_KM, mode), 128, 64);
  const moon = new THREE.Mesh(moonGeo, new THREE.MeshStandardMaterial({ color: COLORS.textMuted, roughness: 1, metalness: 0 }));
  moon.name = "moon";

  const sunLight = new THREE.DirectionalLight(COLORS.sun, 3);
  sunLight.name = "sun-light";
  const ambient = new THREE.AmbientLight(COLORS.sun, 0.04); // a hint of the night side, like a very faint earthshine
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: COLORS.sun, depthWrite: false, sizeAttenuation: false }));
  sunGlow.name = "sun-glow";
  sunGlow.scale.set(0.12, 0.12, 1);
  const stars = starField();

  scene.add(earth, moon, sunLight, sunLight.target, ambient, sunGlow, stars);
  return { earth, moon, sunLight, sunGlow, stars, ambient };
}

/** Loads the web textures (T4.1.c) onto the bodies; 2k on small screens or limited GPUs, 4k otherwise. */
export function loadTextures(b: Bodies, baseUrl: string, maxTextureSize: number): void {
  const tag = maxTextureSize >= 4096 && window.innerWidth >= 900 ? "4k" : "2k";
  const loader = new THREE.TextureLoader();
  for (const [mesh, name] of [
    [b.earth, "earth"],
    [b.moon, "moon"],
  ] as const) {
    loader.load(`${baseUrl}textures/${name}_${tag}.jpg`, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.map = tex;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
    });
  }
}

/** Places the bodies at the state's instant. World positions go to the handle (camera-relative rendering). */
export function updateBodies(b: Bodies, s: SceneState, h: SceneHandle, mode: ScaleMode = SPACE_SCALE): void {
  h.world.set(b.earth, [0, 0, 0]);
  h.world.set(b.moon, toScene(s.moonKm, mode));
  b.earth.quaternion.set(...s.earthQuat).multiply(LOCAL_TO_BODY);
  b.moon.quaternion.set(...s.moonQuat).multiply(LOCAL_TO_BODY);
  // directional light: only the direction matters (position − target), sunlight arrives along −sunDir
  b.sunLight.position.set(...s.sunDir);
  b.sunLight.target.position.set(0, 0, 0);
  b.sunLight.target.updateMatrixWorld();
  // things at infinity stay around the camera (the render-space origin)
  b.sunGlow.position.set(s.sunDir[0] * SKY_DISTANCE, s.sunDir[1] * SKY_DISTANCE, s.sunDir[2] * SKY_DISTANCE);
  b.stars.position.set(0, 0, 0);
}
