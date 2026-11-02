// @vitest-environment jsdom
/**
 * T6.3.a: detailed launch (ILLUSTRATIVE): the first stage separates and the fairing opens during the ascent, in a
 * slow motion held through the ascent; switched off, the rocket and the playback are the MVP's.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { Plan, Trajectory } from "../src/lib/contract";
import { parseInstant } from "../src/lib/contract";
import { ASCENT_SLOW_RATE, LAUNCH_RAMP_MS, LAUNCH_SLOW_RATE, playbackRate, timelineOf } from "../src/lib/mission";
import { ASCENT_MS, STAGING, stagingAt } from "../src/scene3d/launch";
import { createPlume, createRocket, setStaging } from "../src/scene3d/rocket";

const DATA = join(__dirname, "..", "public", "data");
const plans = JSON.parse(readFileSync(join(DATA, "plans.json"), "utf-8")) as Plan[];
const plan = plans.find((p) => p.id === "haworth_20270309_7d")!;
const traj = JSON.parse(readFileSync(join(DATA, "trajectory", `${plan.trajectory_id}.json`), "utf-8")) as Trajectory;
const tl = timelineOf(plan, traj);
const launch = parseInstant(traj.phases.launch_utc);

describe("detailed launch (T6.3.a)", () => {
  it("separation, then fairing, both within the ascent; each part falls away in FALL_MS", () => {
    expect(stagingAt(traj, launch - 1)).toEqual({ firstStage: -1, fairing: -1, plumeAt: "first" });
    const sep = stagingAt(traj, launch + STAGING.separationMs + STAGING.fallMs / 2);
    expect(sep.firstStage).toBeCloseTo(0.5, 9);
    expect(sep.fairing).toBe(-1);
    expect(sep.plumeAt).toBe("second");
    const end = stagingAt(traj, launch + ASCENT_MS);
    expect(end).toEqual({ firstStage: 1, fairing: 1, plumeAt: "second" });
    expect(STAGING.fairingMs + STAGING.fallMs).toBeLessThanOrEqual(ASCENT_MS);
  });

  it("the rocket: whole when off; while staging the spent stage drops behind and fades, the fairing opens", () => {
    const r = createRocket();
    const plume = createPlume();
    setStaging(r, plume, null);
    const box = new THREE.Box3().setFromObject(r);
    expect(box.min.y).toBeCloseTo(0, 6);
    expect(box.max.y).toBeCloseTo(1, 6);
    setStaging(r, plume, { firstStage: 0.5, fairing: 0.5, plumeAt: "second" });
    const s1 = r.getObjectByName("stage-1")!;
    expect(s1.position.y).toBeLessThan(-0.3);
    expect(((s1.getObjectByName("rocket-body") as THREE.Mesh).material as THREE.Material).opacity).toBeCloseTo(0.5, 9);
    expect(r.getObjectByName("fairing-0")!.position.x).toBeGreaterThan(0);
    expect(r.getObjectByName("fairing-1")!.position.x).toBeLessThan(0);
    expect(plume.position.y).toBeCloseTo(0.6, 9);
    setStaging(r, plume, { firstStage: 1, fairing: 1, plumeAt: "second" });
    expect(s1.visible).toBe(false);
    setStaging(r, plume, null); // switching it off puts every part back
    expect(s1.visible && s1.position.y === 0 && plume.position.y === 0).toBe(true);
  });

  it("slow motion is held through the ascent only with the extra on, then the same continuous ramp", () => {
    expect(playbackRate(tl, launch + ASCENT_MS / 2, 6)).toBeGreaterThan(LAUNCH_SLOW_RATE); // MVP: ramping already
    expect(playbackRate(tl, launch - 1, 6, ASCENT_MS)).toBe(LAUNCH_SLOW_RATE); // countdown as in the MVP
    expect(playbackRate(tl, launch + ASCENT_MS / 2, 6, ASCENT_MS)).toBe(ASCENT_SLOW_RATE);
    expect(playbackRate(tl, launch + ASCENT_MS, 6, ASCENT_MS)).toBeCloseTo(ASCENT_SLOW_RATE, 9); // ramp starts where it was
    expect(playbackRate(tl, launch + ASCENT_MS + LAUNCH_RAMP_MS, 6, ASCENT_MS)).toBe(6 * 3600);
    // the staging (3 to 6 min after launch) now lasts long enough on screen at 6 h/s
    const seconds = (STAGING.fairingMs + STAGING.fallMs - STAGING.separationMs) / ASCENT_SLOW_RATE / 1000;
    expect(seconds).toBeGreaterThan(1.4);
    expect(ASCENT_MS / ASCENT_SLOW_RATE / 1000).toBeLessThan(6); // and the whole ascent stays short
  });
});
