// @vitest-environment jsdom
/** T4.1.a: one WebGL context for the whole app, and three.js only loaded by the live view. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createRendererManager, type RendererLike } from "../src/scene3d/renderer";
import { createAppStore } from "../src/store/appStore";

function fakeRenderer(): RendererLike & { loop: unknown } {
  const r = {
    domElement: document.createElement("canvas"),
    loop: null as unknown,
    setSize() {},
    setPixelRatio() {},
    render() {},
    setAnimationLoop(cb: unknown) {
      r.loop = cb;
    },
  };
  return r;
}

describe("renderer manager", () => {
  it("creates one renderer and reuses it across 10 mode toggles", () => {
    let factoryCalls = 0;
    const m = createRendererManager(() => {
      factoryCalls++;
      return fakeRenderer();
    });
    const canvases = new Set<HTMLCanvasElement>();
    for (let i = 0; i < 10; i++) {
      const host = document.createElement("div"); // a fresh container each time, as a remounted view would give
      document.body.appendChild(host);
      const r = m.acquire(host);
      canvases.add(r.domElement);
      expect(r.domElement.parentElement).toBe(host);
      r.setAnimationLoop(() => {});
      m.release();
      expect(r.domElement.isConnected).toBe(false); // detached, not disposed
      expect((r as ReturnType<typeof fakeRenderer>).loop).toBeNull(); // loop stopped while hidden
      host.remove();
    }
    expect(factoryCalls).toBe(1);
    expect(m.created).toBe(1);
    expect(canvases.size).toBe(1);
  });

  it("release before any acquire is harmless", () => {
    const m = createRendererManager(fakeRenderer);
    expect(() => m.release()).not.toThrow();
    expect(m.created).toBe(0);
  });
});

describe("view mode (spec 8.0)", () => {
  it("live mode needs a selected plan", () => {
    const st = createAppStore();
    st.getState().setViewMode("live");
    expect(st.getState().viewMode).toBe("compare");
    expect(st.getState().notice).toMatch(/Select a plan/);
  });
});

describe("three.js stays out of the 2D shell", () => {
  const SRC = join(__dirname, "..", "src");
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : [join(dir, n)]));
  it("only scene3d/ imports three, and SceneHost loads it with a dynamic import", () => {
    const importers = files(SRC).filter((f) => /from ["']three["']/.test(readFileSync(f, "utf-8")));
    expect(importers.map((f) => f.slice(SRC.length + 1).replace(/\\/g, "/"))).toEqual(["scene3d/renderer.ts"]);
    const staticRendererImports = files(SRC).filter((f) => /from ["'][./]*scene3d\/renderer["']|from ["']\.\/renderer["']/.test(readFileSync(f, "utf-8")));
    expect(staticRendererImports).toEqual([]);
    expect(readFileSync(join(SRC, "scene3d", "SceneHost.tsx"), "utf-8")).toContain('import("./renderer")');
  });
});
