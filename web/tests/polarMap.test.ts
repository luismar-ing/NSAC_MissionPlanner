/** T6.2.b: the lit polar map disc sits on the south pole out to 85°S, matches the image, and fades in and out. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { Plan, Trajectory } from "../src/lib/contract";
import { timelineOf } from "../src/lib/mission";
import { LOCAL_TO_BODY } from "../src/scene3d/bodies";
import { POLAR_MAP_LIFT, polarMapGeometry, polarMapOpacity, type PolarMapHeader } from "../src/scene3d/polarMap";

const DATA = join(__dirname, "..", "public", "data");
const header = JSON.parse(readFileSync(join(DATA, "illumination", "south_avg.json"), "utf-8")) as PolarMapHeader;
const latOf = (p: THREE.Vector3) => (Math.asin(p.z / p.length()) * 180) / Math.PI;

describe("lit polar map (T6.2.b)", () => {
  const R = 10; // any sphere radius
  const geo = polarMapGeometry(header, R, 8, 32);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
  // back to the body-fixed frame (the mesh is a child of the Moon sphere, which applies LOCAL_TO_BODY)
  const body = (i: number) => new THREE.Vector3().fromBufferAttribute(pos, i).applyQuaternion(LOCAL_TO_BODY);

  it("its centre is the south pole, its edge is 85°S, and it floats just above the sphere", () => {
    expect(latOf(body(0))).toBeCloseTo(-90, 6);
    expect(body(0).length()).toBeCloseTo(R * POLAR_MAP_LIFT, 5); // float32 positions
    const edge = pos.count - 1;
    expect(latOf(body(edge))).toBeCloseTo(-85, 1);
    expect(uv.getX(0)).toBeCloseTo(0.5, 9); // the pole is the image centre
    expect(uv.getY(0)).toBeCloseTo(0.5, 9);
  });

  it("fades in after lunar arrival and is gone before the real terrain (local scale) takes over", () => {
    const plans = JSON.parse(readFileSync(join(DATA, "plans.json"), "utf-8")) as Plan[];
    const plan = plans.find((p) => p.id === "haworth_20270309_7d")!;
    const tl = timelineOf(plan, JSON.parse(readFileSync(join(DATA, "trajectory", `${plan.trajectory_id}.json`), "utf-8")) as Trajectory);
    expect(polarMapOpacity(tl, tl.lunarArrivalMs - 3_600_000, 0)).toBe(0); // still in transit
    expect(polarMapOpacity(tl, tl.lunarArrivalMs + 2 * 3_600_000, 0)).toBeGreaterThan(0.7); // swinging round the pole
    expect(polarMapOpacity(tl, tl.landingMs, 1)).toBe(0); // at the site
    // continuous: no jump between two frames at 1 h/s (1 min of mission per frame)
    let prev = 0;
    let worst = 0;
    for (let t = tl.lunarArrivalMs - 3_600_000; t <= tl.landingMs; t += 60_000) {
      const o = polarMapOpacity(tl, t, 0);
      worst = Math.max(worst, Math.abs(o - prev));
      prev = o;
    }
    expect(worst).toBeLessThan(0.05);
  });
});
