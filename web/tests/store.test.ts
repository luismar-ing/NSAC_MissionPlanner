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

  it("compareTime and missionTime are linked inside the selected plan's window (spec 4.1)", () => {
    store.getState().selectPlan("connecting_ridge_20270101_7d");
    const arrival = Date.parse("2027-01-01T00:00:00Z");
    store.getState().setCompareTime(36); // tray -> mission clock
    expect(store.getState().compareTime).toBe(36);
    expect(store.getState().missionTime).toBe(arrival + 36 * 3_600_000);
    store.getState().setMissionTime(Date.parse("2027-01-02T00:00:00Z")); // mission clock -> tray
    expect(store.getState().compareTime).toBe(24);
    store.getState().setMissionTime(arrival - 40 * 3_600_000); // transit: the tray stays where it was
    expect(store.getState().compareTime).toBe(24);
    store.getState().setCompareTime(10_000); // clamped to the longest window (14 days), past this 7-day plan
    expect(store.getState().compareTime).toBe(14 * 24);
    expect(store.getState().missionTime).toBe(arrival - 40 * 3_600_000); // outside its window: not moved
    store.getState().setCompareTime(12);
    store.getState().selectPlan("malapert_massif_20270101_7d"); // a newly selected plan opens at the tray's moment
    expect(store.getState().missionTime).toBe(arrival + 12 * 3_600_000);
    store.getState().setCompareTime(0);
  });

  it("choosing a site keeps the arrival date and window of the selected plan", () => {
    store.getState().selectPlan("haworth_20270615_14d");
    store.getState().selectSite("malapert_massif");
    expect(store.getState().selectedPlanId).toBe("malapert_massif_20270615_14d");
    expect(store.getState().selectedSite).toBe("malapert_massif");
    store.getState().selectPlan(null);
    store.getState().selectSite("haworth"); // no plan: only the site
    expect(store.getState().selectedSite).toBe("haworth");
    expect(store.getState().selectedPlanId).toBeNull();
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
