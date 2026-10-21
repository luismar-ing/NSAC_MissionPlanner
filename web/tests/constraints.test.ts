/** T3.1.d: constraint filtering and metric index, with a timing on the full real dataset. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { WindowRow } from "../src/lib/contract";
import { buildWindowIndex, countValid, lookup, meetsConstraints, validMask } from "../src/lib/constraints";
import type { Constraints } from "../src/store/appStore";

const REAL = join(__dirname, "..", "public", "data");
const SITES: string[] = JSON.parse(readFileSync(join(REAL, "manifest.json"), "utf-8")).sites;
const rows = (sid: string, L: number): WindowRow[] =>
  JSON.parse(readFileSync(join(REAL, "windows", `${sid}_${L}d.json`), "utf-8")).rows;
const OFF: Constraints = { minSunPct: null, maxDarkH: null, minEarthH: null };

describe("meetsConstraints (spec 5.6)", () => {
  const row = { sun_pct: 80, longest_dark_h: 12, earth_h_min: 6 };
  it("is optional and inclusive, like pipeline/windows.py", () => {
    expect(meetsConstraints(row, OFF)).toBe(true);
    expect(meetsConstraints(row, { minSunPct: 80, maxDarkH: 12, minEarthH: 6 })).toBe(true);
    expect(meetsConstraints(row, { ...OFF, minSunPct: 80.01 })).toBe(false);
    expect(meetsConstraints(row, { ...OFF, maxDarkH: 11.99 })).toBe(false);
    expect(meetsConstraints(row, { ...OFF, minEarthH: 6.01 })).toBe(false);
  });
});

describe("index and mask over the real dataset", () => {
  const byL = Object.fromEntries([3, 7, 14].map((L) => [L, buildWindowIndex(L, Object.fromEntries(SITES.map((s) => [s, rows(s, L)])), SITES)]));

  it("indexes every cell and looks up known values", () => {
    const idx = byL[7];
    expect(idx.nDays).toBe(365);
    const r = rows("haworth", 7).find((x) => x.start.startsWith("2027-03-10"))!;
    const got = lookup(idx, "haworth", "2027-03-10")!;
    expect(got.sun_pct).toBeCloseTo(r.sun_pct, 4);
    expect(got.longest_dark_h).toBeCloseTo(r.longest_dark_h, 4);
    expect(lookup(idx, "haworth", "2028-01-01")).toBeNull();
    expect(lookup(idx, "nowhere", "2027-03-10")).toBeNull();
  });

  it("the mask agrees with meetsConstraints cell by cell", () => {
    const c: Constraints = { minSunPct: 75, maxDarkH: 48, minEarthH: 8 };
    for (const L of [3, 7, 14]) {
      const mask = validMask(byL[L], c);
      SITES.forEach((sid, s) =>
        rows(sid, L).forEach((r, d) => expect(mask[s * 365 + d]).toBe(meetsConstraints(r, c) ? 1 : 0)),
      );
    }
    expect(countValid(validMask(byL[7], OFF))).toBe(5 * 365); // no control → every cell valid
  });

  it("re-filters all 5 sites × 365 days × 3 L in under 10 ms", () => {
    const masks = [3, 7, 14].map(() => new Uint8Array(5 * 365));
    const settings: Constraints[] = Array.from({ length: 50 }, (_, i) => ({ minSunPct: i * 2, maxDarkH: 200 - i * 3, minEarthH: (i % 24) / 2 }));
    const t0 = performance.now();
    for (const c of settings) [3, 7, 14].forEach((L, k) => validMask(byL[L], c, masks[k]));
    const perUpdate = (performance.now() - t0) / settings.length;
    console.log(`validMask: ${perUpdate.toFixed(3)} ms per update (5 sites × 365 days × 3 L = 5475 cells)`);
    expect(perUpdate).toBeLessThan(10);
  });
});
