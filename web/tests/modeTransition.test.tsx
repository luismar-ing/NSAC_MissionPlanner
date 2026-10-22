// @vitest-environment jsdom
/** T4.4.a: compare ↔ live transition (spec 8.0): expand from a panel, strip of live thumbnails, Esc back. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { liveRelativeHours } from "../src/panels2d/ThumbnailStrip";
import { appStore } from "../src/store/appStore";

// the WebGL scene has its own tests (webgl.test.ts and the browser check); here only the 2D state matters
vi.mock("../src/scene3d/SceneHost", () => ({ SceneHost: () => <div data-testid="scene-host" /> }));

const REAL = join(__dirname, "..", "public", "data");
const fileFetch = (async (url: string) => {
  try {
    return new Response(readFileSync(join(REAL, url.replace(/^.*\/data\//, "").replace(/^\/base\//, ""))), { status: 200 });
  } catch {
    return new Response("", { status: 404 });
  }
}) as typeof fetch;

const A = "haworth_20270309_7d";
const B = "malapert_massif_20271015_7d";
const C = "connecting_ridge_20270102_7d";

beforeAll(async () => {
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 600 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 200 });
  globalThis.fetch = fileFetch;
  window.scrollTo = () => {};
  await appStore.getState().loadCore();
});
afterEach(cleanup);

/** The state a round trip must not change (spec 8: every view reads and writes the same global state). */
const snapshot = () => {
  const s = appStore.getState();
  return {
    comparePlans: [...s.comparePlans],
    selectedPlanId: s.selectedPlanId,
    selectedSite: s.selectedSite,
    selectedWindow: s.selectedWindow,
    constraints: { ...s.constraints },
    compareTime: s.compareTime,
    exaggeration: s.exaggeration,
    missionTime: s.missionTime,
    missionPhase: s.missionPhase,
  };
};

describe("compare ↔ live (spec 8.0)", () => {
  it("a panel's 3D button opens live mode on that plan; the others become thumbnails; Esc and the button go back with the state kept", async () => {
    const st = appStore.getState();
    for (const id of [A, B, C]) st.pinPlan(id);
    st.setConstraints({ minSunPct: 40 });
    st.setCompareTime(30);
    st.setExaggeration(10);
    render(<App />);
    await waitFor(() => expect(screen.getAllByTestId("plan-panel")).toHaveLength(3));

    fireEvent.click(screen.getByRole("button", { name: "Open Haworth in the 3D live view" }));
    expect(appStore.getState().viewMode).toBe("live");
    expect(appStore.getState().selectedPlanId).toBe(A);
    await screen.findByTestId("live-view");
    expect(screen.queryByTestId("tray-grid")).toBeNull();
    const strip = screen.getByTestId("thumb-strip");
    await waitFor(() => expect(within(strip).getAllByTestId("thumb")).toHaveLength(2));
    expect(within(strip).getAllByTestId("thumb").map((t) => t.getAttribute("data-plan-id"))).toEqual([B, C]); // the others, in tray order
    expect(within(strip).getAllByTestId("silhouette")).toHaveLength(2); // 2D thumbnails (SVG), no canvas
    expect(strip.querySelector("canvas")).toBeNull();
    await screen.findByTestId("mission-controls");

    // move the live clock, then go back with Esc
    fireEvent.click(screen.getByRole("button", { name: "Transit" }));
    const before = snapshot();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(appStore.getState().viewMode).toBe("compare");
    await waitFor(() => expect(screen.getAllByTestId("plan-panel")).toHaveLength(3));
    expect(snapshot()).toEqual(before);
    expect(screen.getAllByTestId("plan-panel").find((p) => p.getAttribute("data-plan-id") === A)!.className).toContain("selected");

    // same plan again: live resumes on the same mission clock; the back button also returns
    fireEvent.click(screen.getByRole("button", { name: "Open Haworth in the 3D live view" }));
    await screen.findByTestId("mission-controls");
    expect(appStore.getState().missionTime).toBe(before.missionTime);
    expect(appStore.getState().missionPhase).toBe("transit");
    fireEvent.click(screen.getByRole("button", { name: /Back to compare/ }));
    expect(appStore.getState().viewMode).toBe("compare");
    expect(snapshot()).toEqual(before);
  });

  it("10 round trips leave the state as it was", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getAllByTestId("plan-panel").length).toBeGreaterThan(1));
    const before = snapshot();
    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByRole("button", { name: "Open Haworth in the 3D live view" }));
      await screen.findByTestId("live-view");
      fireEvent.keyDown(window, { key: "Escape" });
      await waitFor(() => expect(screen.getAllByTestId("plan-panel").length).toBe(before.comparePlans.length));
    }
    expect(snapshot()).toEqual(before);
  });

  it("the thumbnails are linked: they follow the live plan's clock as hours since arrival", async () => {
    const st = appStore.getState();
    st.selectPlan(A);
    st.setViewMode("live");
    render(<App />);
    const strip = await screen.findByTestId("thumb-strip");
    await waitFor(() => expect(within(strip).getAllByTestId("thumb")).toHaveLength(2));
    const arrival = Date.parse(st.plansById.get(A)!.arrival_utc);
    act(() => appStore.getState().setMissionTime(arrival + 30 * 3_600_000));
    expect(within(strip).getByTestId("thumb-clock").textContent).toBe("Day 2, 06:00");
    for (const thumb of within(strip).getAllByTestId("thumb")) {
      const sil = within(thumb).getByTestId("silhouette");
      expect(Number(sil.getAttribute("data-sample"))).toBe(60); // 30 h at 30-min samples
    }
    // before landing the thumbnails wait at arrival
    expect(liveRelativeHours(arrival - 5 * 3_600_000, arrival)).toBe(0);
    act(() => appStore.getState().setViewMode("compare"));
  });
});
