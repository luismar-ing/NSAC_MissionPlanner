// @vitest-environment jsdom
/** T3.4.c: site features panel (spec 8.6, 5.10). */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Daily, SiteFeatures } from "../src/lib/contract";
import { DataStore } from "../src/lib/data";
import { loadPlanData, type PlanData } from "../src/lib/planData";
import { appStore } from "../src/store/appStore";
import { attributeText, SitePanel } from "../src/views/SitePanel";

const REAL = join(__dirname, "..", "public", "data");
const fileFetch = (async (url: string) => {
  try {
    return new Response(readFileSync(join(REAL, url.replace(/^.*\/data\//, "").replace(/^\/base\//, ""))), { status: 200 });
  } catch {
    return new Response("", { status: 404 });
  }
}) as typeof fetch;

let haworth: PlanData;
let malapert: PlanData;
let features: SiteFeatures;
let daily: Daily;

beforeAll(async () => {
  globalThis.fetch = fileFetch;
  await appStore.getState().loadCore();
  const st = appStore.getState();
  const store = new DataStore("/base/", fileFetch as never);
  haworth = await loadPlanData(store, st.plansById.get("haworth_20270309_7d")!, st.sites);
  malapert = await loadPlanData(store, st.plansById.get("malapert_massif_20271015_7d")!, st.sites);
  features = await store.siteFeatures("haworth");
  daily = await store.daily("haworth");
});
afterEach(cleanup);

describe("site panel (spec 8.6)", () => {
  it("every shown value has a tooltip with its source or method", () => {
    render(<SitePanel plan={haworth} features={features} daily={daily} pinned={[haworth, malapert]} />);
    const values = screen.getByTestId("site-panel").querySelectorAll(".sourced");
    // 7 attributes + 6 metrics + 7 days × 2 + 3 nearby features
    expect(values.length).toBe(features.attributes.length + 6 + 7 * 2 + features.nearby_features.length);
    for (const v of values) {
      expect(v.getAttribute("title")!.length, v.textContent!).toBeGreaterThan(20);
      expect(v.getAttribute("aria-description")).toBe(v.getAttribute("title"));
      expect(v.getAttribute("tabindex")).toBe("0"); // reachable by keyboard
    }
    // the elevation cites LOLA and its value comes from the data file
    const elev = screen.getByTestId("site-panel").querySelector('[data-key="elevation_m"] .sourced')!;
    expect(elev.textContent).toBe("2841.8 m");
    expect(elev.getAttribute("title")).toContain("LOLA");
    // nearby features cite the IAU gazetteer
    expect(screen.getByText(/Mons Malapert \(massif\) · 44\.8 km/).getAttribute("title")).toContain("Gazetteer of Planetary Nomenclature");
  });

  it("an attribute without a source shows 'Not available', never a value", () => {
    const fake: SiteFeatures = {
      ...features,
      attributes: [
        ...features.attributes,
        { key: "regolith", label: "Regolith depth", value: null, unit: "m", status: "not available", source: null, method: null },
        // defensive: an 'available' value with an empty source must not be shown either
        { key: "unsourced", label: "Unsourced value", value: 42, unit: "m", status: "available", source: " ", method: null },
      ],
    };
    expect(attributeText(fake.attributes.at(-1)!)).toBeNull();
    render(<SitePanel plan={haworth} features={fake} daily={daily} pinned={[]} />);
    for (const key of ["regolith", "unsourced"]) {
      const row = screen.getByTestId("site-panel").querySelector(`[data-key="${key}"]`) as HTMLElement;
      expect(within(row).getByText("Not available")).toBeTruthy();
      expect(row.textContent).not.toContain("42");
    }
  });

  it("daily Sun and Earth hours are the window's days from daily/{site}.json", () => {
    render(<SitePanel plan={haworth} features={features} daily={daily} pinned={[]} />);
    const rows = screen.getByTestId("site-panel").querySelectorAll(".daily-table tbody tr");
    expect(rows).toHaveLength(7);
    expect((rows[0] as HTMLElement).dataset.date).toBe("2027-03-09");
    const d0 = daily.days.find((d) => d.date === "2027-03-09")!;
    const cells = rows[0].querySelectorAll(".sourced");
    expect(cells[0].textContent).toBe(String(Math.round(((d0.sun_pct * 24) / 100) * 10) / 10));
    expect(cells[1].textContent).toBe(String(Math.round(d0.earth_h * 10) / 10));
  });

  it("compact comparison with the other pinned plans and a why text with the plan's figures", () => {
    render(<SitePanel plan={haworth} features={features} daily={daily} pinned={[haworth, malapert]} />);
    const table = screen.getByTestId("site-compare");
    expect(table.querySelectorAll("tbody tr")).toHaveLength(2); // this plan + Malapert, no duplicate
    expect(table.querySelector("tr.this-plan")!.textContent).toContain("Haworth");
    expect(screen.getByTestId("site-why").textContent).toContain("89.5");
  });

  it("no comparison block when nothing else is pinned", () => {
    render(<SitePanel plan={haworth} features={features} daily={daily} pinned={[]} />);
    expect(screen.queryByTestId("site-compare")).toBeNull();
  });
});
