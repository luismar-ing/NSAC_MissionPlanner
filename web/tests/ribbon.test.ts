/** T3.3.c: time ribbon states and the longest dark stretch, checked against the pipeline's window metrics. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DataStore } from "../src/lib/data";
import { sliceWindow } from "../src/lib/planData";
import { longestZeroRun, relativeLabel, stateRuns } from "../src/lib/ribbon";

const REAL = join(__dirname, "..", "public", "data");
const fileFetch = (async (url: string) =>
  new Response(readFileSync(join(REAL, url.replace(/^\/base\//, ""))), { status: 200 })) as typeof fetch;

describe("ribbon logic", () => {
  it("groups samples into Sun / Earth / both / none runs", () => {
    const runs = stateRuns([1, 1, 1, 0, 0, 0], [1, 0, 0, 1, 0, 0]);
    expect(runs).toEqual([
      { start: 0, end: 1, state: "both" },
      { start: 1, end: 3, state: "sun" },
      { start: 3, end: 4, state: "earth" },
      { start: 4, end: 6, state: "none" },
    ]);
  });
  it("finds the longest zero run, including one touching the end; first wins ties", () => {
    expect(longestZeroRun([1, 0, 0, 1, 0, 0, 0])).toEqual({ start: 4, end: 7 });
    expect(longestZeroRun([0, 0, 1, 0, 0])).toEqual({ start: 0, end: 2 });
    expect(longestZeroRun([1, 1])).toBeNull();
  });
  it("labels samples relative to arrival", () => {
    expect(relativeLabel(0, 30)).toBe("Day 1, 00:00");
    expect(relativeLabel(55, 30)).toBe("Day 2, 03:30");
  });
});

describe("highlighted stretch = longest_dark_h of the data (every site, L and arrival)", () => {
  it("matches windows/{site}_{L}d.json for all plans", async () => {
    const store = new DataStore("/base/", fileFetch as never);
    const sites = JSON.parse(readFileSync(join(REAL, "sites.json"), "utf-8")) as { id: string }[];
    let checked = 0;
    let maxErr = 0;
    for (const { id } of sites) {
      const ts = await store.timeseries(id);
      for (const L of [3, 7, 14] as const) {
        const win = await store.windows(id, L);
        for (const row of win.rows) {
          const s = sliceWindow(ts, row.start, L);
          const run = longestZeroRun(s.sunVis);
          const h = run ? ((run.end - run.start) * s.stepMin) / 60 : 0;
          maxErr = Math.max(maxErr, Math.abs(h - row.longest_dark_h));
          checked++;
        }
      }
    }
    console.log(`ribbon: ${checked} windows checked, max |Δ longest_dark_h| = ${maxErr} h`);
    expect(checked).toBeGreaterThan(5000);
    expect(maxErr).toBeLessThan(0.01);
  });
});
