/**
 * The single WebGL context of the app (spec 8.7, rule 7). One three.js renderer is created the first time the
 * live view opens and then reused: leaving the live view only detaches its canvas and stops the loop, it never
 * disposes the context, so toggling modes can never pile up contexts (browsers cap them at ~16).
 *
 * This module imports three.js statically and is itself loaded with a dynamic import (SceneHost), so three.js
 * lands in its own chunk and the 2D shell does not download it.
 */
import * as THREE from "three";
import { COLORS } from "../styles/tokens";
import type { SceneEphemeris, Trajectory } from "../lib/contract";
import { launchPositionKm, launchStage, padPositionKm, plumeIntensity } from "./launch";
import { apparentLength, createPlume, createRocket, ROCKET_SCREEN_FRACTION, setPlume } from "./rocket";
import { createBodies, loadTextures, updateBodies } from "./bodies";
import { indexEphemeris, sceneStateAt } from "./ephemeris";
import { pointToScene, RelativeOrigin, toScene, type Vec3 } from "./scale";
import { trailSamples, trailStyle } from "./trajectory";

/** The part of THREE.WebGLRenderer the manager uses (lets tests run without WebGL). */
export interface RendererLike {
  domElement: HTMLCanvasElement;
  setSize(width: number, height: number, updateStyle?: boolean): void;
  setPixelRatio(ratio: number): void;
  setAnimationLoop(callback: XRFrameRequestCallback | null): void;
  render(scene: THREE.Object3D, camera: THREE.Camera): void;
}

export interface RendererManager<R extends RendererLike> {
  /** Returns the one renderer (created on first use) with its canvas attached to `container`. */
  acquire(container: HTMLElement): R;
  /** Stops the loop and detaches the canvas; the context stays alive for the next acquire. */
  release(): void;
  /** How many renderers were ever created (must stay ≤ 1). */
  readonly created: number;
  readonly current: R | null;
}

export function createRendererManager<R extends RendererLike>(factory: () => R): RendererManager<R> {
  let renderer: R | null = null;
  let created = 0;
  return {
    acquire(container) {
      if (!renderer) {
        renderer = factory();
        created++;
      }
      if (renderer.domElement.parentElement !== container) container.appendChild(renderer.domElement);
      return renderer;
    },
    release() {
      if (!renderer) return;
      renderer.setAnimationLoop(null);
      renderer.domElement.remove();
    },
    get created() {
      return created;
    },
    get current() {
      return renderer;
    },
  };
}

function createWebGLRenderer(): THREE.WebGLRenderer {
  // logarithmic depth buffer (spec 5.9): depth precision from metres at the site to Earth–Moon distance
  const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", logarithmicDepthBuffer: true });
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.setClearColor(COLORS.bg, 1);
  r.domElement.dataset.webgl = "poleplanner"; // lets the browser checks find the one canvas
  r.domElement.className = "scene-canvas";
  return r;
}

/** The app-wide manager (one per page). */
export const rendererManager = createRendererManager(createWebGLRenderer);

/** Near/far planes in scene units (1 unit = 1000 km): 1 mm to 10 million km, usable thanks to the log depth. */
export const CAMERA_NEAR = 1e-6;
export const CAMERA_FAR = 1e7;

export interface SceneHandle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Camera-relative rendering: world positions (float64) are placed at `world − origin` each frame. */
  origin: RelativeOrigin;
  /** World positions of the scene objects (float64); the render loop turns them into camera-relative ones. */
  world: Map<THREE.Object3D, [number, number, number]>;
  /** Camera position in world units (float64); the THREE camera itself stays at the origin. */
  cameraWorld: [number, number, number];
}

/** Each frame: the camera becomes the origin, objects move to their camera-relative positions. */
export function applyCameraRelative(h: SceneHandle): void {
  h.origin.setOrigin(h.cameraWorld);
  h.camera.position.set(0, 0, 0);
  for (const [obj, p] of h.world) {
    const [x, y, z] = h.origin.relative(p);
    obj.position.set(x, y, z);
  }
}

export interface MountOptions {
  eph: SceneEphemeris;
  /** missionTime (epoch ms, UTC), read every frame. */
  getTimeMs(): number;
  /** Base URL of the static files (import.meta.env.BASE_URL). */
  baseUrl: string;
  /** Trajectory of the selected plan (launch, ascent and flight of the rocket); null hides the rocket. */
  trajectory: Trajectory | null;
}

const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => {
  const n = Math.hypot(...a) || 1;
  return [a[0] / n, a[1] / n, a[2] / n];
};

/**
 * Overview framing (until the camera director of T4.3.a): from above the Earth–Moon line, on the side of the
 * orbit normal, looking at the midpoint, with celestial north up. Shows both bodies and the Moon's phase.
 */
export function overviewCamera(moonScene: Vec3, sunDir: Vec3): { position: Vec3; target: Vec3; up: Vec3 } {
  const d = Math.hypot(...moonScene);
  const n = unit(cross(moonScene, sunDir));
  const along = unit(moonScene);
  const target: Vec3 = [moonScene[0] / 2, moonScene[1] / 2, moonScene[2] / 2];
  const position: Vec3 = [0, 1, 2].map((i) => target[i] + n[i] * d * 1.15 - along[i] * d * 0.25) as Vec3;
  const view = unit([target[0] - position[0], target[1] - position[1], target[2] - position[2]]);
  const z: Vec3 = [0, 0, 1];
  const dz = view[2];
  const up: Vec3 = Math.abs(dz) > 0.98 ? [0, 1, 0] : unit([z[0] - dz * view[0], z[1] - dz * view[1], z[2] - dz * view[2]]);
  return { position, target, up };
}

