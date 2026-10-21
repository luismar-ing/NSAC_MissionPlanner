/** T3.1.b: global state invariants (spec 8). Uses the real dataset through a file-backed fetcher. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { DataStore } from "../src/lib/data";
import { MAX_COMPARE, createAppStore } from "../src/store/appStore";

const REAL = join(__dirname, "..", "public", "data");
const fetcher = async (url: string) => {
  try {
    return new Response(readFileSync(join(REAL, url.replace(/^\/base\//, ""))), { status: 200 });
  } catch {
    return new Response("not found", { status: 404 });
  }
};

let store: ReturnType<typeof createAppStore>;
beforeEach(async () => {
  store = createAppStore(new DataStore("/base/", fetcher));
  await store.getState().loadCore();
});

describe("app store", () => {
  it("loads the core data once", async () => {
    const s = store.getState();
    expect(s.load.status).toBe("ready");
    expect(s.plans).toHaveLength(5475);
    expect(s.plansById.get("malapert_massif_20270310_7d")?.site_id).toBe("malapert_massif");
    await s.loadCore(); // second call is a no-op
    expect(store.getState().plans).toBe(s.plans);
  });

  it("selecting a plan updates site, window and mission clock", () => {
    store.getState().selectPlan("haworth_20270615_14d");
    const s = store.getState();
    expect(s.selectedPlanId).toBe("haworth_20270615_14d");
    expect(s.selectedSite).toBe("haworth");
    expect(s.selectedWindow).toBe(14);
    expect(s.missionTime).toBe(Date.parse("2027-06-15T00:00:00Z"));
    store.getState().selectPlan(null);
    expect(store.getState().selectedPlanId).toBeNull();
  });

  it("the tray holds at most 5 plans; a sixth is rejected with a notice", () => {
    const ids = store.getState().plans.slice(0, 6).map((p) => p.id);
    for (const id of ids.slice(0, MAX_COMPARE)) expect(store.getState().pinPlan(id)).toBe(true);
    expect(store.getState().pinPlan(ids[5])).toBe(false);
    expect(store.getState().comparePlans).toHaveLength(MAX_COMPARE);
    expect(store.getState().notice).toMatch(/at most 5/);
    store.getState().pinPlan(ids[0]); // pinning again is a no-op
    expect(store.getState().comparePlans).toHaveLength(MAX_COMPARE);
    store.getState().unpinPlan(ids[0]);
    expect(store.getState().pinPlan(ids[5])).toBe(true);
    expect(store.getState().comparePlans).toEqual([...ids.slice(1, 5), ids[5]]);
  });

  it("compareTime and missionTime are independent clocks", () => {
    store.getState().selectPlan("connecting_ridge_20270101_7d");
    const mission = store.getState().missionTime;
    store.getState().setCompareTime(36);
    expect(store.getState().compareTime).toBe(36);
    expect(store.getState().missionTime).toBe(mission);
    store.getState().setMissionTime(Date.parse("2027-01-02T00:00:00Z"));
    expect(store.getState().compareTime).toBe(36);
    store.getState().setCompareTime(10_000); // clamped to the longest window (14 days)
    expect(store.getState().compareTime).toBe(14 * 24);
  });

  it("constraints are optional and patchable", () => {
    expect(store.getState().constraints).toEqual({ minSunPct: null, maxDarkH: null, minEarthH: null });
    store.getState().setConstraints({ minSunPct: 80 });
    store.getState().setConstraints({ maxDarkH: 24 });
    expect(store.getState().constraints).toEqual({ minSunPct: 80, maxDarkH: 24, minEarthH: null });
  });

  it("window length must be one of the manifest values", () => {
    store.getState().setWindow(3);
    expect(store.getState().selectedWindow).toBe(3);
    store.getState().setWindow(5);
    expect(store.getState().selectedWindow).toBe(3);
    expect(store.getState().notice).toMatch(/3, 7, 14/);
  });
});
