/**
 * T3.5.a: parity of constraints and score between Python (pipeline/windows.py meets_constraints, T1.4.c)
 * and TypeScript (lib/constraints.ts, T3.1.d) on the real data. The sample is written by
 * `python -m pipeline.parity` from the same windows files the app loads.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { WindowRow } from "../src/lib/contract";
import { buildWindowIndex, countValid, dayIndex, lookup, validMask, type WindowIndex } from "../src/lib/constraints";
import type { Constraints } from "../src/store/appStore";

const DATA = join(__dirname, "..", "public", "data");
const sample = JSON.parse(readFileSync(join(__dirname, "fixtures", "parity_sample.json"), "utf-8")) as {
  cells: {
    site_id: string;
    window_days: 3 | 7 | 14;
    arrival: string;
    constraints: Constraints;
    at_limit: boolean;
    meets: boolean;
    score: number;
    valid_cells_L: number;
  }[];
};
const sites = (JSON.parse(readFileSync(join(DATA, "sites.json"), "utf-8")) as { id: string }[]).map((s) => s.id);
const index: Record<number, WindowIndex> = {};
for (const L of [3, 7, 14]) {
  const rows = Object.fromEntries(
    sites.map((s) => [s, (JSON.parse(readFileSync(join(DATA, "windows", `${s}_${L}d.json`), "utf-8")) as { rows: WindowRow[] }).rows]),
  );
  index[L] = buildWindowIndex(L, rows, sites);
}

describe("Python ↔ TypeScript parity on 100 sampled cells (real data)", () => {
  it("the sample is the one the pipeline wrote, with boundary cases", () => {
    expect(sample.cells).toHaveLength(100);
    expect(sample.cells.filter((c) => c.at_limit).length).toBeGreaterThan(30);
    expect(sample.cells.some((c) => c.meets) && sample.cells.some((c) => !c.meets)).toBe(true);
  });

  it("same constraint result per cell, same valid-cell count over the whole grid, same score", () => {
    let mismatches = 0;
    for (const c of sample.cells) {
      const ix = index[c.window_days];
      const mask = validMask(ix, c.constraints);
      const k = ix.siteIds.indexOf(c.site_id) * ix.nDays + dayIndex(ix, c.arrival);
      const tsMeets = mask[k] === 1;
      if (tsMeets !== c.meets) mismatches++;
      expect(tsMeets, `${c.site_id} ${c.arrival} L=${c.window_days} ${JSON.stringify(c.constraints)}`).toBe(c.meets);
      expect(countValid(mask)).toBe(c.valid_cells_L);
      // Float32 storage: equal to the JSON score within float32 precision
      expect(Math.abs(lookup(ix, c.site_id, c.arrival)!.score - c.score)).toBeLessThan(1e-6);
    }
    console.log(`parity: 100 cells, ${mismatches} mismatches, ${sample.cells.filter((c) => c.at_limit).length} at the exact limit`);
  });
});
