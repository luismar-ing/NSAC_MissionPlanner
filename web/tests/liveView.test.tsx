// @vitest-environment jsdom
/** T4.3.c: arrival in the live view — panorama and site panel on missionPhase = site, on the mission clock. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Plan, Trajectory } from "../src/lib/contract";
import { DataStore } from "../src/lib/data";
import { timelineOf, type MissionTimeline } from "../src/lib/mission";
import { loadPlanData, type PlanData } from "../src/lib/planData";
import { appStore } from "../src/store/appStore";
import { LiveView } from "../src/views/LiveView";
import { sampleAtTime } from "../src/views/Panorama";

// the WebGL scene is covered by webgl.test.ts; here only the 2D state around it matters
vi.mock("../src/scene3d/SceneHost", () => ({ SceneHost: () => <div data-testid="scene-host" /> }));

const REAL = join(__dirname, "..", "public", "data");
const fileFetch = (async (url: string) => {
  try {
    return new Response(readFileSync(join(REAL, url.replace(/^.*\/data\//, "").replace(/^\/base\//, ""))), { status: 200 });
  } catch {
    return new Response("", { status: 404 });
  }
}) as typeof fetch;

const PLAN_ID = "haworth_20270309_7d";
let plan: Plan;
let tl: MissionTimeline;
let pd: PlanData;

beforeAll(async () => {
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1200 });
  globalThis.fetch = fileFetch;
  await appStore.getState().loadCore();
  plan = appStore.getState().plansById.get(PLAN_ID)!;
  const traj: Trajectory = await appStore.getState().data.trajectory(plan.trajectory_id);
  tl = timelineOf(plan, traj);
  pd = await loadPlanData(new DataStore("/base/", fileFetch as never), plan, appStore.getState().sites);
});
afterEach(cleanup);

const open = async () => {
  appStore.getState().selectPlan(PLAN_ID);
  appStore.getState().pinPlan(PLAN_ID);
  appStore.getState().pinPlan("malapert_massif_20271015_7d");
  appStore.getState().setViewMode("live");
  render(<LiveView />);
  await screen.findByTestId("mission-controls", {}, { timeout: 5000 }); // first load of the plan data; slow when the whole suite runs
};

describe("arrival at the site (spec 8.2 phase 4, 8.6)", () => {
  it("before landing: scene, scale indicator and ILLUSTRATIVE label, no panorama or site panel", async () => {
    await open();
    // the controls start the mission in an effect right after they appear
    await waitFor(() => expect(appStore.getState().missionPhase).toBe("launch"));
    expect(screen.queryByTestId("live-site")).toBeNull();
    expect(screen.getByTestId("illustrative-label")).toBeTruthy();
    for (const label of ["Transit", "Landing"]) {
      fireEvent.click(screen.getByRole("button", { name: label }));
      expect(screen.queryByTestId("live-site")).toBeNull();
    }
  });

  it("entering the site phase shows the panorama and the site panel; leaving it hides them", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "At the site" }));
    expect(appStore.getState().missionPhase).toBe("site");
    const dock = await screen.findByTestId("live-site");
    const panorama = await within(dock).findByTestId("panorama");
    expect(within(dock).getByLabelText(/Site features/)).toBeTruthy();
    expect(screen.queryByTestId("illustrative-label")).toBeNull(); // the site itself is real data
    expect(screen.getByTestId("live-view").className).toContain("at-site");
    expect(screen.getByText(/Arrived at Haworth/)).toBeTruthy(); // polite announcement
    expect(panorama.getAttribute("data-sample")).toBe("0"); // landing = arrival = first sample of the window
    fireEvent.click(screen.getByRole("button", { name: "Landing" }));
    expect(screen.queryByTestId("live-site")).toBeNull();
  });

  it("the panorama follows missionTime: scrubbing and playback move it with the scene clock", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "At the site" }));
    const panorama = await screen.findByTestId("panorama");
    const slider = screen.getByRole("slider", { name: /mission time/i });
    for (const hours of [1, 26, 100, 7 * 24 - 1]) {
      const t = tl.landingMs + hours * 3_600_000;
      fireEvent.change(slider, { target: { value: String((t - tl.startMs) / 60_000) } });
      expect(appStore.getState().missionTime).toBe(t);
      const { k, inside } = sampleAtTime(pd, t);
      expect(inside).toBe(true);
      expect(panorama.getAttribute("data-sample"), `${hours} h`).toBe(String(k));
      expect(k).toBe(Math.floor((hours * 60) / pd.series.stepMin));
    }
    // the same store clock, written by anyone (here directly, as playback does), moves the panorama
    const t = tl.landingMs + 50 * 3_600_000;
    act(() => appStore.getState().setMissionTime(t));
    await waitFor(() => expect(panorama.getAttribute("data-sample")).toBe(String(sampleAtTime(pd, t).k)));
  });
});
