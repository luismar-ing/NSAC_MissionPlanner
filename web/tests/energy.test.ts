/** T6.4.a: battery state of charge from the sunlight series, with ASSUMED parameters. */
import { describe, expect, it } from "vitest";
import { ASSUMED_BATTERY, batteryHours, batteryRun } from "../src/lib/energy";

const STEP = 30; // minutes, the series' step
const P = { capacityWh: 1000, loadW: 100, solarW: 300, startSoc: 1 };

describe("battery model (T6.4.a)", () => {
  it("with the Sun all the time the charge never drops", () => {
    const run = batteryRun(new Uint8Array(48).fill(1), STEP, P);
    expect(run.minSoc).toBe(1);
    expect(Array.from(run.soc).every((s) => s === 1)).toBe(true);
  });

  it("in continuous darkness it drops at the load rate, then stays empty", () => {
    const run = batteryRun(new Uint8Array(30).fill(0), STEP, P);
    // 100 W for 0.5 h = 50 Wh per sample out of 1000 Wh: 5 % per sample
    expect(run.soc[0]).toBeCloseTo(0.95, 6);
    expect(run.soc[9]).toBeCloseTo(0.5, 6);
    expect(run.soc[19]).toBeCloseTo(0, 6);
    expect(run.soc[29]).toBe(0);
    expect(run.emptySamples).toBe(11); // samples 19..29
  });

  it("charges back in sunlight at (solar − load), up to the capacity", () => {
    const vis = new Uint8Array(20);
    vis.fill(0, 0, 10).fill(1, 10, 20);
    const run = batteryRun(vis, STEP, P);
    expect(run.minSoc).toBeCloseTo(0.5, 6);
    expect(run.minAt).toBe(9);
    expect(run.soc[10]).toBeCloseTo(0.6, 6); // +200 W × 0.5 h = +100 Wh
    expect(run.soc[19]).toBe(1);
  });

  it("the assumed battery lasts capacity / load hours of darkness", () => {
    expect(batteryHours(ASSUMED_BATTERY)).toBe(20);
  });
});
