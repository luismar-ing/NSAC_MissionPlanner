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
  const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.setClearColor(COLORS.bg, 1);
  r.domElement.dataset.webgl = "poleplanner"; // lets the browser checks find the one canvas
  r.domElement.className = "scene-canvas";
  return r;
}

/** The app-wide manager (one per page). */
export const rendererManager = createRendererManager(createWebGLRenderer);

/**
 * Mounts the live scene into `container` and returns the unmount function. For now the scene is empty
 * (the Earth, the Moon and the Sun arrive in T4.1.c); what matters here is the renderer lifecycle.
 */
export function mountScene(container: HTMLElement): () => void {
  const renderer = rendererManager.acquire(container);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.set(0, 0, 10);

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
  renderer.setAnimationLoop(() => renderer.render(scene, camera));

  return () => {
    ro.disconnect();
    rendererManager.release();
    scene.clear();
  };
}
