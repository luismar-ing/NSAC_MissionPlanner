/**
 * The rocket of the live scene (spec 5.8, 8.2). Own procedural geometry (no external model, so no licence to
 * track, rule 12): a generic two-stage launcher with fairing, interstage, fins and nozzle, built from a lathe
 * profile. It is not a model of any real vehicle. Its parts can separate (T6.3.a, setStaging).
 *
 * Scale (D8): a real launcher (~100 m) would be invisible at Earth–Moon distances, so the rocket is drawn at a
 * constant APPARENT size (8 % of the view height) wherever it is; the scale indicator says so.
 * Local axes: +Y = forward (nose), length 1 before scaling, base at y = 0.
 */
import * as THREE from "three";
import { COLORS } from "../styles/tokens";

/** Lathe profiles (radius, height), base to top; the whole rocket is 1 long. Split into the parts that stage. */
const FIRST_STAGE: [number, number][] = [
  [0.0, 0.0],
  [0.05, 0.0], // nozzle exit
  [0.035, 0.05], // nozzle throat
  [0.06, 0.07], // engine section
  [0.06, 0.55], // first stage
  [0.055, 0.58], // interstage
  [0.05, 0.6],
  [0.0, 0.6],
];
const SECOND_STAGE: [number, number][] = [
  [0.0, 0.6],
  [0.03, 0.6], // second-stage nozzle
  [0.05, 0.63],
  [0.05, 0.8],
  [0.0, 0.8],
];
const FAIRING: [number, number][] = [
  [0.058, 0.8], // fairing shoulder
  [0.058, 0.88],
  [0.04, 0.95], // ogive nose
  [0.015, 0.99],
  [0.0, 1.0],
];
const PAYLOAD: [number, number][] = [
  [0.0, 0.8],
  [0.035, 0.8],
  [0.035, 0.86],
  [0.0, 0.93],
];

const lathe = (profile: [number, number][], phiStart = 0, phiLength = Math.PI * 2) =>
  new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    32,
    phiStart,
    phiLength,
  );

/** Own materials for each part, so a part that drops away can fade on its own. */
const hull = () =>
  // faint self-illumination: the night side stays readable against black space (visual aid, not physics)
  new THREE.MeshStandardMaterial({ color: COLORS.text, roughness: 0.6, metalness: 0.1, emissive: COLORS.borderStrong, emissiveIntensity: 0.6, side: THREE.DoubleSide });
const dark = () => new THREE.MeshStandardMaterial({ color: COLORS.borderStrong, roughness: 0.8, emissive: COLORS.borderStrong, emissiveIntensity: 0.4, side: THREE.DoubleSide });

/**
 * A generic two-stage launcher with fairing (T4.2.a; parts for the detailed launch of T6.3.a): "stage-1" (engine,
 * tank, interstage band and 4 fins), "stage-2", "payload", and the two fairing halves "fairing-0" / "fairing-1".
 */
export function createRocket(): THREE.Group {
  const group = new THREE.Group();
  group.name = "rocket";
  const stage1 = new THREE.Group();
  stage1.name = "stage-1";
  const body = new THREE.Mesh(lathe(FIRST_STAGE), hull());
  body.name = "rocket-body";
  // dark band at the interstage, so the stages read at small sizes
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0565, 0.0565, 0.04, 32, 1, true), dark());
  band.position.y = 0.59;
  const finMat = dark();
  const finShape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.07, 0), new THREE.Vector2(0, 0.16)]);
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.006, bevelEnabled: false });
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(finGeo, finMat);
    fin.position.set(0, 0.07, 0);
    fin.rotation.y = (i * Math.PI) / 2;
    fin.translateX(0.055); // root on the hull
    fin.translateZ(-0.003);
    stage1.add(fin);
  }
  stage1.add(body, band);
  const stage2 = new THREE.Mesh(lathe(SECOND_STAGE), hull());
  stage2.name = "stage-2";
  const payload = new THREE.Mesh(lathe(PAYLOAD), dark());
  payload.name = "payload";
  group.add(stage1, stage2, payload);
  for (let i = 0; i < 2; i++) {
    const half = new THREE.Mesh(lathe(FAIRING, i * Math.PI, Math.PI), hull());
    half.name = `fairing-${i}`;
    group.add(half);
  }
  return group;
}

/** Staging of the detailed launch (launch.ts stagingAt): -1 = still attached, 0..1 = progress of the fall. */
export interface StagingView {
  firstStage: number;
  fairing: number;
  plumeAt: "first" | "second";
}

const fade = (o: THREE.Object3D, opacity: number) =>
  o.traverse((m) => {
    const mat = (m as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (!mat) return;
    mat.transparent = opacity < 1;
    mat.opacity = opacity;
  });

/**
 * Poses the parts for a staging state (null = the MVP rocket, all parts together). The spent first stage drops
 * back along the rocket's axis, tumbling and fading; the fairing halves swing open and away. ILLUSTRATIVE.
 */
export function setStaging(rocket: THREE.Object3D, plume: THREE.Object3D, st: StagingView | null): void {
  const stage1 = rocket.getObjectByName("stage-1")!;
  const k = st && st.firstStage >= 0 ? st.firstStage : -1;
  stage1.visible = k < 1;
  stage1.position.set(k < 0 ? 0 : 0.04 * k, k < 0 ? 0 : -(0.08 + 1.4 * k * k), 0);
  stage1.rotation.z = k < 0 ? 0 : 0.9 * k;
  fade(stage1, k < 0 ? 1 : 1 - k);
  const f = st && st.fairing >= 0 ? st.fairing : -1;
  for (let i = 0; i < 2; i++) {
    const half = rocket.getObjectByName(`fairing-${i}`)!;
    const side = i === 0 ? 1 : -1; // the halves open on opposite sides
    half.visible = f < 1;
    half.position.set(f < 0 ? 0 : side * 0.5 * f, f < 0 ? 0 : 0.15 * f, 0);
    half.rotation.z = f < 0 ? 0 : -side * 1.1 * f;
    fade(half, f < 0 ? 1 : 1 - f);
  }
  // the plume moves to the second stage once the first stage has gone, smaller
  const second = st?.plumeAt === "second";
  plume.position.y = second ? 0.6 : 0;
  plume.scale.x = plume.scale.z = second ? 0.7 : 1;
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
