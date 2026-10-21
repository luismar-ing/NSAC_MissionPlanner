/** T3.2.a: calendar colour source changes with mode and L; ramps are valid sequential ramps. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { arrivalDate, cellAt, cellColorIndices, cellRect, makeLayout, monthTicks } from "../src/lib/calendar";
import { lutIndex, lutLightness, rampLut } from "../src/lib/colorScale";
import { buildWindowIndex } from "../src/lib/constraints";

const REAL = join(__dirname, "..", "public", "data");
const SITES: string[] = JSON.parse(readFileSync(join(REAL, "manifest.json"), "utf-8")).sites;
const index = (L: number) =>
  buildWindowIndex(L, Object.fromEntries(SITES.map((s) => [s, JSON.parse(readFileSync(join(REAL, "windows", `${s}_${L}d.json`), "utf-8")).rows])), SITES);

describe("colour source", () => {
  it("changing the mode changes the colour source", () => {
    const idx = index(7);
    const a = cellColorIndices(idx, "combined");
    const b = cellColorIndices(idx, "energy");
    const c = cellColorIndices(idx, "comms");
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);
    expect(Buffer.from(b).equals(Buffer.from(c))).toBe(false);
    // energy colour follows sun_pct on its fixed 0–100 domain
    expect(b[0]).toBe(lutIndex("energy", idx.metrics.sun_pct[0]));
  });

  it("changing L changes the colour source", () => {
    const a = cellColorIndices(index(3), "combined");
    const b = cellColorIndices(index(14), "combined");
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);
  });
});

describe("sequential ramps (spec 9 hues)", () => {
  it.each(["combined", "energy", "comms"] as const)("%s ramp gets lighter monotonically", (mode) => {
    const L = lutLightness(rampLut(mode));
    for (let i = 1; i < L.length; i++) expect(L[i]).toBeGreaterThanOrEqual(L[i - 1] - 1e-9);
    expect(L[255] - L[0]).toBeGreaterThan(0.35); // wide lightness range for magnitude
  });
});

describe("layout", () => {
  const l = makeLayout(1500, 5, 365);
  it("maps cells to pixels and back", () => {
    const [x, y, w, h] = cellRect(l, 3, 200);
    expect(cellAt(l, x + w / 2, y + h / 2)).toEqual({ site: 3, day: 200 });
    expect(cellAt(l, 5, y + 1)).toBeNull(); // label area
    expect(cellAt(l, x, y + h + 1)).toBeNull(); // 2 px gap between rows
  });
  it("labels months and dates", () => {
    const ticks = monthTicks("2027-01-01", 365);
    expect(ticks.map((t) => t.label)).toEqual(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]);
    expect(arrivalDate("2027-01-01", 68)).toBe("2027-03-10");
  });
});
