/**
 * The single WebGL context of the app (spec 8.7, rule 7). One three.js renderer is created the first time the
 * live view opens and then reused: leaving the live view only detaches its canvas and stops the loop, it never
 * disposes the context, so toggling modes can never pile up contexts (browsers cap them at ~16).
 *
 * This module imports three.js statically and is itself loaded with a dynamic import (SceneHost), so three.js
 * lands in its own chunk and the 2D shell does not download it.
 */
import * as THREE from "three";
import type { SceneEphemeris, Trajectory } from "../lib/contract";
import { parseInstant } from "../lib/contract";
import type { MissionTimeline } from "../lib/mission";
import { STRINGS } from "../lib/strings";
import { COLORS } from "../styles/tokens";
import { createBodies, loadTextures, updateBodies } from "./bodies";
import { CameraController, directorPose, reducedMotionPose, transitPose, type DirectorInput, type Pose } from "./cameraDirector";
import { indexEphemeris, rotate, sceneStateAt } from "./ephemeris";
import { launchPositionKm, launchStage, padPositionKm, padUp, plumeIntensity } from "./launch";
import { apparentLength, createPlume, createRocket, ROCKET_SCREEN_FRACTION, setPlume } from "./rocket";
import { bodyRadius, EARTH_RADII_KM, MOON_RADIUS_KM, pointToScene, RelativeOrigin, toScene, type Vec3 } from "./scale";
import { siteBodyFixedKm, sitePositionKm, trailSamples, trailStyle } from "./trajectory";

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
  /** Mission timeline of the plan (drives the camera director); null keeps the transit framing. */
  timeline: MissionTimeline | null;
  /** Called when the user takes the camera ("manual") or gives it back ("director"). */
  onCameraModeChange?(mode: "director" | "manual"): void;
}

export interface SceneControl {
  unmount(): void;
  /** Gives the camera back to the director (guided camera). */
  resumeCamera(): void;
}

/**
 * Mounts the live scene into `container`: the Earth, the Moon, the Sun and the stars at missionTime (T4.1.c),
 * the rocket, its launch and its trail (T4.2), and the camera director with user take-over (T4.3.a), on the
 * single renderer (T4.1.a) with camera-relative rendering (T4.1.b).
 */
