/** T6.5.a: plain-English constraints -> X (sunlight %), Y (darkness h), Z (Earth contact h/day), in the browser. */
import { describe, expect, it } from "vitest";
import { parseConstraints } from "../src/lib/nlConstraints";

const L = 7;
const CASES: [string, Record<string, number | null>][] = [
  ["At least 80% sunlight", { minSunPct: 80 }],
  ["no more than 24 hours of darkness", { maxDarkH: 24 }],
  ["Earth contact at least 12 hours a day", { minEarthH: 12 }],
  ["sunlight above 90 percent and darkness under 2 days", { minSunPct: 90, maxDarkH: 48 }],
  ["always in contact with Earth", { minEarthH: 24 }],
  ["never dark", { maxDarkH: 0 }],
  ["more than 70% sun, max 48h dark, earth 8 h per day", { minSunPct: 70, maxDarkH: 48, minEarthH: 8 }],
  ["I need 95% sunlight with at most 12 hours in the dark", { minSunPct: 95, maxDarkH: 12 }],
  ["clear all constraints", { minSunPct: null, maxDarkH: null, minEarthH: null }],
  ["earth link of 10.5 hours/day and 85 percent illumination", { minEarthH: 10.5, minSunPct: 85 }],
];

describe("constraints in plain English (T6.5.a)", () => {
  for (const [text, expected] of CASES) {
    it(`"${text}"`, () => {
      const r = parseConstraints(text, L);
      expect(r.patch).toEqual(expected);
      expect(r.unrecognized).toEqual([]);
    });
  }

  it("says what it cannot express instead of guessing", () => {
    expect(parseConstraints("land near water ice", L)).toEqual({ patch: {}, understood: [], unrecognized: ["land near water ice"] });
    // a maximum of sunlight is not one of the controls
    expect(parseConstraints("less than 50% sunlight", L).patch).toEqual({});
  });

  it("keeps values inside the controls' ranges (darkness up to the whole window)", () => {
    expect(parseConstraints("darkness under 30 days", 7).patch).toEqual({ maxDarkH: 168 });
    expect(parseConstraints("at least 130% sun", 7).patch).toEqual({ minSunPct: 100 });
    expect(parseConstraints("earth contact 7.3 h a day", 7).patch).toEqual({ minEarthH: 7.5 });
  });
});
