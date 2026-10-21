/** T3.3.b: shared az/el → pixel projection (also used by the panorama, T3.4). */
import { describe, expect, it } from "vitest";
import { angularSizePx, azToX, centredOn, elToY, exaggerationOf, makeProjection, pxPerDeg, silhouettePath, trackPath } from "../src/lib/projection";

describe("projection", () => {
  const p = makeProjection(360, 160, { minDeg: -4, maxDeg: 12 });
  it("maps azimuth 0–360 left to right and elevation bottom to top", () => {
    expect(azToX(p, 0)).toBe(0);
    expect(azToX(p, 90)).toBe(90);
    expect(azToX(p, 360)).toBe(0);
    expect(azToX(p, -10)).toBe(350);
    expect(elToY(p, 12)).toBe(0);
    expect(elToY(p, -4)).toBe(160);
    expect(elToY(p, 0)).toBe(120);
  });
  it("recentres on any azimuth (panorama)", () => {
    const q = makeProjection(360, 160, { minDeg: -4, maxDeg: 12 }, null, 180);
    expect(azToX(q, 180)).toBe(0);
    expect(azToX(q, 0)).toBe(180);
  });
  it("vertical exaggeration is configurable and measurable", () => {
    expect(exaggerationOf(p)).toBeCloseTo(10, 6); // 160 px / 16° ÷ 1 px/°
    const q = makeProjection(360, 160, { minDeg: -4, maxDeg: 12 }, 20);
    expect(exaggerationOf(q)).toBeCloseTo(20, 6);
    expect(q.minEl).toBe(-4); // the bottom (terrain) stays anchored to the shared range
    expect(q.maxEl).toBeCloseTo(4, 9);
  });
  it("a narrower field of view centred on any azimuth (panorama zoom)", () => {
    const q = makeProjection(600, 200, { minDeg: -3, maxDeg: 12 }, null, centredOn(10, 60), 60);
    expect(q.startAz).toBe(340);
    expect(pxPerDeg(q)).toBe(10);
    expect(azToX(q, 10)).toBe(300); // centre
    expect(azToX(q, 340)).toBe(0);
    expect(azToX(q, 40)).toBe(600);
    // the silhouette covers exactly the field of view, wrapping through 0°
    const mask = Array.from({ length: 720 }, (_, i) => (i === 20 ? 6 : 0)); // 0.5° bins; bin 20 = az 10°
    const d = silhouettePath(q, mask, 0.5);
    expect(d.startsWith("M0.0,200 L0.0,")).toBe(true);
    expect(d).toContain("300.0,80.0"); // 6° at az 10 → y = (12 − 6)/15·200
    expect(d.endsWith("L600.0,200 Z")).toBe(true);
    expect(exaggerationOf(makeProjection(600, 200, { minDeg: -3, maxDeg: 12 }, 4, 0, 60))).toBeCloseTo(4, 9);
  });
  it("angular sizes use the horizontal scale (Sun 0.53°, Earth 1.9°)", () => {
    const wide = makeProjection(3600, 400, { minDeg: -3, maxDeg: 12 });
    expect(angularSizePx(wide, 0.53)).toBeCloseTo(5.3, 9);
    expect(angularSizePx(wide, 1.9)).toBeCloseTo(19, 9);
  });
  it("silhouette and tracks are well-formed paths; tracks break at the 0/360 wrap", () => {
    const mask = Array.from({ length: 360 }, (_, i) => (i === 90 ? 5 : 0));
    const d = silhouettePath(p, mask);
    expect(d.startsWith("M0.0,160 L0.0,")).toBe(true);
    expect(d).toContain("90.0,70.0"); // 5° at az 90 → y = (12 − 5)/16·160 = 70
    const t = trackPath(p, [350, 355, 2, 8], [1, 1, 1, 1]);
    expect(t.match(/M/g)).toHaveLength(2);
  });
});
