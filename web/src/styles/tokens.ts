/**
 * Design tokens: the ONLY place where colours are defined. 2D (via CSS custom properties) and 3D (three.js
 * reads these constants) share them, so the Sun and the Earth look the same everywhere.
 *
 * Palette "Quantum" (decision A6, 2026-10-22): modern minimal, six colours chosen by the team. It replaces
 * the spec 9 colours. Roles: the Sun is drawn as white light (light text), the Earth in quantum green (the
 * pair separates for colour-blind readers, checked with the palette validator); the ribbon colours each lane
 * (top = Sun, bottom = Earth), so "both" needs no third hue. Medium grey (2.9:1 on the background) is for
 * borders only, never text. The only colour outside the six is `danger`, kept for error states.
 */
export const COLORS = {
  bg: "#0B0F14", // dark background
  panel: "#0B0F14", // panels are outlined, not filled
  sun: "#E6EDF3", // light text: the Sun is white light
  earth: "#3DDC84", // quantum green
  dark: "#373B40", // dark grey: the lunar night (ribbon lane with neither body)
  both: "#3DDC84", // combined score ramp of the calendar (Sun and Earth together)
  text: "#E6EDF3", // light text
  panelRaised: "#373B40", // dark grey: tooltips, low end of the calendar ramps
  border: "#373B40", // dark grey: hairlines
  borderStrong: "#575D62", // medium grey: hover borders, terrain edge (not for text)
  textMuted: "#8E949A", // light grey: secondary text (6.3:1)
  terrain: "#373B40",
  accent: "#3DDC84", // selection, best badge, active controls
  focus: "#3DDC84",
  danger: "#ff6b6b", // errors only (outside the palette)
  illustrative: "#8E949A",
} as const;

export type ColorToken = keyof typeof COLORS;

export const SPACE = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 } as const; // px

export const FONT = {
  // Geist and Geist Mono (SIL Open Font License), self-hosted via @fontsource-variable (works offline)
  family: '"Geist Variable", "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif',
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
  vars["--motion-fast"] = `${MOTION.fastMs}ms`;
  vars["--motion-mid"] = `${MOTION.midMs}ms`;
  vars["--motion-slow"] = `${MOTION.slowMs}ms`;
  return vars;
}

/** Applies the tokens to :root. Called once at start-up. */
export function applyTokens(root: HTMLElement = document.documentElement): void {
  for (const [k, v] of Object.entries(cssVariables())) root.style.setProperty(k, v);
}
