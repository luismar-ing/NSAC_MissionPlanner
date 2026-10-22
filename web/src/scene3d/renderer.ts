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
import { phaseAt, type MissionTimeline } from "../lib/mission";
import { STRINGS } from "../lib/strings";
import { COLORS } from "../styles/tokens";
import { createBodies, loadTextures, updateBodies } from "./bodies";
import { CameraController, directorPose, fromFrame, hopPose, localBlend, reducedMotionPose, switchEase, toFrame, transitPose, type BodyFrame, type DirectorInput, type Pose } from "./cameraDirector";
import { indexEphemeris, rotate, sceneStateAt } from "./ephemeris";
import { launchPositionKm, launchStage, padPositionKm, padUp, plumeIntensity } from "./launch";
import { apparentLength, createPlume, createRocket, ROCKET_SCREEN_FRACTION, setPlume } from "./rocket";
import { bodyRadius, EARTH_RADII_KM, MOON_RADIUS_KM, earthOffset, pointToScene, RelativeOrigin, SPACE_SCALE, toScene, type Vec3 } from "./scale";
import { siteBodyFixedKm, sitePositionKm, trailSamples, trailStyle } from "./trajectory";
import { TerrainManager, type TerrainData } from "./terrain";
import type { PlanSpec } from "./bridge";

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

const unit = (a: Vec3): Vec3 => {
  const n = Math.hypot(...a) || 1;
  return [a[0] / n, a[1] / n, a[2] / n];
};

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
  /** Called when the scene switches between space scale (bodies ×6) and real local scale (λ ≥ 0.5). */
  onScaleChange?(scale: "space" | "local"): void;
  /** Site id and terrain loader (T4.3.b), called by distance during the final approach only. */
  siteId?: string;
  loadTerrain?(siteId: string, lod: number): Promise<TerrainData>;
  /** Reduced motion (the app setting, which starts from prefers-reduced-motion): fixed framings, no flights. */
  reducedMotion?(): boolean;
}

/** Real size of the rocket at the site, drawn at real local scale (λ = 1): ~100 m, a generic launcher. */
export const ROCKET_REAL_LENGTH_UNITS = 100 / 1e6;
/** At real local scale the smooth Moon sphere is drawn this much below the reference radius, so the deepest
 *  polar craters of the terrain (a few km below it) are not cut by the sphere. */
const MOON_SPHERE_DROP_KM = 8;

export interface SceneControl {
  unmount(): void;
  /** Gives the camera back to the director (guided camera). */
  resumeCamera(): void;
  /**
   * Switches to another plan without leaving live mode (T4.4.b): same renderer and scene; the plan's trail,
   * site and terrain are rebuilt and the camera hops from its current view to the new plan's (SWITCH_MS).
   * Call it in the same task as the missionTime change of the new plan.
   */
  setPlan(p: PlanSpec): void;
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
  const rocket = createRocket();
  const plume = createPlume();
  rocket.add(plume);
  const pad = new THREE.Sprite(new THREE.SpriteMaterial({ color: COLORS.accent, sizeAttenuation: false, depthTest: false }));
  pad.name = "launch-pad";
  pad.scale.set(0.012, 0.012, 1);
  scene.add(rocket, pad);

  const earthR = bodyRadius(EARTH_RADII_KM.equatorial);
  const moonR = bodyRadius(MOON_RADIUS_KM);

  /**
   * Everything that depends on the plan: its trajectory, timeline, trail, site and terrain. Built at mount and
   * rebuilt in place when the plan changes in live mode (T4.4.b): same renderer, scene, bodies and camera.
   */
  interface PlanRig {
    traj: Trajectory | null;
    tl: MissionTimeline | null;
    trail: ReturnType<typeof trailSamples> | null;
    style: ReturnType<typeof trailStyle> | null;
    flown: THREE.Line;
    ahead: THREE.Line;
    landingMs: number;
    injectionMs: number;
    padUpAtLaunch: Vec3;
    siteBody: Vec3 | null;
    siteRadiusUnits: number; // R + site elevation, real scale
    terrain: TerrainManager | null;
  }

