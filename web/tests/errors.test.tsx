// @vitest-environment jsdom
/**
 * T5.2.b: loading and error states, reduced motion. Network failures are simulated by a fetch that rejects
 * (as the browser does when offline) or answers 500 for chosen files; each view must say what failed and
 * offer a retry that works once the network is back.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { App } from "../src/App";
import { DataError } from "../src/lib/data";
import { describeError } from "../src/lib/errors";
import { playFrom } from "../src/lib/modeTransition";
import { appStore, createAppStore } from "../src/store/appStore";

const DATA = join(__dirname, "..", "public", "data");
const read = (url: string) => readFileSync(join(DATA, url.replace(/^.*\/data\//, "").replace(/^\/base\//, "")));
/** Files whose requests fail: "offline" rejects like a dropped connection, "500" answers a server error. */
const failing = new Map<RegExp, "offline" | "500">();
const fetchWithFailures = (async (url: string) => {
  for (const [re, how] of failing) {
    if (!re.test(url)) continue;
    if (how === "offline") throw new TypeError("Failed to fetch");
    return new Response("", { status: 500 });
  }
  try {
    return new Response(read(url), { status: 200 });
  } catch {
    return new Response("", { status: 404 });
  }
}) as typeof fetch;

beforeAll(async () => {
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1200 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 200 });
  HTMLElement.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, right: 1200, bottom: 200, width: 1200, height: 200, toJSON() {} }) as DOMRect;
  window.scrollTo = () => {};
  globalThis.fetch = fetchWithFailures;
  await appStore.getState().loadCore();
});
beforeEach(() => {
  failing.clear();
  const st = appStore.getState();
  st.setViewMode("compare");
  for (const id of [...st.comparePlans]) st.unpinPlan(id);
  st.selectPlan(null);
  st.setWindow(7);
});
afterEach(cleanup);

describe("a simulated network error shows a message, and retry recovers", () => {
  it("app start-up (core files) offline → message and 'Try again'", async () => {
    const store = createAppStore(); // a fresh store, as on a first visit
    failing.set(/manifest\.json$/, "offline");
    await store.getState().loadCore();
    const st = store.getState();
    expect(st.load.status).toBe("error");
    const info = describeError((st.load as { error: unknown }).error);
    expect(info.retryable).toBe(true);
    expect(info.message).toMatch(/could not be downloaded: check the connection/);
    expect(info.detail).toMatch(/network error in manifest\.json: Failed to fetch/);
    failing.clear();
    await store.getState().loadCore(); // retry
    expect(store.getState().load.status).toBe("ready");
  });

  it("the start-up error is rendered with a retry button", async () => {
    // the shared store is ready: render the error branch through a store in error state
    const prev = appStore.getState().load;
    render(<App />); // App starts loadCore on mount (a no-op: the store is ready); the error comes after
    act(() => appStore.setState({ load: { status: "error", message: "x", error: new DataError("network", "manifest.json", "Failed to fetch") } }));
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/Could not load the mission data\. The data could not be downloaded/);
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeTruthy();
    act(() => appStore.setState({ load: prev }));
  });

  it("calendar: windows file offline → error with retry instead of an endless 'Loading…'", async () => {
    failing.set(/windows\/.*_3d\.json$/, "offline");
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("calendar-canvas")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "3 days" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/Could not load the calendar\./);
    expect(alert.textContent).toMatch(/_3d\.json/);
    // the 7-day cells and count are not left on screen under the "3 days" label
    expect(appStore.getState().validCount).toBeNull();
    expect(screen.queryByText(/plans meet the constraints/)).toBeNull();
    failing.clear();
    fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.queryByText(/Could not load the calendar/)).toBeNull());
    expect(screen.queryByText("Loading mission data…")).toBeNull();
  });

  it("tray: a plan's series answers 500 → error with retry; the panel appears after the retry", async () => {
    failing.set(/timeseries\/haworth\.json$/, "500");
    appStore.getState().pinPlan("haworth_20270309_7d");
    appStore.getState().pinPlan("malapert_massif_20271015_7d");
    render(<App />);
    const alert = await screen.findByText(/Could not load the pinned plans\./);
    expect(alert.closest('[role="alert"]')!.textContent).toMatch(/HTTP 500/);
    failing.clear();
    fireEvent.click(within(alert.closest('[role="alert"]') as HTMLElement).getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getAllByTestId("plan-panel")).toHaveLength(2));
  });

  it("3D view: scene data offline → 'Could not load the 3D scene data' (not a WebGL message), retry offered", async () => {
    failing.set(/scene\/ephemeris\.json$/, "offline");
    appStore.getState().pinPlan("haworth_20270309_7d");
    appStore.getState().selectPlan("haworth_20270309_7d");
    appStore.getState().setViewMode("live");
    render(<App />);
    const host = await screen.findByTestId("scene-host");
    await waitFor(() => expect(host.dataset.status).toBe("error"));
    expect(host.textContent).toMatch(/Could not load the 3D scene data\. The data could not be downloaded/);
    expect(host.textContent).not.toMatch(/WebGL/);
    expect(within(host).getByRole("button", { name: "Try again" })).toBeTruthy();
    act(() => appStore.getState().setViewMode("compare"));
  });

  it("a damaged file is reported without a retry (it would fail the same way) and nothing is invented", () => {
    const info = describeError(new DataError("validation", "windows/haworth_7d.json", "rows.0.sun_pct: expected number"));
    expect(info.retryable).toBe(false);
    expect(info.message).toMatch(/damaged.*nothing is made up/);
  });
});

describe("reduced motion (spec 9)", () => {
  it("a header switch turns it on and off; the page carries the flag the CSS reads", async () => {
    appStore.getState().setReducedMotion(false);
    render(<App />);
    const toggle = screen.getByRole("button", { name: /Reduce motion/ });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(toggle);
    expect(appStore.getState().reducedMotion).toBe(true);
    expect(document.documentElement.dataset.reducedMotion).toBe("true");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(toggle);
    expect(document.documentElement.dataset.reducedMotion).toBe("false");
  });

  it("with reduced motion the compare ↔ live expansion does not animate", () => {
    const el = document.createElement("div");
    let animated = 0;
    el.animate = (() => {
      animated++;
      return {} as Animation;
    }) as typeof el.animate;
    const from = { left: 0, top: 0, width: 100, height: 100 } as DOMRect;
    appStore.getState().setReducedMotion(false);
    playFrom(el, from);
    expect(animated).toBe(1);
    appStore.getState().setReducedMotion(true);
    expect(playFrom(el, from)).toBeNull();
    expect(animated).toBe(1);
    appStore.getState().setReducedMotion(false);
  });
});
