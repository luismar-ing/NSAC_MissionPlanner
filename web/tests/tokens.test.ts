/** T3.1.c: tokens are the single source of colour. Palette "Quantum" (decision A6) replaces the spec 9 colours. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STRINGS } from "../src/lib/strings";
import { COLORS, cssVariables } from "../src/styles/tokens";

const SRC = join(__dirname, "..", "src");
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : [join(dir, n)]));

describe("design tokens (spec 9)", () => {
  it("uses the six Quantum colours (decision A6); only `danger` lies outside them", () => {
    const palette = ["#0B0F14", "#3DDC84", "#E6EDF3", "#8E949A", "#575D62", "#373B40"];
    expect(COLORS).toMatchObject({ bg: "#0B0F14", sun: "#E6EDF3", earth: "#3DDC84", text: "#E6EDF3", textMuted: "#8E949A", border: "#373B40" });
    const outside = Object.entries(COLORS).filter(([, v]) => !palette.includes(v)).map(([k]) => k);
    expect(outside).toEqual(["danger"]);
  });

  it("no hex colour appears outside styles/tokens.ts", () => {
    const offenders = files(SRC)
      .filter((f) => !f.endsWith(join("styles", "tokens.ts")) && /\.(tsx?|css)$/.test(f))
      .filter((f) => /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(f, "utf-8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")));
    expect(offenders).toEqual([]);
  });

  it("exposes every colour as a CSS custom property", () => {
    const vars = cssVariables();
    expect(vars["--color-sun"]).toBe(COLORS.sun);
    expect(vars["--color-text-muted"]).toBe(COLORS.textMuted);
    expect(Object.keys(vars).filter((k) => k.startsWith("--color-"))).toHaveLength(Object.keys(COLORS).length);
  });

  it("UI strings are centralised and in English", () => {
    expect(STRINGS.appTitle).toBe("PolePlanner");
    expect(STRINGS.trayEmpty).toMatch(/Pin 2 to 5 plans/);
  });
});
