// @vitest-environment jsdom
/** T6.4.b: the battery lane under the time ribbon (ASSUMED parameters), and the MVP ribbon when switched off. */
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { PlanWindowSeries } from "../src/lib/planData";
import { TimeRibbon } from "../src/panels2d/TimeRibbon";
import { appStore } from "../src/store/appStore";

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 600 });
});
afterEach(cleanup);

// one day at 30 min: 9 h of Sun, then 15 h of darkness
const n = 48;
const sunVis = new Uint8Array(n).fill(1, 0, 18);
const series: PlanWindowSeries = {
  startMs: 0,
  stepMin: 30,
  n,
  sunAz: new Float32Array(n),
  sunEl: new Float32Array(n),
  earthAz: new Float32Array(n),
  earthEl: new Float32Array(n),
  sunVis,
  earthVis: new Uint8Array(n).fill(1),
};

describe("battery lane (T6.4.b)", () => {
  it("on: a curve labelled as assumed, its minimum from the model; off: exactly the MVP ribbon", () => {
    act(() => appStore.getState().setEnergyModel(false));
    const off = render(<TimeRibbon series={series} compareTime={0} />);
    const mvp = off.container.innerHTML;
    expect(screen.queryByTestId("battery")).toBeNull();
    off.unmount();

    act(() => appStore.getState().setEnergyModel(true));
    render(<TimeRibbon series={series} compareTime={0} />);
    const lane = screen.getByTestId("battery");
    // 15 h dark at 250 W from a full 5000 Wh battery: 5000 − 3750 = 1250 Wh -> 25 %
    expect(Number(lane.dataset.minSoc)).toBeCloseTo(0.25, 3);
    expect(lane.querySelector("title")?.textContent).toMatch(/ASSUMED/);
    expect(screen.getByText("Battery (assumed): never below 25%")).toBeTruthy();

    act(() => appStore.getState().setEnergyModel(false));
    expect(screen.queryByTestId("battery")).toBeNull();
    expect(document.body.querySelector(".ribbon")!.outerHTML).toBe(mvp.match(/<div class="ribbon"[\s\S]*<\/div>/)![0]);
    act(() => appStore.getState().setEnergyModel(true));
  });
});
