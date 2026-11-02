// @vitest-environment jsdom
/** TR.4.b: Educator chapter 1 (C2) picks the plan; "Begin the journey" opens chapter 2; Esc goes home. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { timelineOf } from "../src/lib/mission";
import { appStore } from "../src/store/appStore";

vi.mock("../src/scene3d/SceneHost", () => ({ SceneHost: () => <div data-testid="scene-host" /> }));

const REAL = join(__dirname, "..", "public", "data");
const fileFetch = (async (url: string) => {
  try {
    return new Response(readFileSync(join(REAL, url.replace(/^.*\/data\//, ""))), { status: 200 });
  } catch {
    return new Response("", { status: 404 });
  }
}) as typeof fetch;

beforeAll(async () => {
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  globalThis.fetch = fileFetch;
  await appStore.getState().loadCore();
});
beforeEach(() => {
  appStore.getState().setScreen("landing");
  appStore.getState().selectPlan(null);
});
afterEach(cleanup);

describe("Educator chapter 1 (C2)", () => {
  it("preselects the year's best 7-day plan; tabs and day bars choose the plan", async () => {
    render(<App />);
    act(() => appStore.getState().setScreen("educator"));
    expect(screen.getByRole("heading", { name: "Leaving Earth" })).toBeTruthy();
    const index = await appStore.getState().loadWindows(7);
    const best = Math.max(...index.metrics.score);
    await waitFor(() => {
      const p = appStore.getState().plansById.get(appStore.getState().selectedPlanId!)!;
      expect(p.window_days).toBe(7);
      const s = index.siteIds.indexOf(p.site_id);
      const d = Math.round((Date.parse(p.arrival_utc.slice(0, 10)) - Date.parse(index.firstArrival)) / 86_400_000);
      expect(index.metrics.score[s * index.nDays + d]).toBe(best);
    });
    const chosen = appStore.getState().plansById.get(appStore.getState().selectedPlanId!)!;
    const day = chosen.arrival_utc.slice(0, 10).replace(/-/g, "");

    const tabs = within(screen.getByRole("group", { name: "Landing site" }));
    const other = appStore.getState().sites.find((s) => s.id !== chosen.site_id)!;
    fireEvent.click(tabs.getByRole("button", { name: other.name }));
    expect(appStore.getState().selectedPlanId).toBe(`${other.id}_${day}_7d`);
    expect(tabs.getByRole("button", { name: other.name }).getAttribute("aria-pressed")).toBe("true");

    const bars = within(screen.getByRole("group", { name: /Arrival days/ }));
    const all = bars.getAllByRole("button");
    expect(all).toHaveLength(21);
    const target = all.find((b) => b.getAttribute("aria-pressed") === "false")!;
    fireEvent.click(target);
    expect(target.getAttribute("aria-pressed")).toBe("true");
    expect(appStore.getState().selectedPlanId).not.toBe(`${other.id}_${day}_7d`);
  });

  it("'Begin the journey' opens chapter 2 at launch; Back returns; Esc leaves for the start page", async () => {
    render(<App />);
    act(() => appStore.getState().setScreen("educator"));
    await waitFor(() => expect(appStore.getState().selectedPlanId).not.toBeNull());
    fireEvent.click(await screen.findByRole("button", { name: "Begin the journey" }));
    expect(screen.getByRole("heading", { name: "The journey" })).toBeTruthy();
    expect(screen.getByText(/days of coasting/)).toBeTruthy();
    await waitFor(() => expect(appStore.getState().missionPhase).toBe("launch"));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Leaving Earth" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(appStore.getState().screen).toBe("landing");
    expect(screen.getByTestId("landing")).toBeTruthy();
  });

  it("TR.4.c: the journey plays by itself and 'Skip ahead' jumps to lunar arrival; chapter 4: a full day, and looking around", async () => {
    render(<App />);
    act(() => appStore.getState().setScreen("educator"));
    await waitFor(() => expect(appStore.getState().selectedPlanId).not.toBeNull());
    fireEvent.click(await screen.findByRole("button", { name: "Begin the journey" }));
    const st = appStore.getState();
    const plan = st.plansById.get(st.selectedPlanId!)!;
    const tl = timelineOf(plan, await st.data.trajectory(plan.trajectory_id));
    await waitFor(() => expect(appStore.getState().missionTime!).toBeGreaterThan(tl.startMs)); // playing
    fireEvent.click(screen.getByRole("button", { name: "Skip ahead" }));
    expect(appStore.getState().missionTime).toBe(tl.lunarArrivalMs);
    expect(screen.queryByRole("button", { name: "Skip ahead" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Next chapter" })); // landing
    fireEvent.click(screen.getByRole("button", { name: "Next chapter" })); // surface
    expect(screen.getByRole("heading", { name: "On the surface" })).toBeTruthy();
    expect(appStore.getState().missionPhase).toBe("site");
    expect(screen.getByText(/gets sunlight [\d.]+% of the time/)).toBeTruthy(); // figures from the window data
    fireEvent.click(screen.getByRole("button", { name: "Watch a full day" }));
    await waitFor(() => expect(appStore.getState().missionTime!).toBeGreaterThan(tl.landingMs));
    fireEvent.click(screen.getByRole("button", { name: "Skip ahead" }));
    expect(appStore.getState().missionTime).toBe(tl.landingMs + 86_400_000);

    act(() => {
      appStore.getState().setLevelB(true); // this part is about the extra switched on
      appStore.getState().setSurfaceView(false);
    });
    fireEvent.click(screen.getByRole("button", { name: "Look around 360°" }));
    expect(appStore.getState().surfaceView).toBe(true); // Level B: stand on the site
    act(() => appStore.getState().setLevelB(false));
    fireEvent.click(screen.getByRole("button", { name: "Look around 360°" }));
    expect(await screen.findByTestId("panorama", {}, { timeout: 5000 })).toBeTruthy(); // level A instead
    act(() => appStore.getState().setLevelB(true));
  });
});
