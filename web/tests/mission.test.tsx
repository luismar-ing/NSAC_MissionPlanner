// @vitest-environment jsdom
/** T4.1.d: mission timeline and controls (spec 8.2). */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Plan, Trajectory } from "../src/lib/contract";
import { clampMission, LAUNCH_RAMP_MS, LAUNCH_SLOW_RATE, missionClock, phaseAt, phaseStart, playbackRate, PLAY_PHASES, PRELAUNCH_MS, timelineOf, type MissionTimeline } from "../src/lib/mission";
import { MissionControls } from "../src/scene3d/MissionControls";
import { appStore } from "../src/store/appStore";

const REAL = join(__dirname, "..", "public", "data");
const fileFetch = (async (url: string) => {
  try {
    return new Response(readFileSync(join(REAL, url.replace(/^.*\/data\//, "").replace(/^\/base\//, ""))), { status: 200 });
  } catch {
    return new Response("", { status: 404 });
  }
}) as typeof fetch;

let plan: Plan;
let traj: Trajectory;
let tl: MissionTimeline;
const PLAN_ID = "haworth_20270309_7d";

beforeAll(async () => {
  globalThis.fetch = fileFetch;
  await appStore.getState().loadCore();
  plan = appStore.getState().plansById.get(PLAN_ID)!;
  traj = await appStore.getState().data.trajectory(plan.trajectory_id);
  tl = timelineOf(plan, traj);
});
afterEach(cleanup);

describe("mission timeline (spec 5.8)", () => {
  it("runs from launch to the end of the stay, phases in order", () => {
    expect(new Date(tl.launchMs).toISOString()).toBe(plan.launch_utc.replace("Z", ".000Z"));
    expect(tl.launchMs - tl.startMs).toBe(PRELAUNCH_MS); // illustrative countdown on the pad (T4.2.b)
    expect(new Date(tl.landingMs).toISOString()).toBe(plan.arrival_utc.replace("Z", ".000Z"));
    expect(tl.endMs - tl.landingMs).toBe(plan.window_days * 86_400_000);
    expect(tl.launchMs).toBeLessThanOrEqual(tl.injectionMs);
    expect(tl.injectionMs).toBeLessThanOrEqual(tl.lunarArrivalMs);
    expect(tl.lunarArrivalMs).toBeLessThanOrEqual(tl.landingMs);
  });

  it("phase at each boundary and inside each phase", () => {
    expect(phaseAt(tl, tl.startMs)).toBe("launch");
    expect(phaseAt(tl, tl.injectionMs - 1)).toBe("launch");
    expect(phaseAt(tl, tl.injectionMs)).toBe("transit");
    expect(phaseAt(tl, tl.lunarArrivalMs)).toBe("landing");
    expect(phaseAt(tl, tl.landingMs)).toBe("site");
    expect(phaseAt(tl, tl.endMs)).toBe("site");
    for (const p of PLAY_PHASES) expect(phaseAt(tl, phaseStart(tl, p))).toBe(p);
  });

  it("clamps to the mission and formats the clock", () => {
    expect(clampMission(tl, tl.startMs - 1e9)).toBe(tl.startMs);
    expect(clampMission(tl, tl.endMs + 1e9)).toBe(tl.endMs);
    const c = missionClock(tl, tl.launchMs + (2 * 1440 + 4 * 60 + 30) * 60_000);
    expect(c.elapsed).toBe("T+ 2d 04:30");
    expect(missionClock(tl, tl.startMs).elapsed).toBe("T− 05:00");
    expect(missionClock(tl, tl.launchMs - 30_000).elapsed).toBe("T− 00:30");
    expect(missionClock(tl, tl.launchMs).elapsed).toBe("T+ 0d 00:00");
    expect(missionClock(tl, tl.landingMs).utc).toBe(`${plan.arrival_utc.slice(0, 10)} 00:00 UTC`);
  });
});

describe("mission controls (acceptance: jumping to each phase sets the right missionTime)", () => {
  it("a freshly selected plan starts at launch; each phase button jumps to its start", () => {
    appStore.getState().selectPlan(PLAN_ID); // missionPhase = overview, missionTime = arrival
    render(<MissionControls timeline={tl} />);
    expect(appStore.getState().missionTime).toBe(tl.startMs);
    expect(appStore.getState().missionPhase).toBe("launch");
    const expected = { launch: tl.startMs, transit: tl.injectionMs, landing: tl.lunarArrivalMs, site: tl.landingMs };
    for (const [label, phase] of [
      ["Launch", "launch"],
      ["Transit", "transit"],
      ["Landing", "landing"],
      ["At the site", "site"],
    ] as const) {
      fireEvent.click(screen.getByRole("button", { name: label }));
      expect(appStore.getState().missionTime, label).toBe(expected[phase]);
      expect(appStore.getState().missionPhase).toBe(phase);
      expect(screen.getByTestId("mission-phase").textContent).toBe(label);
    }
  });

  it("the scrubber covers the whole mission and keeps the phase in step", () => {
    appStore.getState().selectPlan(PLAN_ID);
    render(<MissionControls timeline={tl} />);
    const slider = screen.getByRole("slider", { name: /mission time/i }) as HTMLInputElement;
    expect(Number(slider.max)).toBe((tl.endMs - tl.startMs) / 60_000);
    fireEvent.change(slider, { target: { value: String((tl.lunarArrivalMs - tl.startMs) / 60_000 + 60) } });
    expect(appStore.getState().missionPhase).toBe("landing");
    expect(appStore.getState().missionTime).toBe(tl.lunarArrivalMs + 3_600_000);
  });

  it("re-entering the live view keeps the clock where it was", () => {
    appStore.getState().selectPlan(PLAN_ID);
    const first = render(<MissionControls timeline={tl} />);
    fireEvent.click(screen.getByRole("button", { name: "Landing" }));
    first.unmount();
    render(<MissionControls timeline={tl} />);
    expect(appStore.getState().missionTime).toBe(tl.lunarArrivalMs);
  });
});

describe("slow motion around launch (T5.2.a)", () => {
  /** Real seconds that playback takes between two mission instants, at 60 fps. */
  const realSeconds = (from: number, to: number, hPerS: number) => {
    let t = from;
    let frames = 0;
    while (t < to) {
      t += (1000 / 60) * playbackRate(tl, t, hPerS);
      frames++;
    }
    return frames / 60;
  };

  it("slow before launch, continuous ramp to full speed, never slower than chosen below the slow rate", () => {
    expect(playbackRate(tl, tl.startMs, 6)).toBe(LAUNCH_SLOW_RATE);
    expect(playbackRate(tl, tl.launchMs, 6)).toBeCloseTo(LAUNCH_SLOW_RATE, 9);
    expect(playbackRate(tl, tl.launchMs + LAUNCH_RAMP_MS, 6)).toBe(6 * 3600);
    expect(playbackRate(tl, tl.launchMs + LAUNCH_RAMP_MS / 2, 6)).toBeCloseTo(Math.sqrt(LAUNCH_SLOW_RATE * 6 * 3600), 6);
    let prev = playbackRate(tl, tl.launchMs, 6);
    for (let m = 1; m <= 30; m++) {
      const r = playbackRate(tl, tl.launchMs + m * 60_000, 6);
      expect(r).toBeGreaterThan(prev);
      expect(r / prev).toBeLessThan(1.2); // smooth: < 20 % per mission minute
      prev = r;
    }
    expect(playbackRate(tl, tl.startMs, 300 / 3600)).toBe(300); // already slow: unchanged
  });

  it("at 6 h/s the countdown and lift-off last a few seconds on screen, and the whole flight only a little longer", () => {
    const countdown = realSeconds(tl.startMs, tl.launchMs, 6);
    const liftoff = realSeconds(tl.launchMs, tl.launchMs + LAUNCH_RAMP_MS, 6);
    const flight = realSeconds(tl.startMs, tl.landingMs, 6);
    const flat = (tl.landingMs - tl.startMs) / (6 * 3_600_000);
    console.log(`playback at 6 h/s: countdown ${countdown.toFixed(1)} s, first 30 min after launch ${liftoff.toFixed(1)} s, launch to landing ${flight.toFixed(1)} s (was ${flat.toFixed(1)} s)`);
    expect(countdown).toBeGreaterThan(0.9);
    expect(liftoff).toBeGreaterThan(1);
    expect(flight - flat).toBeLessThan(3);
  });
});
