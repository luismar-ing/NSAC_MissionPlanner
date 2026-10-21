/**
 * T3.1.a: data loader with simulated fetch over the real dataset (web/public/data)
 * and the SYNTHETIC contract fixtures (pipeline/tests/fixtures/contract/valid).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SyntheticBanner } from "../src/components/SyntheticBanner";
import { DataError, DataStore, dataDirFromLocation, isSynthetic } from "../src/lib/data";

const REAL = join(__dirname, "..", "public", "data");
const FIXTURES = join(__dirname, "..", "..", "pipeline", "tests", "fixtures", "contract", "valid");

/** fetch replacement that serves files from a folder, with optional per-path overrides. */
function folderFetcher(root: string, overrides: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const fetcher = vi.fn(async (url: string) => {
    const path = url.replace(/^\/base\//, "");
    calls.push(path);
    if (path in overrides) return new Response(JSON.stringify(overrides[path]), { status: 200 });
    try {
      const bytes = readFileSync(join(root, path));
      return new Response(bytes, { status: 200 });
    } catch {
      return new Response("not found", { status: 404 });
    }
  });
  return { fetcher, calls };
}

const store = (root: string, overrides: Record<string, unknown> = {}) => {
  const f = folderFetcher(root, overrides);
  return { s: new DataStore("/base/", f.fetcher), ...f };
};

describe("DataStore over the real dataset", () => {
  it("loads the core shell and it is REAL (no SYNTHETIC banner)", async () => {
    const { s } = store(REAL);
    const core = await s.loadCore();
    expect(core.sites).toHaveLength(5);
    expect(core.plans).toHaveLength(5 * 365 * 3);
    expect(isSynthetic(core.manifest)).toBe(false);
    expect(renderToStaticMarkup(createElement(SyntheticBanner, { manifest: core.manifest }))).toBe("");
  });

  it("loads per-site files on demand and validates them", async () => {
    const { s } = store(REAL);
    const ts = await s.timeseries("malapert_massif");
    expect(ts.n).toBe(18192);
    expect((await s.windows("malapert_massif", 7)).rows).toHaveLength(365);
    expect((await s.horizon("haworth")).elev_deg).toHaveLength(360);
    expect((await s.trajectory("haworth_20270310")).mode).toBe("ILLUSTRATIVE");
    const t = await s.terrain("nobile_rim_1", 2);
    expect(t.heights).toHaveLength(t.header.grid.nx * t.header.grid.ny);
    const c = (t.header.grid.ny - 1) / 2;
    expect(Math.abs(t.heights[c * t.header.grid.nx + c])).toBeLessThan(0.2); // the site node is at relative height 0
  });

  it("caches: a second request does not refetch", async () => {
    const { s, calls } = store(REAL);
    await s.daily("haworth");
    await s.daily("haworth");
    expect(calls.filter((c) => c === "daily/haworth.json")).toHaveLength(1);
  });
});

describe("typed errors", () => {
  it("rejects an invalid file with a validation error", async () => {
    const manifest = JSON.parse(readFileSync(join(REAL, "manifest.json"), "utf-8"));
    const badHorizon = { ...JSON.parse(readFileSync(join(REAL, "horizon", "haworth.json"), "utf-8")), elev_deg: [1, 2, 3] };
    const { s } = store(REAL, { "manifest.json": manifest, "horizon/haworth.json": badHorizon });
    const err = await s.horizon("haworth").catch((e) => e);
    expect(err).toBeInstanceOf(DataError);
    expect(err.kind).toBe("validation");
    expect(err.issues.join()).toContain("elev_deg has 3 values");
  });

  it("reports a missing file as a network error", async () => {
    const { s } = store(REAL);
    const err = await s.daily("nowhere").catch((e) => e);
    expect(err).toBeInstanceOf(DataError);
    expect(err.kind).toBe("network");
  });

  it("applies the cross-file checks of contract §14", async () => {
    const wrongSite = { ...JSON.parse(readFileSync(join(REAL, "daily", "haworth.json"), "utf-8")), site_id: "malapert_massif" };
    const { s } = store(REAL, { "daily/haworth.json": wrongSite });
    const err = await s.daily("haworth").catch((e) => e);
    expect(err.kind).toBe("consistency");
  });
});

describe("SYNTHETIC data (contract fixtures)", () => {
  it("raises the permanent SYNTHETIC banner", async () => {
    const { s } = store(FIXTURES);
    const core = await s.loadCore();
    expect(isSynthetic(core.manifest)).toBe(true);
    const html = renderToStaticMarkup(createElement(SyntheticBanner, { manifest: core.manifest }));
    expect(html).toContain("SYNTHETIC DATA");
    expect(html).toContain('role="alert"');
  });
});

describe("data folder selection", () => {
  it("defaults to data and accepts a safe override", () => {
    expect(dataDirFromLocation("")).toBe("data");
    expect(dataDirFromLocation("?data=fixtures/valid")).toBe("fixtures/valid");
    expect(dataDirFromLocation("?data=../secret")).toBe("data");
  });
});
