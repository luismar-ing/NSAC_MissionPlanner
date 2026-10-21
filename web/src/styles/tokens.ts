/**
 * Design tokens (spec 9). The ONLY place where colours are defined: 2D (via CSS custom properties) and
 * 3D (three.js reads these constants) share them, so the Sun is the same orange everywhere.
 * The seven spec colours are kept as given; the rest are derived UI shades.
 */
export const COLORS = {
  // spec 9
  bg: "#0b0f1a",
  panel: "#121a2b",
  sun: "#ffb347",
  earth: "#4aa3ff",
  dark: "#1a2238",
  both: "#9be3a6",
  text: "#e6edf7",
  // derived UI shades
  panelRaised: "#18223a",
  border: "#2a3550",
  textMuted: "#9aa6bd",
  terrain: "#3a4256",
  focus: "#ffd27a",
  danger: "#ff6b6b",
  illustrative: "#ffb347",
} as const;

export type ColorToken = keyof typeof COLORS;

export const SPACE = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 } as const; // px

export const FONT = {
  family: '"Inter", "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: '"JetBrains Mono", "Cascadia Mono", Consolas, "SFMono-Regular", Menlo, monospace',
  // projector-friendly sizes (spec 9: legible at a distance)
  size: { sm: 14, md: 16, lg: 20, xl: 28, xxl: 36 },
} as const;

export const MOTION = { fastMs: 200, slowMs: 400 } as const; // spec 9: 200–400 ms UI transitions

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
  vars["--motion-slow"] = `${MOTION.slowMs}ms`;
  return vars;
}

/** Applies the tokens to :root. Called once at start-up. */
export function applyTokens(root: HTMLElement = document.documentElement): void {
  for (const [k, v] of Object.entries(cssVariables())) root.style.setProperty(k, v);
}
