/**
 * The rocket of the live scene (spec 5.8, 8.2). Own procedural geometry (no external model, so no licence to
 * track, rule 12): a generic two-stage launcher with fairing, interstage, fins and nozzle, built from a lathe
 * profile. It is not a model of any real vehicle.
 *
 * Scale (D8): a real launcher (~100 m) would be invisible at Earth–Moon distances, so the rocket is drawn at a
 * constant APPARENT size (8 % of the view height) wherever it is; the scale indicator says so.
 * Local axes: +Y = forward (nose), length 1 before scaling, base at y = 0.
 */
import * as THREE from "three";
import { COLORS } from "../styles/tokens";

/** Lathe profile (radius, height) of the rocket body, base to nose; length 1. */
const PROFILE: [number, number][] = [
  [0.0, 0.0],
  [0.05, 0.0], // nozzle exit
  [0.035, 0.05], // nozzle throat
  [0.06, 0.07], // engine section
  [0.06, 0.55], // first stage
  [0.055, 0.58], // interstage
  [0.05, 0.6],
  [0.05, 0.78], // second stage
  [0.058, 0.8], // fairing shoulder
  [0.058, 0.88],
  [0.04, 0.95], // ogive nose
  [0.015, 0.99],
  [0.0, 1.0],
];

export function createRocket(): THREE.Group {
  const group = new THREE.Group();
  group.name = "rocket";
  const body = new THREE.Mesh(
    new THREE.LatheGeometry(PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 32),
    // faint self-illumination: the night side stays readable against black space (visual aid, not physics)
    new THREE.MeshStandardMaterial({ color: COLORS.text, roughness: 0.6, metalness: 0.1, emissive: COLORS.borderStrong, emissiveIntensity: 0.6 }),
  );
  body.name = "rocket-body";
  // dark band at the interstage and the nozzle, so the stages read at small sizes
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0565, 0.0565, 0.04, 32, 1, true),
    new THREE.MeshStandardMaterial({ color: COLORS.borderStrong, roughness: 0.8, side: THREE.DoubleSide }),
  );
  band.position.y = 0.59;
  const finMat = new THREE.MeshStandardMaterial({ color: COLORS.borderStrong, roughness: 0.8, emissive: COLORS.borderStrong, emissiveIntensity: 0.4 });
  const finShape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.07, 0), new THREE.Vector2(0, 0.16)]);
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.006, bevelEnabled: false });
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(finGeo, finMat);
    fin.position.set(0, 0.07, 0);
    fin.rotation.y = (i * Math.PI) / 2;
    fin.translateX(0.055); // root on the hull
    fin.translateZ(-0.003);
    group.add(fin);
  }
  group.add(body, band);
  return group;
}

/**
 * World length that covers `fraction` of the view height at `distance` from a perspective camera with
 * vertical field of view `fovDeg`: drawing the rocket with this length keeps its apparent size constant.
 */
export function apparentLength(distance: number, fovDeg: number, fraction: number): number {
  return 2 * distance * Math.tan(((fovDeg * Math.PI) / 180) / 2) * fraction;
}

/** Default apparent size of the rocket: 8 % of the view height (6 % read as a needle in review). */
export const ROCKET_SCREEN_FRACTION = 0.08;

/**
 * Exhaust plume (illustrative): a soft cone below the nozzle, pointing −Y, scaled by `setPlume`. Additive and
 * self-lit, in the Sun/light colour of the tokens.
 */
export function createPlume(): THREE.Mesh {
  // ConeGeometry is centred with its apex at +h/2: flip it (apex down) and shift it so the wide end sits at
  // the nozzle exit (y = 0) and the apex at y = −0.35
  const geo = new THREE.ConeGeometry(0.045, 0.35, 24, 1, true);
  geo.rotateX(Math.PI);
  geo.translate(0, -0.175, 0);
  const mat = new THREE.MeshBasicMaterial({ color: COLORS.sun, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const plume = new THREE.Mesh(geo, mat);
  plume.name = "plume";
  plume.visible = false;
  return plume;
}

/** Plume on/off and length from an intensity 0–1 (launch.ts plumeIntensity). */
export function setPlume(plume: THREE.Mesh, intensity: number): void {
  plume.visible = intensity > 0.01;
  plume.scale.set(1, 0.4 + 0.6 * intensity, 1);
  (plume.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.55 * intensity;
}
