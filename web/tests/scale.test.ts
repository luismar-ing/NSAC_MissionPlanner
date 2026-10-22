/** T4.1.b: scale mode (spec 5.9, D8) keeps every direction exact; camera-relative rendering keeps precision. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { applyCameraRelative, type SceneHandle } from "../src/scene3d/renderer";
import {
  angleBetween,
  bodyRadius,
  LOCAL_SCALE,
  MOON_RADIUS_KM,
  phaseAngle,
  RelativeOrigin,
  SPACE_SCALE,
  toScene,
  type Vec3,
} from "../src/scene3d/scale";

const eph = JSON.parse(readFileSync(join(__dirname, "..", "public", "data", "scene", "ephemeris.json"), "utf-8")) as {
  n: number;
  moon_pos_km: Vec3[];
  sun_dir: Vec3[];
};

describe("scale mode keeps directions (spec 5.9)", () => {
  it("Sun–Moon–Earth angle identical before and after scaling, every hourly sample of the scene", () => {
    let maxErr = 0;
    let maxElong = 0;
    for (let k = 0; k < eph.n; k++) {
      const m = eph.moon_pos_km[k];
      const s = eph.sun_dir[k];
      const before = phaseAngle(m, s);
      const after = phaseAngle(toScene(m, SPACE_SCALE), s);
      maxErr = Math.max(maxErr, Math.abs(after - before));
      // elongation (angle Sun–Earth–Moon) too
      maxElong = Math.max(maxElong, Math.abs(angleBetween(toScene(m), s) - angleBetween(m, s)));
    }
    console.log(`scale: ${eph.n} samples, max |Δ phase angle| = ${maxErr.toExponential(2)} rad, max |Δ elongation| = ${maxElong.toExponential(2)} rad`);
    expect(eph.n).toBeGreaterThan(9000);
    expect(maxErr).toBeLessThan(1e-9);
    expect(maxElong).toBeLessThan(1e-9);
  });

  it("phase angle sanity: full Moon ≈ 0°, new Moon ≈ 180°, and the year covers both", () => {
    const angles = eph.moon_pos_km.map((m, k) => (phaseAngle(m, eph.sun_dir[k]) * 180) / Math.PI);
    expect(Math.min(...angles)).toBeLessThan(10);
    expect(Math.max(...angles)).toBeGreaterThan(170);
  });

  it("bodies exaggerated by the fixed D8 factor in space, real size at the site", () => {
    expect(bodyRadius(MOON_RADIUS_KM, SPACE_SCALE)).toBeCloseTo(1.7374 * 6, 12);
    expect(bodyRadius(MOON_RADIUS_KM, LOCAL_SCALE)).toBeCloseTo(1.7374, 12);
    // positions do not depend on the body exaggeration
    expect(toScene([384400, 0, 0], SPACE_SCALE)).toEqual(toScene([384400, 0, 0], LOCAL_SCALE));
  });
});

describe("camera-relative rendering (precision)", () => {
  it("a point 1 m from a camera near the Moon survives float32; the absolute coordinate would not", () => {
    const moon = toScene(eph.moon_pos_km[0]); // ~380 units from the origin
    const camera: Vec3 = [moon[0] + 1.7374, moon[1], moon[2]]; // at the lunar surface (real scale)
    const point: Vec3 = [camera[0] + 1e-6, camera[1], camera[2]]; // 1 m away (1 unit = 1000 km)
    const o = new RelativeOrigin();
    o.setOrigin(camera);
    const rel = o.relative(point).map(Math.fround);
    const errRelative = Math.abs(rel[0] - 1e-6);
    const errAbsolute = Math.abs(Math.fround(point[0]) - point[0]);
    console.log(`precision: float32 error ${errRelative.toExponential(2)} units camera-relative vs ${errAbsolute.toExponential(2)} absolute`);
    expect(errRelative).toBeLessThan(1e-12); // < 1 nm
    expect(errAbsolute).toBeGreaterThan(1e-6); // > 1 m: absolute float32 coordinates would jitter
  });

  it("each frame the camera sits at the origin and objects at world − camera", () => {
    const mesh = new THREE.Object3D();
    const h: SceneHandle = {
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(),
      origin: new RelativeOrigin(),
      world: new Map([[mesh, [-321.1392, 167.6916, 66.626] as Vec3]]),
      cameraWorld: [-320, 167, 66],
    };
    applyCameraRelative(h);
    expect(h.camera.position.toArray()).toEqual([0, 0, 0]);
    expect(mesh.position.x).toBeCloseTo(-1.1392, 12);
    expect(mesh.position.y).toBeCloseTo(0.6916, 12);
    expect(mesh.position.z).toBeCloseTo(0.626, 12);
  });

  it("the renderer is created with a logarithmic depth buffer", () => {
    const src = readFileSync(join(__dirname, "..", "src", "scene3d", "renderer.ts"), "utf-8");
    expect(src).toMatch(/new THREE\.WebGLRenderer\(\{[^}]*logarithmicDepthBuffer: true/);
  });
});
