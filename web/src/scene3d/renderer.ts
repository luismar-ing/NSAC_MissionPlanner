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
import { RelativeOrigin } from "./scale";

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

/**
 * Mounts the live scene into `container` and returns the unmount function. For now the scene is empty
 * (the Earth, the Moon and the Sun arrive in T4.1.c); what matters here is the renderer lifecycle (T4.1.a)
 * and the scale / precision set-up (T4.1.b).
 */
export function mountScene(container: HTMLElement): () => void {
  const renderer = rendererManager.acquire(container);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, CAMERA_NEAR, CAMERA_FAR);
  const handle: SceneHandle = { scene, camera, origin: new RelativeOrigin(), world: new Map(), cameraWorld: [0, 0, 10] };
  if (import.meta.env.DEV) (window as unknown as { __pp3d?: unknown }).__pp3d = { THREE, renderer, ...handle, handle };

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
    applyCameraRelative(handle);
    renderer.render(scene, camera);
  });

  return () => {
    ro.disconnect();
    rendererManager.release();
    scene.clear();
  };
}
