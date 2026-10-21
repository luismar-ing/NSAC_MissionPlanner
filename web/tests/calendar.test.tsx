// @vitest-environment jsdom
/** T3.2.c: calendar interaction with Testing Library (click selects, double-click pins, 6th pin rejected, drag selects a range). */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cellRect, makeLayout } from "../src/lib/calendar";
import { appStore } from "../src/store/appStore";
import { Calendar } from "../src/views/Calendar";

const REAL = join(__dirname, "..", "public", "data");
const WIDTH = 1500;

beforeAll(async () => {
  // jsdom has no ResizeObserver, layout or canvas: give the calendar a fixed width and a file-backed fetch
  globalThis.ResizeObserver = class {
    constructor(private cb: ResizeObserverCallback) {}
    observe() {
      this.cb([{ contentRect: { width: WIDTH } } as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
    disconnect() {}
    unobserve() {}
  } as unknown as typeof ResizeObserver;
  HTMLCanvasElement.prototype.getContext = (() => null) as never;
  HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, right: WIDTH, bottom: 200, width: WIDTH, height: 200, x: 0, y: 0, toJSON() {} });
  globalThis.fetch = (async (url: string) => {
    try {
      return new Response(readFileSync(join(REAL, url.replace(/^.*\/data\//, ""))), { status: 200 });
    } catch {
      return new Response("", { status: 404 });
    }
  }) as typeof fetch;
  await appStore.getState().loadCore();
});
afterEach(cleanup);

const layout = makeLayout(WIDTH, 5, 365);
const centre = (site: number, day: number) => {
  const [x, y, w, h] = cellRect(layout, site, day);
  return { clientX: x + w / 2, clientY: y + h / 2 };
};

async function renderCalendar() {
  render(<Calendar />);
  await screen.findByTestId("calendar-canvas");
  await act(async () => {
    await appStore.getState().loadWindows(appStore.getState().selectedWindow);
  });
  await act(async () => {}); // let the index state settle
  return screen.getByTestId("calendar-canvas");
}

describe("calendar interaction (spec 8.5)", () => {
  it("click selects the plan in the global state", async () => {
    const canvas = await renderCalendar();
    const p = centre(1, 68); // Haworth, 2027-03-10
    fireEvent.mouseDown(canvas, p);
    fireEvent.mouseUp(canvas, p);
    expect(appStore.getState().selectedPlanId).toBe("haworth_20270310_7d");
    expect(appStore.getState().selectedSite).toBe("haworth");
  });

  it("double-click pins to the tray; the 6th pin is rejected", async () => {
    const canvas = await renderCalendar();
    for (let i = 0; i < 6; i++) fireEvent.doubleClick(canvas, centre(i % 5, 10 + i));
    const s = appStore.getState();
    expect(s.comparePlans).toHaveLength(5);
    expect(s.comparePlans[0]).toBe("connecting_ridge_20270111_7d");
    expect(s.notice).toMatch(/at most 5/);
    await screen.findByText(/at most 5/);
    s.comparePlans.slice().forEach((id) => s.unpinPlan(id));
  });

  it("drag selects a range and 'Pin best' pins its best cells", async () => {
    const canvas = await renderCalendar();
    fireEvent.mouseDown(canvas, centre(0, 100));
    fireEvent.mouseMove(canvas, { ...centre(4, 130), buttons: 1 });
    fireEvent.mouseUp(canvas, centre(4, 130));
    expect(appStore.getState().selectedRange).toEqual({ site0: 0, site1: 4, day0: 100, day1: 130 });
    fireEvent.click(await screen.findByRole("button", { name: /Pin best 3/ }));
    const pinned = appStore.getState().comparePlans;
    expect(pinned).toHaveLength(3);
    for (const id of pinned) {
      const day = Number(id.match(/_(\d{8})_/)![1].slice(4));
      expect(day).toBeGreaterThanOrEqual(411); // 2027-04-11 (day 100) or later
    }
  });

  it("arrow keys move the selection and Enter pins it", async () => {
    appStore.getState().comparePlans.slice().forEach((id) => appStore.getState().unpinPlan(id));
    const canvas = await renderCalendar();
    fireEvent.mouseDown(canvas, centre(2, 5));
    fireEvent.mouseUp(canvas, centre(2, 5));
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    fireEvent.keyDown(canvas, { key: "ArrowDown" });
    expect(appStore.getState().selectedPlanId).toBe("malapert_massif_20270107_7d");
    fireEvent.keyDown(canvas, { key: "Enter" });
    expect(appStore.getState().comparePlans).toContain("malapert_massif_20270107_7d");
  });
});