  const buildRig = (p: PlanSpec): PlanRig => {
    const traj = p.trajectory;
    const trail = traj ? trailSamples(traj) : null;
    const style = traj ? trailStyle(traj.mode) : null;
    // trail (T4.2.c): flown part in light text, remaining part in medium grey; dashed if ILLUSTRATIVE (rule 2)
    const makeLine = (color: string, name: string) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(((trail?.km.length ?? 0) + 1) * 3), 3));
      const mat = style?.dashed
        ? new THREE.LineDashedMaterial({ color, dashSize: 2.5, gapSize: 1.8, transparent: true, opacity: 0.9 })
        : new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
      const line = new THREE.Line(geo, mat);
      line.name = name;
      line.frustumCulled = false;
      scene.add(line);
      handle.world.set(line, [0, 0, 0]); // geometry in world units; the object follows the camera-relative origin
      return line;
    };
    const launchMs = traj ? parseInstant(traj.phases.launch_utc) : ix.startMs;
    const siteBody = traj ? siteBodyFixedKm(traj, ix) : null;
    // terrain at real local scale (T4.3.b): loaded by distance during the final approach, never before
    const terrain = siteBody && p.siteId && opts.loadTerrain ? new TerrainManager(p.siteId, siteBody, opts.loadTerrain) : null;
    if (terrain) scene.add(terrain.group);
    rocket.visible = pad.visible = traj !== null;
    return {
      traj,
      tl: p.timeline,
      trail,
      style,
      flown: makeLine(COLORS.text, "trail-flown"),
      ahead: makeLine(COLORS.borderStrong, "trail-ahead"),
      landingMs: traj ? parseInstant(traj.phases.landing_utc) : Number.POSITIVE_INFINITY,
      injectionMs: traj ? parseInstant(traj.phases.injection_utc) : Number.NEGATIVE_INFINITY,
      padUpAtLaunch: padUp(sceneStateAt(ix, launchMs).earthQuat),
      siteBody,
      siteRadiusUnits: siteBody ? Math.hypot(...siteBody) / 1000 : 0,
      terrain,
    };
  };

  const disposeRig = (r: PlanRig) => {
    for (const line of [r.flown, r.ahead]) {
      scene.remove(line);
      handle.world.delete(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    if (r.terrain) {
      scene.remove(r.terrain.group);
      handle.world.delete(r.terrain.group);
      r.terrain.dispose();
    }
  };

  let rig = buildRig({ trajectory: opts.trajectory, timeline: opts.timeline, siteId: opts.siteId });

  /** Fills the two trail lines for instant t (points near the bodies pushed out like the rocket). */
  const updateTrail = (t: number, moonKm: Vec3, rocketAt: Vec3) => {
    const { trail, style, flown, ahead } = rig;
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

  const moonQ = new THREE.Quaternion();

  // camera director and user take-over (T4.3.a)
  const controller = new CameraController();
  const media = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  const reduced = { get matches() { return opts.reducedMotion ? opts.reducedMotion() : (media?.matches ?? false); } };
  let lastPose: Pose | null = null;
  let earthW: Vec3 = [0, 0, 0];
  let moonW: Vec3 = [0, 0, 0];
  // body frames of the last drawn instant, to carry the camera across a change of plan (T4.4.b)
  let lastFrames: { earth: BodyFrame; moon: BodyFrame } | null = null;
  let switching: { from: { earth: Pose; moon: Pose }; startMs: number } | null = null;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", STRINGS.live.cameraHelp);
  const takeOver = () => {
    if (lastPose && controller.mode === "director") {
      switching = null;
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
  let lambda = 0;
  let reportedScale: "space" | "local" = "space";
  if (import.meta.env.DEV)
    (window as unknown as { __pp3d?: unknown }).__pp3d = {
      THREE,
      renderer,
      ...handle,
      handle,
      bodies,
      ix,
      rocket,
      pad,
      controller,
      terrain: () => rig.terrain,
      lastPose: () => lastPose,
      lastFrames: () => lastFrames,
      lambda: () => lambda,
      switching: () => switching !== null,
    };

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
    const { traj, tl, siteBody, siteRadiusUnits, terrain, landingMs, flown, ahead } = rig;
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
      padUpAtLaunch: rig.padUpAtLaunch,
      moonNorth: rotate(state.moonQuat, [0, 0, 1]),
      site: moonW, // set just below, once λ is known
    };
    // local scale λ (T4.3.b): 0 = space scale (bodies ×6), 1 = real local scale at the site
    lambda = tl ? (reduced?.matches ? (t >= tl.landingMs ? 1 : 0) : localBlend(tl, t)) : 0;
    // the site as drawn (×6): the fixed point of the re-scaling (the camera path stays smooth)
    const anchor = siteKm ? pointToScene(siteKm, state.moonKm) : moonW;
    input.site = anchor;
    const scaleNow = lambda >= 0.5 ? "local" : "space";
    if (scaleNow !== reportedScale) {
      reportedScale = scaleNow;
      opts.onScaleChange?.(scaleNow);
    }
    // …and the Earth moves so that, at real local scale, site → Earth is the true vector
    earthW = siteKm && lambda > 0 ? earthOffset(siteKm, state.moonKm, lambda) : [0, 0, 0];
    handle.world.set(bodies.earth, earthW);
    let moonDrawnR = moonR;
    if (lambda > 0 && siteBody) {
      // re-scale anchored at the site: the Moon centre slides towards the site and the sphere shrinks to its
      // real size, so the ground under the camera stays put and only its curvature changes
      const n = unit([anchor[0] - moonW[0], anchor[1] - moonW[1], anchor[2] - moonW[2]]);
      const r = Math.hypot(anchor[0] - moonW[0], anchor[1] - moonW[1], anchor[2] - moonW[2]) * (1 - lambda) + siteRadiusUnits * lambda;
      moonW = [anchor[0] - n[0] * r, anchor[1] - n[1] * r, anchor[2] - n[2] * r];
      handle.world.set(bodies.moon, moonW);
      moonDrawnR = moonR * (1 - lambda) + ((MOON_RADIUS_KM - MOON_SPHERE_DROP_KM) / 1000) * lambda;
      bodies.moon.scale.setScalar(moonDrawnR / moonR);
    } else bodies.moon.scale.setScalar(1);
    // the Earth also goes back to its real size at real local scale (seen from the site it is a ~1.9° disc,
    // like in the 2D panorama); it is far away, so no anchoring is needed
    const earthK = 1 - (1 - 1 / SPACE_SCALE.bodyExaggeration) * lambda;
    bodies.earth.scale.set(earthK, earthK * (EARTH_RADII_KM.polar / EARTH_RADII_KM.equatorial), earthK);

    let pose =
      (controller.mode === "manual" ? controller.manualPose(earthW, moonW) : null) ??
      (tl ? (reduced?.matches ? reducedMotionPose(tl, input) : directorPose(tl, input)) : transitPose(input));
    const frames: { earth: BodyFrame; moon: BodyFrame } = {
      earth: { centre: earthW, quat: null, radius: earthR * earthK },
      moon: { centre: moonW, quat: state.moonQuat, radius: moonDrawnR },
    };
    if (switching) {
      // change of plan (T4.4.b): hop from the old view, kept relative to the ground of the body it framed, to
      // the new plan's view, in the frame of the body the new view frames (the Earth at launch, else the Moon)
      const w = switchEase(performance.now() - switching.startMs);
      if (w >= 1) switching = null;
      else {
        const kind = tl && phaseAt(tl, t) === "launch" ? "earth" : "moon";
        const f = frames[kind];
        pose = fromFrame(hopPose(switching.from[kind], toFrame(pose, f), w, f.radius), f);
      }
    }
    lastPose = pose;
    lastFrames = frames;
    handle.cameraWorld = pose.position;

    if (terrain && siteBody) {
      terrain.update(Math.hypot(pose.position[0] - anchor[0], pose.position[1] - anchor[1], pose.position[2] - anchor[2]), lambda);
      handle.world.set(terrain.group, anchor);
      terrain.group.quaternion.copy(moonQ.set(...state.moonQuat)); // Moon-fixed geometry, relative to the site
    }

    if (traj) {
      // rocket: on the pad during the countdown, then the trajectory; after landing it stays on the site,
      // which moves with the Moon
      const stage = launchStage(traj, t);
      const km = t >= landingMs && siteKm ? siteKm : launchPositionKm(traj, state.earthQuat, t);
      let p = pointToScene(km, state.moonKm);
      if (lambda > 0 && siteKm) {
        // near the site, blend its offset from the site between the pushed-out (×6) and the true geometry
        const trueRel = toScene([km[0] - siteKm[0], km[1] - siteKm[1], km[2] - siteKm[2]]);
        p = [0, 1, 2].map((c) => anchor[c] + (p[c] - anchor[c]) * (1 - lambda) + trueRel[c] * lambda) as Vec3;
      }
      handle.world.set(rocket, p);
      if (t >= landingMs) dir.set(input.site[0] - moonW[0], input.site[1] - moonW[1], input.site[2] - moonW[2]); // standing on the site
      else if (stage === "flight") {
        const next = pointToScene(launchPositionKm(traj, state.earthQuat, t + 120_000), state.moonKm);
        dir.set(next[0] - p[0], next[1] - p[1], next[2] - p[2]);
      } else dir.set(p[0], p[1], p[2]); // standing up and climbing: along the local vertical
      if (dir.lengthSq() > 0) rocket.quaternion.setFromUnitVectors(Y, dir.normalize());
      const dist = Math.hypot(p[0] - pose.position[0], p[1] - pose.position[1], p[2] - pose.position[2]);
      // enlarged in space (constant apparent size), real size (~100 m) at real local scale
      rocket.scale.setScalar(apparentLength(dist, camera.fov, ROCKET_SCREEN_FRACTION) * (1 - lambda) + ROCKET_REAL_LENGTH_UNITS * lambda);
      setPlume(plume, plumeIntensity(traj, t));
      // the trail belongs to the flight: hidden once landed (its end stays in space while the Moon moves on)
      flown.visible = ahead.visible = t < landingMs && lambda < 1;
      (flown.material as THREE.LineBasicMaterial).opacity = (ahead.material as THREE.LineBasicMaterial).opacity = 0.9 * (1 - lambda);
      if (flown.visible) updateTrail(t, state.moonKm, p);
      // pad marker while the launch phase lasts
      pad.visible = t < rig.injectionMs;
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
    setPlan(p) {
      // the camera leaves from where it is, kept relative to each body's ground, and hops to the new view
      if (lastPose && lastFrames && !reduced?.matches) {
        switching = { from: { earth: toFrame(lastPose, lastFrames.earth), moon: toFrame(lastPose, lastFrames.moon) }, startMs: performance.now() };
      }
      if (controller.mode === "manual") {
        controller.resume();
        opts.onCameraModeChange?.("director");
      }
      disposeRig(rig);
      rig = buildRig(p);
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
      rig.terrain?.dispose();
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