export function mountScene(container: HTMLElement, opts: MountOptions): SceneControl {
  const renderer = rendererManager.acquire(container);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, CAMERA_NEAR, CAMERA_FAR);
  const handle: SceneHandle = { scene, camera, origin: new RelativeOrigin(), world: new Map(), cameraWorld: [0, 0, 10] };
  const ix = indexEphemeris(opts.eph);
  const bodies = createBodies(scene);
  loadTextures(bodies, opts.baseUrl, renderer instanceof THREE.WebGLRenderer ? renderer.capabilities.maxTextureSize : 4096);
  const traj = opts.trajectory;
  const tl = opts.timeline;
  const rocket = createRocket();
  const plume = createPlume();
  rocket.add(plume);
  const pad = new THREE.Sprite(new THREE.SpriteMaterial({ color: COLORS.accent, sizeAttenuation: false, depthTest: false }));
  pad.name = "launch-pad";
  pad.scale.set(0.012, 0.012, 1);
  scene.add(rocket, pad);
  rocket.visible = pad.visible = traj !== null;

  // trail (T4.2.c): flown part in light text, remaining part in medium grey; dashed if ILLUSTRATIVE (rule 2)
  const trail = traj ? trailSamples(traj) : null;
  const style = traj ? trailStyle(traj.mode) : null;
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

  // fixed facts of the plan for the camera and the rocket
  const earthR = bodyRadius(EARTH_RADII_KM.equatorial);
  const moonR = bodyRadius(MOON_RADIUS_KM);
  const launchMs = traj ? parseInstant(traj.phases.launch_utc) : ix.startMs;
  const landingMs = traj ? parseInstant(traj.phases.landing_utc) : Number.POSITIVE_INFINITY;
  const padUpAtLaunch = padUp(sceneStateAt(ix, launchMs).earthQuat);
  const siteBody = traj ? siteBodyFixedKm(traj, ix) : null;

  // camera director and user take-over (T4.3.a)
  const controller = new CameraController();
  const reduced = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  let lastPose: Pose | null = null;
  let earthW: Vec3 = [0, 0, 0];
  let moonW: Vec3 = [0, 0, 0];
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", STRINGS.live.cameraHelp);
  const takeOver = () => {
    if (lastPose && controller.mode === "director") {
      controller.cancel(lastPose, earthW, moonW);
      opts.onCameraModeChange?.("manual");
    }
  };
  const minDist = () => (controller.orbit?.body === "moon" ? moonR : earthR) * 0.05;
  let drag: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => {
    takeOver();
    drag = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!drag) return;
    controller.rotate(-(e.clientX - drag.x) * 0.005, (e.clientY - drag.y) * 0.005);
    drag = { x: e.clientX, y: e.clientY };
  };
  const onUp = () => {
    drag = null;
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    takeOver();
    controller.zoom(e.deltaY > 0 ? 1.1 : 1 / 1.1, minDist());
  };
  const onKey = (e: KeyboardEvent) => {
    const keys: Record<string, () => void> = {
      ArrowLeft: () => controller.rotate(0.06, 0),
      ArrowRight: () => controller.rotate(-0.06, 0),
      ArrowUp: () => controller.rotate(0, 0.06),
      ArrowDown: () => controller.rotate(0, -0.06),
      "+": () => controller.zoom(1 / 1.15, minDist()),
      "-": () => controller.zoom(1.15, minDist()),
    };
    const action = keys[e.key];
    if (!action) return;
    e.preventDefault();
    takeOver();
    action();
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("keydown", onKey);

  const Y = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  if (import.meta.env.DEV)
    (window as unknown as { __pp3d?: unknown }).__pp3d = { THREE, renderer, ...handle, handle, bodies, ix, rocket, pad, controller, lastPose: () => lastPose };

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
    earthW = [0, 0, 0];
    moonW = toScene(state.moonKm);
    const siteKm = siteBody ? sitePositionKm(siteBody, state.moonKm, state.moonQuat) : null;
    const input: DirectorInput = {
      t,
      moon: moonW,
      sunDir: state.sunDir,
      earthRadius: earthR,
      moonRadius: moonR,
      padUpAtLaunch,
      moonNorth: rotate(state.moonQuat, [0, 0, 1]),
      site: siteKm ? pointToScene(siteKm, state.moonKm) : moonW,
    };
    const pose =
      (controller.mode === "manual" ? controller.manualPose(earthW, moonW) : null) ??
      (tl ? (reduced?.matches ? reducedMotionPose(tl, input) : directorPose(tl, input)) : transitPose(input));
    lastPose = pose;
    handle.cameraWorld = pose.position;

    if (traj) {
      // rocket: on the pad during the countdown, then the trajectory; after landing it stays on the site,
      // which moves with the Moon
      const stage = launchStage(traj, t);
      const km = t >= landingMs && siteKm ? siteKm : launchPositionKm(traj, state.earthQuat, t);
      const p = pointToScene(km, state.moonKm);
      handle.world.set(rocket, p);
      if (t >= landingMs) dir.set(input.site[0] - moonW[0], input.site[1] - moonW[1], input.site[2] - moonW[2]); // standing on the site
      else if (stage === "flight") {
        const next = pointToScene(launchPositionKm(traj, state.earthQuat, t + 120_000), state.moonKm);
        dir.set(next[0] - p[0], next[1] - p[1], next[2] - p[2]);
      } else dir.set(p[0], p[1], p[2]); // standing up and climbing: along the local vertical
      if (dir.lengthSq() > 0) rocket.quaternion.setFromUnitVectors(Y, dir.normalize());
      const dist = Math.hypot(p[0] - pose.position[0], p[1] - pose.position[1], p[2] - pose.position[2]);
      rocket.scale.setScalar(apparentLength(dist, camera.fov, ROCKET_SCREEN_FRACTION));
      setPlume(plume, plumeIntensity(traj, t));
      // the trail belongs to the flight: hidden once landed (its end stays in space while the Moon moves on)
      flown.visible = ahead.visible = t < landingMs;
      if (flown.visible) updateTrail(t, state.moonKm, p);
      // pad marker while the launch phase lasts
      pad.visible = t < parseInstant(traj.phases.injection_utc);
      if (pad.visible) handle.world.set(pad, pointToScene(padPositionKm(state.earthQuat), state.moonKm));
    }
    applyCameraRelative(handle);
    camera.up.set(...pose.up);
    camera.lookAt(pose.target[0] - pose.position[0], pose.target[1] - pose.position[1], pose.target[2] - pose.position[2]);
    renderer.render(scene, camera);
  });

  return {
    resumeCamera() {
      controller.resume();
      opts.onCameraModeChange?.("director");
    },
    unmount() {
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("keydown", onKey);
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
    },
  };
}