/**
 * Mounts the live scene into `container` and returns the unmount function: the Earth, the Moon, the Sun and
 * the stars at missionTime (T4.1.c), on the single renderer (T4.1.a) with camera-relative rendering (T4.1.b).
 */
export function mountScene(container: HTMLElement, opts: MountOptions): () => void {
  const renderer = rendererManager.acquire(container);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, CAMERA_NEAR, CAMERA_FAR);
  const handle: SceneHandle = { scene, camera, origin: new RelativeOrigin(), world: new Map(), cameraWorld: [0, 0, 10] };
  const ix = indexEphemeris(opts.eph);
  const bodies = createBodies(scene);
  loadTextures(bodies, opts.baseUrl, renderer instanceof THREE.WebGLRenderer ? renderer.capabilities.maxTextureSize : 4096);
  const rocket = createRocket();
  const plume = createPlume();
  rocket.add(plume);
  const pad = new THREE.Sprite(new THREE.SpriteMaterial({ color: COLORS.accent, sizeAttenuation: false, depthTest: false }));
  pad.name = "launch-pad";
  pad.scale.set(0.012, 0.012, 1);
  scene.add(rocket, pad);
  rocket.visible = pad.visible = opts.trajectory !== null;
  // trail (T4.2.c): flown part in light text, remaining part in medium grey; dashed if ILLUSTRATIVE (rule 2)
  const trail = opts.trajectory ? trailSamples(opts.trajectory) : null;
  const style = opts.trajectory ? trailStyle(opts.trajectory.mode) : null;
  const makeLine = (color: string) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(((trail?.km.length ?? 0) + 1) * 3), 3));
    const mat = style?.dashed
      ? new THREE.LineDashedMaterial({ color, dashSize: 2.5, gapSize: 1.8, transparent: true, opacity: 0.9 })
      : new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    scene.add(line);
    handle.world.set(line, [0, 0, 0]); // geometry in world units; the object follows the camera-relative origin
    return line;
  };
  const flown = makeLine(COLORS.text);
  const ahead = makeLine(COLORS.borderStrong);
  flown.name = "trail-flown";
  ahead.name = "trail-ahead";
  /** Fills the two trail lines for instant t (points near the bodies pushed out like the rocket). */
  const updateTrail = (t: number, moonKm: Vec3, rocketAt: Vec3) => {
    if (!trail) return;
    let split = trail.tMs.findIndex((x) => x > t);
    if (split < 0) split = trail.tMs.length;
    const fill = (line: THREE.Line, from: number, to: number, last: Vec3 | null, first: Vec3 | null) => {
      const attr = line.geometry.getAttribute("position") as THREE.BufferAttribute;
      let n = 0;
      const put = (p: Vec3) => attr.setXYZ(n++, p[0], p[1], p[2]);
      if (first) put(first);
      for (let i = from; i < to; i++) put(pointToScene(trail.km[i], moonKm));
      if (last) put(last);
      line.geometry.setDrawRange(0, n);
      attr.needsUpdate = true;
      if (style?.dashed && n > 1) line.computeLineDistances();
    };
    // both lines meet at the rocket, so the trail never shows a gap at "now"
    fill(flown, 0, Math.min(split, trail.km.length - 1), rocketAt, null);
    fill(ahead, split, trail.km.length, null, rocketAt);
  };
  const Y = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  if (import.meta.env.DEV) (window as unknown as { __pp3d?: unknown }).__pp3d = { THREE, renderer, ...handle, handle, bodies, ix, rocket, pad };

  const resize = () => {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, true);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  renderer.setAnimationLoop(() => {
    const t = opts.getTimeMs();
    const state = sceneStateAt(ix, t);
    updateBodies(bodies, state, handle);
    const cam = overviewCamera(toScene(state.moonKm), state.sunDir);
    handle.cameraWorld = cam.position;
    const traj = opts.trajectory;
    if (traj) {
      // rocket: on the pad during the countdown, then the trajectory (T4.2.b; whole flight refined in T4.2.c)
      const stage = launchStage(traj, t);
      const p = pointToScene(launchPositionKm(traj, state.earthQuat, t), state.moonKm);
      handle.world.set(rocket, p);
      if (stage === "flight") {
        const ahead = pointToScene(launchPositionKm(traj, state.earthQuat, t + 120_000), state.moonKm);
        dir.set(ahead[0] - p[0], ahead[1] - p[1], ahead[2] - p[2]);
      } else dir.set(p[0], p[1], p[2]); // standing up and climbing: along the local vertical
      if (dir.lengthSq() > 0) rocket.quaternion.setFromUnitVectors(Y, dir.normalize());
      const dist = Math.hypot(p[0] - cam.position[0], p[1] - cam.position[1], p[2] - cam.position[2]);
      rocket.scale.setScalar(apparentLength(dist, camera.fov, ROCKET_SCREEN_FRACTION));
      setPlume(plume, plumeIntensity(traj, t));
      updateTrail(t, state.moonKm, p);
      // pad marker while the launch phase lasts
      pad.visible = t < Date.parse(traj.phases.injection_utc);
      if (pad.visible) handle.world.set(pad, pointToScene(padPositionKm(state.earthQuat), state.moonKm));
    }
    applyCameraRelative(handle);
    camera.up.set(...cam.up);
    camera.lookAt(cam.target[0] - cam.position[0], cam.target[1] - cam.position[1], cam.target[2] - cam.position[2]);
    renderer.render(scene, camera);
  });

  return () => {
    ro.disconnect();
    rendererManager.release();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mats = (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []) as THREE.Material[];
      for (const mat of mats) {
        (mat as THREE.MeshStandardMaterial).map?.dispose();
        mat.dispose();
      }
    });
    scene.clear();
  };
}
