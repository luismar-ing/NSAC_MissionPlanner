// @vitest-environment jsdom
/**
 * T5.3.b: every source recorded in data/README.md appears on the "About & credits" screen and in the README
 * (rule 12), and the software versions shown are the installed ones.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { App } from "../src/App";
import { DATA_CREDITS, SOFTWARE_CREDITS } from "../src/lib/credits";
import { appStore } from "../src/store/appStore";

const ROOT = join(__dirname, "..", "..");
const DATA = join(__dirname, "..", "public", "data");
const dataReadme = readFileSync(join(ROOT, "data", "README.md"), "utf-8");
const readme = readFileSync(join(ROOT, "README.md"), "utf-8");
/** URLs of the sources: the links in the rows of data/README.md's tables (files actually used). */
const sourceUrls = [
  ...new Set(
    dataReadme
      .split("\n")
      .filter((l) => l.startsWith("|") && !/^\|\s*-/.test(l))
      .flatMap((l) => [...l.matchAll(/https?:\/\/[^\s|)»`]+/g)].map((m) => m[0])),
  ),
];

beforeAll(async () => {
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  globalThis.fetch = (async (url: string) => {
    try {
      return new Response(readFileSync(join(DATA, url.replace(/^.*\/data\//, ""))), { status: 200 });
    } catch {
      return new Response("", { status: 404 });
    }
  }) as typeof fetch;
  await appStore.getState().loadCore();
});
afterEach(cleanup);

describe("credits (rule 12)", () => {
  it("data/README.md lists the expected sources", () => {
    console.log(`data/README.md: ${sourceUrls.length} source URLs`);
    expect(sourceUrls.length).toBeGreaterThanOrEqual(10); // 5 kernels, DEM, 2 textures, 2 USGS DOIs, gazetteer
  });

  it("every source URL of data/README.md is on the credits screen, as a link", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "About & credits" }));
    const dialog = screen.getByRole("dialog", { name: "About & credits" });
    const links = within(dialog).getAllByRole("link").map((a) => a.getAttribute("href"));
    for (const u of sourceUrls) expect(links, u).toContain(u);
    // NASA/LOLA, NAIF/SPICE and JPL Horizons named in the interface (rule 12)
    for (const name of ["LOLA", "NAIF / SPICE", "JPL Horizons", "Barker", "Scientific Visualization Studio", "USGS"]) expect(dialog.textContent).toContain(name);
  });

  it("every source URL of data/README.md is in the README", () => {
    for (const u of sourceUrls) expect(readme, u).toContain(u);
    for (const c of DATA_CREDITS) for (const u of c.urls) expect(readme, u).toContain(u);
  });

  it("Esc and the button close the dialog; Esc does not also leave the live view", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "About & credits" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "About & credits" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    // in live mode, Esc closes the dialog only (the live view stays)
    appStore.getState().selectPlan("haworth_20270309_7d");
    appStore.getState().setViewMode("live");
    fireEvent.click(screen.getByRole("button", { name: "About & credits" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(appStore.getState().viewMode).toBe("live");
    appStore.getState().setViewMode("compare");
  });

  it("the software versions shown are the installed ones", () => {
    const pkg = (name: string) => JSON.parse(readFileSync(join(__dirname, "..", "node_modules", name, "package.json"), "utf-8")) as { version: string; license: string };
    const shown = Object.fromEntries(SOFTWARE_CREDITS.app.map((s) => [s.name, s]));
    expect(shown["React / React DOM"].version).toBe(pkg("react").version);
    expect(shown["three.js"].version).toBe(pkg("three").version);
    expect(shown["Zustand"].version).toBe(pkg("zustand").version);
    expect(shown["Zod"].version).toBe(pkg("zod").version);
    expect(shown["Geist and Geist Mono fonts (Fontsource)"].version).toBe(pkg("@fontsource-variable/geist").version);
    const req = readFileSync(join(ROOT, "pipeline", "requirements.txt"), "utf-8");
    const pinned = (n: string) => new RegExp(`^${n}==(.+)$`, "mi").exec(req)?.[1].trim();
    const py = Object.fromEntries(SOFTWARE_CREDITS.pipeline.map((s) => [s.name.split(" ")[0].toLowerCase(), s.version]));
    for (const n of ["spiceypy", "numpy", "rasterio", "pyproj", "pandas", "pydantic", "matplotlib", "pillow"]) expect(py[n], n).toBe(pinned(n));
  });
});
