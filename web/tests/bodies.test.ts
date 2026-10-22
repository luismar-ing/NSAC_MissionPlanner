// @vitest-environment jsdom
/**
 * T4.1.c: the scene's Earth, Moon and Sun agree with the scene ephemeris. The phase angle of the data equals
 * the one of the scene (light direction vs body vectors); the Moon shows its near side to the Earth and the
 * Earth's sub-solar point follows UTC, which checks quaternions and texture orientation together.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { SceneEphemeris } from "../src/lib/contract";
import { createBodies, updateBodies } from "../src/scene3d/bodies";
import { indexEphemeris, lonLat, sceneStateAt, type SceneState } from "../src/scene3d/ephemeris";
import type { SceneHandle } from "../src/scene3d/renderer";
import { angleBetween, phaseAngle, RelativeOrigin, type Vec3 } from "../src/scene3d/scale";

const eph = JSON.parse(readFileSync(join(__dirname, "..", "public", "data", "scene", "ephemeris.json"), "utf-8")) as SceneEphemeris;
const ix = indexEphemeris(eph);

// one scene, updated for each instant (building 128×64 spheres per instant is slow)
const shared = (() => {
  const scene = new THREE.Scene();
  const h: SceneHandle = { scene, camera: new THREE.PerspectiveCamera(), origin: new RelativeOrigin(), world: new Map(), cameraWorld: [0, 0, 0] };
  return { b: createBodies(scene), h };
})();

function sceneAt(state: SceneState) {
  updateBodies(shared.b, state, shared.h);
  return shared;
}

/** Direction (world, J2000) → body-fixed direction of a mesh built by bodies.ts (sphere local → body: x, −z, y). */
function toBodyFixed(mesh: THREE.Object3D, dirWorld: Vec3): Vec3 {
  const v = new THREE.Vector3(...dirWorld).applyQuaternion(mesh.quaternion.clone().invert());
  return [v.x, -v.z, v.y];
}

describe("interpolation (contract §10)", () => {
  it("reproduces the samples at their own instants", () => {
    for (const k of [1, 500, 4000, eph.n - 3]) {
      const s = sceneStateAt(ix, ix.startMs + k * ix.stepMs);
      for (let c = 0; c < 3; c++) expect(s.moonKm[c]).toBeCloseTo(eph.moon_pos_km[k][c], 6);
      for (let c = 0; c < 4; c++) expect(s.moonQuat[c]).toBeCloseTo(eph.moon_quat[k][c], 9);
    }
  });
  it("mid-hour Moon position lies between its neighbours, sun direction stays unit", () => {
    const s = sceneStateAt(ix, ix.startMs + 100.5 * ix.stepMs);
    const a = eph.moon_pos_km[100];
    const b = eph.moon_pos_km[101];
    for (let c = 0; c < 3; c++) expect(s.moonKm[c]).toBeGreaterThan(Math.min(a[c], b[c]) - 50);
    expect(Math.hypot(...s.sunDir)).toBeCloseTo(1, 12);
  });
});

describe("scene vs data", () => {
  it("phase angle: light direction vs Moon→Earth in the scene = the data, at every sampled instant", () => {
    let maxErr = 0;
    let n = 0;
    for (let k = 0; k < eph.n; k += 7) {
      const st = sceneStateAt(ix, ix.startMs + k * ix.stepMs);
      const { b, h } = sceneAt(st);
      const light = b.sunLight.position.clone().sub(b.sunLight.target.position).normalize();
      const moon = h.world.get(b.moon)!;
      const earth = h.world.get(b.earth)!;
      const sceneAngle = angleBetween([light.x, light.y, light.z], [earth[0] - moon[0], earth[1] - moon[1], earth[2] - moon[2]]);
      const dataAngle = phaseAngle(eph.moon_pos_km[k] as Vec3, eph.sun_dir[k] as Vec3);
      maxErr = Math.max(maxErr, Math.abs(sceneAngle - dataAngle));
      n++;
    }
    console.log(`bodies: ${n} instants, max |phase angle scene − data| = ${maxErr.toExponential(2)} rad`);
    expect(maxErr).toBeLessThan(1e-9);
  });

  it("the Moon shows its near side to the Earth (sub-Earth point within the libration range)", () => {
    let maxLon = 0;
    let maxLat = 0;
    for (let k = 0; k < eph.n; k += 11) {
      const st = sceneStateAt(ix, ix.startMs + k * ix.stepMs);
      const { b } = sceneAt(st);
      const [lon, lat] = lonLat(toBodyFixed(b.moon, [-st.moonKm[0], -st.moonKm[1], -st.moonKm[2]]));
      maxLon = Math.max(maxLon, Math.abs(lon));
      maxLat = Math.max(maxLat, Math.abs(lat));
    }
    console.log(`moon: sub-Earth point |lon| ≤ ${maxLon.toFixed(2)}°, |lat| ≤ ${maxLat.toFixed(2)}° (optical libration ≈ ±7.9° / ±6.7°)`);
    expect(maxLon).toBeLessThan(9);
    expect(maxLat).toBeLessThan(8);
  });

  it("the Earth's sub-solar point is near longitude 0 at 12:00 UTC and at the solar declination", () => {
    let worstLon = 0;
    let maxLat = 0;
    for (let d = 0; d < 370; d += 5) {
      const t = Date.parse("2027-01-01T12:00:00Z") + d * 86_400_000;
      if (t > ix.startMs + (eph.n - 2) * ix.stepMs) break;
      const st = sceneStateAt(ix, t);
      const { b } = sceneAt(st);
      const [lon, lat] = lonLat(toBodyFixed(b.earth, st.sunDir));
      worstLon = Math.max(worstLon, Math.abs(lon));
      maxLat = Math.max(maxLat, Math.abs(lat));
    }
    console.log(`earth: sub-solar point at 12:00 UTC |lon| ≤ ${worstLon.toFixed(2)}° (equation of time ≤ ~4.1°), |lat| ≤ ${maxLat.toFixed(2)}° (obliquity 23.44°)`);
    expect(worstLon).toBeLessThan(4.5);
    expect(maxLat).toBeLessThan(23.5);
    expect(maxLat).toBeGreaterThan(23);
  });
});
