// @vitest-environment jsdom
/** T4.2.a: procedural rocket (own geometry, no licence to track) drawn at a constant apparent size (D8). */
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { apparentLength, createRocket, ROCKET_SCREEN_FRACTION } from "../src/scene3d/rocket";

describe("rocket model", () => {
  it("is 1 unit long along +Y with its base at the origin, slender, with 4 fins", () => {
    const r = createRocket();
    const box = new THREE.Box3().setFromObject(r);
    expect(box.min.y).toBeCloseTo(0, 6);
    expect(box.max.y).toBeCloseTo(1, 6);
    const width = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
    expect(width).toBeGreaterThan(0.1);
    expect(width).toBeLessThan(0.3); // slender: about 1:4 or thinner including fins
    expect(r.children.filter((c) => (c as THREE.Mesh).geometry instanceof THREE.ExtrudeGeometry)).toHaveLength(4);
  });

  it("apparent length keeps a constant fraction of the view height at any distance", () => {
    for (const d of [0.01, 10, 400]) {
      const L = apparentLength(d, 45, ROCKET_SCREEN_FRACTION);
      // projected height fraction = L / (2 d tan(fov/2))
      expect(L / (2 * d * Math.tan(((45 * Math.PI) / 180) / 2))).toBeCloseTo(ROCKET_SCREEN_FRACTION, 12);
    }
    expect(apparentLength(400, 45, 0.06)).toBeGreaterThan(19); // ~20 units = 20 000 km near the Moon: clearly not to scale
  });
});
