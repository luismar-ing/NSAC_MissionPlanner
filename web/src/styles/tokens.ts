/**
 * Design tokens: the ONLY place where colours are defined. 2D (via CSS custom properties) and 3D (three.js
 * reads these constants) share them, so the Sun and the Earth look the same everywhere.
 *
 * Decision A7 (2026-11-01, Phase R redesign): the spec 9 colours come back. Sun = warm orange, Earth = blue
 * (the pair also differs in lightness, so it holds for colour-blind readers), "both" = mint green. Surfaces
 * are deep space black with translucent "glass" panels (GLASS below). Selection is drawn in light text, not
 * in the Earth's blue, so a colour never means two things. `danger` is for errors only.
 */
export const COLORS = {
  bg: "#05070D", // deep space
  panel: "#0E1422", // opaque panel (drawer, tray cards); glass panels use GLASS.panel
  sun: "#FFB347", // spec 9
  earth: "#4AA3FF", // spec 9
  dark: "#1A2238", // spec 9: the lunar night (ribbon lane with neither body)
  both: "#9BE3A6", // spec 9: Sun and Earth together (combined calendar ramp)
  text: "#E6EDF7", // spec 9
  panelRaised: "#18213A", // tooltips, low end of the calendar ramps
  border: "#1F2838", // hairlines
  borderStrong: "#3A4760", // hover borders, terrain edge (not for text)
  textMuted: "#9FB0C8", // secondary text
  terrain: "#1B1F27",
  accent: "#E6EDF7", // selection, best badge, active controls (light, never a body colour)
  focus: "#FFFFFF",
  danger: "#FF6B6B", // errors only
  illustrative: "#9FB0C8",
} as const;

export type ColorToken = keyof typeof COLORS;

/** Translucent glass surfaces over the 3D scene (A7). Text on them is checked against GLASS.worstBackdrop. */
export const GLASS = {
  panel: "rgba(14, 20, 34, 0.72)",
  panelStrong: "rgba(14, 20, 34, 0.86)", // drawer and bottom console: dense content
  stroke: "rgba(255, 255, 255, 0.08)",
  strokeHover: "rgba(255, 255, 255, 0.28)",
  blur: "16px",
  radius: { sm: 10, md: 16, lg: 20 },
  // brightest thing that can sit behind a glass panel (lit lunar regolith / Earth clouds), for contrast tests
  worstBackdrop: "#B8B8B8",
} as const;

export const SPACE = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 } as const; // px

export const FONT = {
  // all SIL Open Font License, self-hosted via @fontsource (works offline). Geist: text; Geist Mono:
  // telemetry; Space Grotesk: Mission Planner headings; Instrument Serif: Educator headings and captions (A7)
  family: '"Geist Variable", "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif',
  display: '"Space Grotesk Variable", "Geist Variable", "Segoe UI", system-ui, sans-serif',
  serif: '"Instrument Serif", Georgia, "Times New Roman", serif',
  mono: '"Geist Mono Variable", "Cascadia Mono", Consolas, "SFMono-Regular", Menlo, monospace',
  // projector-friendly sizes (spec 9: legible at a distance)
  size: { sm: 14, md: 16, lg: 20, xl: 28, xxl: 36 },
} as const;

export const MOTION = { fastMs: 200, midMs: 300, slowMs: 400 } as const; // spec 9: 200–400 ms UI transitions

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** CSS custom properties generated from the tokens (single source of truth). */
export function cssVariables(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(COLORS)) vars[`--color-${kebab(k)}`] = v;
  for (const [k, v] of Object.entries(SPACE)) vars[`--space-${k}`] = `${v}px`;
  for (const [k, v] of Object.entries(FONT.size)) vars[`--font-${k}`] = `${v}px`;
  vars["--font-family"] = FONT.family;
  vars["--font-mono"] = FONT.mono;
  vars["--font-display"] = FONT.display;
  vars["--font-serif"] = FONT.serif;
  vars["--glass-panel"] = GLASS.panel;
  vars["--glass-panel-strong"] = GLASS.panelStrong;
  vars["--glass-stroke"] = GLASS.stroke;
  vars["--glass-stroke-hover"] = GLASS.strokeHover;
  vars["--glass-blur"] = GLASS.blur;
  for (const [k, v] of Object.entries(GLASS.radius)) vars[`--radius-${k}`] = `${v}px`;
  vars["--motion-fast"] = `${MOTION.fastMs}ms`;
  vars["--motion-mid"] = `${MOTION.midMs}ms`;
  vars["--motion-slow"] = `${MOTION.slowMs}ms`;
  return vars;
}

/** Applies the tokens to :root. Called once at start-up. */
export function applyTokens(root: HTMLElement = document.documentElement): void {
  for (const [k, v] of Object.entries(cssVariables())) root.style.setProperty(k, v);
}
