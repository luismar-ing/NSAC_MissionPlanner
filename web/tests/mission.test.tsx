// @vitest-environment jsdom
/** T4.1.d: mission timeline and controls (spec 8.2). */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Plan, Trajectory } from "../src/lib/contract";
import { clampMission, missionClock, phaseAt, phaseStart, PLAY_PHASES, timelineOf, type MissionTimeline } from "../src/lib/mission";
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
    expect(new Date(tl.startMs).toISOString()).toBe(plan.launch_utc.replace("Z", ".000Z"));
    expect(new Date(tl.landingMs).toISOString()).toBe(plan.arrival_utc.replace("Z", ".000Z"));
    expect(tl.endMs - tl.landingMs).toBe(plan.window_days * 86_400_000);
    expect(tl.startMs).toBeLessThanOrEqual(tl.injectionMs);
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
    const c = missionClock(tl, tl.startMs + (2 * 1440 + 4 * 60 + 30) * 60_000);
    expect(c.elapsed).toBe("T+ 2d 04:30");
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
