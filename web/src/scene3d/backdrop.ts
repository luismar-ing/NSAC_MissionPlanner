/**
 * Landing page Moon (decision A7, design A1): the real LRO LROC colour texture on a sphere, turning slowly,
 * tilted so the south pole faces the viewer. It draws on the app's single WebGL renderer (rendererManager),
 * so the landing page and the live view share one context (spec 8.7, rule 7).
 *
 * The lighting is decorative (a fixed light from the upper left): the landing page shows no date, so it does
 * not claim a real lunar phase. Loaded with a dynamic import, like renderer.ts, so the 2D shell has no three.js.
 */
import * as THREE from "three";
import { rendererManager } from "./renderer";

/** One turn every this many seconds (decorative; the real Moon turns once in ~27.3 days). */
export const BACKDROP_TURN_S = 150;
/** Tilt that brings the south pole towards the viewer (radians about the screen's horizontal axis). */
export const BACKDROP_TILT = -0.45;

export interface BackdropOptions {
  baseUrl: string;
  /** Read every frame: when true the Moon holds still. */
  reducedMotion(): boolean;
  /** Called once the texture is on the sphere (the static image can go). */
  onReady?(): void;
}

/** Spin angle (radians) after `elapsedS` seconds of motion. */
export function backdropAngle(elapsedS: number): number {
  return ((elapsedS / BACKDROP_TURN_S) * 2 * Math.PI) % (2 * Math.PI);
}

export function mountBackdrop(container: HTMLElement, opts: BackdropOptions): { unmount(): void } {
  const renderer = rendererManager.acquire(container);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 4);

  const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48), new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, color: 0x000000 }));
  const tilt = new THREE.Group();
  tilt.rotation.x = BACKDROP_TILT;
  tilt.add(moon);
  const light = new THREE.DirectionalLight(0xffffff, 3.2);
  light.position.set(-0.8, 0.45, 0.7);
  scene.add(tilt, light, new THREE.AmbientLight(0xffffff, 0.03));

  let alive = true;
  new THREE.TextureLoader().load(`${opts.baseUrl}textures/moon_2k.jpg`, (tex) => {
    if (!alive) return tex.dispose();
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const mat = moon.material as THREE.MeshStandardMaterial;
    mat.map = tex;
    mat.color.set(0xffffff);
    mat.needsUpdate = true;
    opts.onReady?.();
  });

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

  // the spin only advances while motion is allowed, so turning reduced motion on freezes it where it is
  let moving = 0;
  let last = performance.now();
  renderer.setAnimationLoop((now: number) => {
    if (!opts.reducedMotion()) moving += (now - last) / 1000;
    last = now;
    moon.rotation.y = backdropAngle(moving);
    renderer.render(scene, camera);
  });

  return {
    unmount() {
      alive = false;
      ro.disconnect();
      rendererManager.release();
      moon.geometry.dispose();
      const mat = moon.material as THREE.MeshStandardMaterial;
      mat.map?.dispose();
      mat.dispose();
    },
  };
}
