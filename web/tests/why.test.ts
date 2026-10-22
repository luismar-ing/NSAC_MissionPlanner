/** T3.3.d: best badges per metric (ties included) and the why text built from the plan's own figures. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { WindowRow } from "../src/lib/contract";
import { bestBadges, fmtMetric, METRICS, num, whyText } from "../src/lib/why";

const row = (o: Partial<WindowRow>): WindowRow => ({
  start: "2027-01-01T00:00:00Z",
  sun_pct: 50,
  longest_dark_h: 20,
  earth_h_min: 24,
  earth_h_mean: 24,
  longest_comm_gap_h: 0,
  score: 0.5,
  ...o,
});

describe("best badges", () => {
  it("go to the right panel per metric, in the right direction", () => {
    const b = bestBadges([
      row({ sun_pct: 92, longest_dark_h: 30, score: 0.8 }),
      row({ sun_pct: 60, longest_dark_h: 14, score: 0.7 }),
      row({ sun_pct: 40, longest_dark_h: 50, earth_h_min: 10, score: 0.2 }),
    ]);
    expect([...b[0]].sort()).toEqual(["earth_h_min", "score", "sun_pct"]); // earth_h_min tied with panel 2
    expect([...b[1]].sort()).toEqual(["earth_h_min", "longest_dark_h"]);
    expect(b[2].size).toBe(0);
  });
  it("ties share the badge; a metric where everyone ties gets none", () => {
    const b = bestBadges([row({ sun_pct: 92 }), row({ sun_pct: 92 }), row({ sun_pct: 60 })]);
    expect(b[0].has("sun_pct")).toBe(true);
    expect(b[1].has("sun_pct")).toBe(true);
    expect(b[2].has("sun_pct")).toBe(false);
    // earth_h_min, earth_h_mean, comm gap and score are equal everywhere → no badge for them
    for (const s of b) for (const k of ["earth_h_min", "earth_h_mean", "longest_comm_gap_h", "score"] as const) expect(s.has(k)).toBe(false);
  });
  it("one plan alone gets no badges", () => {
    expect(bestBadges([row({})])[0].size).toBe(0);
  });
});

describe("why text", () => {
  it("follows the spec example", () => {
    const r = row({ sun_pct: 92, longest_dark_h: 14 });
    expect(whyText(r, new Set(["sun_pct", "longest_dark_h"]))).toBe("Best option for 92% sunlight and a longest dark of only 14 h.");
  });
  it("cites the plan's real figures for every window of the data", () => {
    const REAL = join(__dirname, "..", "public", "data", "windows");
    const sites = ["connecting_ridge", "haworth", "nobile_rim_1", "malapert_massif", "de_gerlache_rim_2"];
    let n = 0;
    for (const s of sites) {
      const rows = (JSON.parse(readFileSync(join(REAL, `${s}_7d.json`), "utf-8")) as { rows: WindowRow[] }).rows;
      for (let i = 0; i + 2 < rows.length; i += 30) {
        const trio = rows.slice(i, i + 3);
        const best = bestBadges(trio);
        trio.forEach((r, j) => {
          const t = whyText(r, best[j]);
          // every number in the sentence is one of this plan's metrics
          const allowed = new Set(METRICS.map(({ key }) => num(r[key])).concat([fmtMetric("score", r.score)]));
          for (const m of t.match(/\d+(\.\d+)?/g) ?? []) expect(allowed.has(m), `${m} in "${t}"`).toBe(true);
          if (best[j].has("sun_pct")) expect(t).toMatch(new RegExp(`${num(r.sun_pct)}% sunlight|the most sunlight \\(${num(r.sun_pct)}%\\)`));
          // never "only" for a long blackout, never the same caveat twice
          expect(t).not.toMatch(/only (2[5-9]|[3-9]\d|\d{3,})(\.\d)? h/);
          expect((t.match(/without Sun/g) ?? []).length).toBeLessThanOrEqual(1);
          n++;
        });
      }
    }
    expect(n).toBeGreaterThan(150);
  });
  it("states a weak best value as a relative best, and does not repeat it as a caveat (T5.1.b)", () => {
    expect(whyText(row({ sun_pct: 10.1, longest_dark_h: 151, earth_h_min: 20 }), new Set(["sun_pct", "longest_dark_h"]))).toBe(
      "Best option for the most sunlight (10.1%) and the shortest dark stretch (151 h).",
    );
    expect(whyText(row({ sun_pct: 40, longest_dark_h: 30, earth_h_min: 20, longest_comm_gap_h: 0.5 }), new Set(["longest_comm_gap_h"]))).toBe(
      "Best option for comm gaps of at most 0.5 h.",
    );
    expect(whyText(row({ sun_pct: 100, longest_dark_h: 0, earth_h_min: 0 }), new Set())).toBe(
      "100% sunlight, no dark stretch. Earth is out of view for at least one whole day.",
    );
  });
  it("warns about long darkness even when the plan is best at something else", () => {
    const t = whyText(row({ sun_pct: 70, longest_dark_h: 89.5 }), new Set(["sun_pct"]));
    expect(t).toBe("Best option for 70% sunlight. Watch out: 89.5 h without Sun.");
  });
});
