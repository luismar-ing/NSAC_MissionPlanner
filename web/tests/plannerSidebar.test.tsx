// @vitest-environment jsdom
/** TR.2.b: the Mission Planner sidebar (A2) picks the plan; "Launch" starts the mission from the countdown. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
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
  window.scrollTo = () => {};
  await appStore.getState().loadCore();
});
beforeEach(() => {
  const st = appStore.getState();
  st.setScreen("landing");
  st.selectPlan(null);
});
afterEach(cleanup);

const sidebar = () => within(screen.getByTestId("mission-sidebar"));

describe("Mission Planner sidebar (A2)", () => {
  it("opens on the default plan; day, stay and site each select the matching plan", async () => {
    render(<App />);
    act(() => appStore.getState().setScreen("planner"));
    expect(appStore.getState().selectedPlanId).toBe("connecting_ridge_20270101_7d");
    expect(screen.getByTestId("scene-host")).toBeTruthy();

    fireEvent.click(sidebar().getByRole("button", { name: "Next day" }));
    expect(appStore.getState().selectedPlanId).toBe("connecting_ridge_20270102_7d");

    fireEvent.change(sidebar().getByLabelText("Arrival date (UTC)"), { target: { value: "2027-03-09" } });
    expect(appStore.getState().selectedPlanId).toBe("connecting_ridge_20270309_7d");

    // (the < 100 ms update budget is measured in the browser, not under jsdom: see PROGRESS, TR.2.b)
    fireEvent.click(sidebar().getByRole("button", { name: "14 days" }));
    fireEvent.click(sidebar().getByRole("button", { name: /^Haworth/ }));
    expect(appStore.getState().selectedPlanId).toBe("haworth_20270309_14d");
    expect(sidebar().getByRole("button", { name: /^Haworth/ }).getAttribute("aria-pressed")).toBe("true");

    // the strip colours its days from the score index once it is loaded; clicking a day selects it
    await waitFor(() => expect(sidebar().getAllByRole("button", { name: /score/ }).length).toBeGreaterThan(10));
    fireEvent.click(sidebar().getByRole("button", { name: /^Mar 11, 2027, score/ }));
    expect(appStore.getState().selectedPlanId).toBe("haworth_20270311_14d");
  });

  it("'Launch' leaves the globe for the mission, at the countdown and playing; 'Search and compare' opens the panel", async () => {
    render(<App />);
    act(() => appStore.getState().setScreen("planner"));
    fireEvent.click(sidebar().getByRole("button", { name: "Search and compare" }));
    expect(screen.getByTestId("search-drawer")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByTestId("search-drawer")).toBeNull();

    fireEvent.click(sidebar().getByRole("button", { name: /^Launch · Dec 29, 2026/ }));
    expect(appStore.getState().viewMode).toBe("live");
    expect(screen.queryByTestId("mission-sidebar")).toBeNull();
    await screen.findByTestId("mission-controls", {}, { timeout: 5000 });
    await waitFor(() => expect(appStore.getState().missionPhase).toBe("launch"));
    expect(screen.getByRole("button", { name: /Pause the mission/ })).toBeTruthy(); // playing
    expect(screen.getByRole("list", { name: "Mission phases" }).querySelector('[aria-current="step"]')?.textContent).toBe("Launch");
  });

  it("search panel (TR.2.c): focus goes in and stays in, Esc closes it and returns focus; during the journey Esc closes only the panel", async () => {
    render(<App />);
    act(() => appStore.getState().setScreen("planner"));
    const opener = sidebar().getByRole("button", { name: "Search and compare" });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Search and compare plans" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const close = within(dialog).getByRole("button", { name: "Close" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true }); // first element: Shift+Tab wraps to the last
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(close);
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Search and compare plans" })).toBeNull();
    expect(document.activeElement).toBe(opener);

    fireEvent.click(sidebar().getByRole("button", { name: /^Launch/ }));
    await screen.findByTestId("mission-controls", {}, { timeout: 5000 });
    fireEvent.click(screen.getByRole("button", { name: "Search and compare" })); // from the journey too
    const d2 = screen.getByRole("dialog", { name: "Search and compare plans" });
    fireEvent.keyDown(within(d2).getByRole("button", { name: "Close" }), { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Search and compare plans" })).toBeNull();
    expect(appStore.getState().viewMode).toBe("live"); // the journey's own Esc did not fire
  });

  it("arrival (TR.2.e): ILLUSTRATIVE before landing only; metrics card, panorama on the mission clock, ★ against pinned plans", async () => {
    const st = appStore.getState();
    st.setScreen("planner");
    st.selectPlan("haworth_20270309_7d");
    st.pinPlan("haworth_20270309_7d");
    st.pinPlan("malapert_massif_20270309_7d");
    render(<App />);
    fireEvent.click(sidebar().getByRole("button", { name: /^Launch/ }));
    await screen.findByTestId("mission-controls", {}, { timeout: 5000 });
    expect(screen.getByTestId("illustrative-label")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Pause the mission" }));
    fireEvent.click(screen.getByRole("button", { name: "At the site" }));
    const site = await screen.findByTestId("live-site");
    expect(screen.queryByTestId("illustrative-label")).toBeNull(); // the site itself is real data
    const card = await within(site).findByRole("complementary", { name: "Window metrics" }, { timeout: 5000 });
    expect(within(card).getByTestId("metrics-box")).toBeTruthy();
    // the panorama follows the mission clock: arrival = sample 0
    await waitFor(() => expect(within(site).getByTestId("panorama").dataset.sample).toBe("0"));
    const table = await within(site).findByTestId("site-compare-mini");
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Metric", "This plan", "Malapert Massif"]);
    expect(within(table).getAllByText("★").length + table.querySelectorAll('[data-best="true"]').length).toBeGreaterThan(0);
    fireEvent.click(within(card).getByRole("button", { name: "Site details and sources" }));
    expect(screen.getByRole("dialog", { name: "Haworth: details and sources" })).toBeTruthy();
    for (const id of ["haworth_20270309_7d", "malapert_massif_20270309_7d"]) appStore.getState().unpinPlan(id);
  });

  it("Level B switch (T6.1.c): off keeps the arrival working (panorama, metrics) and the choice in the store", async () => {
    const st = appStore.getState();
    st.setScreen("planner");
    st.selectPlan("haworth_20270309_7d");
    render(<App />);
    fireEvent.click(sidebar().getByRole("button", { name: /^Launch/ }));
    await screen.findByTestId("mission-controls", {}, { timeout: 5000 });
    fireEvent.click(screen.getByRole("button", { name: "Pause the mission" }));
    fireEvent.click(screen.getByRole("button", { name: "At the site" }));
    const site = await screen.findByTestId("live-site");
    const toggle = await within(site).findByRole("button", { name: /3D terrain shadows/ }, { timeout: 5000 });
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(toggle);
    expect(appStore.getState().levelB).toBe(false);
    expect(within(site).getByTestId("panorama")).toBeTruthy();
    expect(within(site).getByTestId("metrics-box")).toBeTruthy();
    fireEvent.click(toggle);
    expect(appStore.getState().levelB).toBe(true);
  });
});
