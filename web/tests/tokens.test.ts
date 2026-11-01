/** T3.1.c, TR.0.a: tokens are the single source of colour. Decision A7 brings back the spec 9 colours. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STRINGS } from "../src/lib/strings";
import { hexToOklab } from "../src/lib/colorScale";
import { COLORS, GLASS, cssVariables } from "../src/styles/tokens";

const SRC = join(__dirname, "..", "src");
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : [join(dir, n)]));

describe("design tokens (spec 9)", () => {
  it("uses the spec 9 colours for the Sun, the Earth, night and both (decision A7)", () => {
    expect(COLORS).toMatchObject({ sun: "#FFB347", earth: "#4AA3FF", dark: "#1A2238", both: "#9BE3A6", text: "#E6EDF7" });
    // selection must not borrow a body colour (the same colour means the same thing everywhere)
    expect([COLORS.sun, COLORS.earth, COLORS.both]).not.toContain(COLORS.accent);
  });

  it("the Sun and the Earth differ in lightness, not only in hue (spec 9)", () => {
    expect(hexToOklab(COLORS.sun)[0] - hexToOklab(COLORS.earth)[0]).toBeGreaterThan(0.1);
  });

  it("text reaches 4.5:1 on the background, opaque panels and glass over the brightest backdrop", () => {
    const glass = composite(GLASS.panel, GLASS.worstBackdrop);
    for (const surface of [COLORS.bg, COLORS.panel, COLORS.panelRaised, glass])
      for (const fg of [COLORS.text, COLORS.textMuted, COLORS.sun, COLORS.both]) expect(contrast(fg, surface), `${fg} on ${surface}`).toBeGreaterThanOrEqual(4.5);
    // Earth-blue text is for large figures and labels on glass (3:1, WCAG large text); 4.5:1 on the opaque ones
    for (const surface of [COLORS.bg, COLORS.panel]) expect(contrast(COLORS.earth, surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(COLORS.earth, glass)).toBeGreaterThanOrEqual(3);
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

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const lum = (hex: string) => {
  const [r, g, b] = rgb(hex).map((c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** rgba(...) painted over an opaque hex colour, as hex. */
function composite(rgba: string, under: string): string {
  const [r, g, b, a] = rgba.match(/[\d.]+/g)!.map(Number);
  const u = rgb(under);
  return "#" + [r, g, b].map((c, i) => Math.round(c * a + u[i] * (1 - a)).toString(16).padStart(2, "0")).join("");
}
