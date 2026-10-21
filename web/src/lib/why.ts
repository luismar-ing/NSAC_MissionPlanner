/**
 * Metrics box logic (spec 8.1): the six window metrics, the "best" badge per metric among the visible
 * panels, and a short English "why" sentence built only from the plan's own figures.
 */
import type { WindowRow } from "./contract";

export type MetricKey = "sun_pct" | "longest_dark_h" | "earth_h_min" | "earth_h_mean" | "longest_comm_gap_h" | "score";

/** Order of the metrics box (spec 8.1) and the direction that counts as better. */
export const METRICS: { key: MetricKey; better: "high" | "low"; digits: number }[] = [
  { key: "sun_pct", better: "high", digits: 1 },
  { key: "longest_dark_h", better: "low", digits: 1 },
  { key: "earth_h_min", better: "high", digits: 1 },
  { key: "earth_h_mean", better: "high", digits: 1 },
  { key: "longest_comm_gap_h", better: "low", digits: 1 },
  { key: "score", better: "high", digits: 2 },
];

/**
 * Best badges: for each metric, every plan that reaches the best value gets the badge (ties share it).
 * A metric where all visible plans tie gets no badge: it does not tell them apart. One plan alone: no badges.
 */
export function bestBadges(rows: WindowRow[]): Set<MetricKey>[] {
  const out = rows.map(() => new Set<MetricKey>());
  if (rows.length < 2) return out;
  for (const { key, better } of METRICS) {
    const vals = rows.map((r) => r[key]);
    const best = better === "high" ? Math.max(...vals) : Math.min(...vals);
    if (vals.every((v) => v === best)) continue;
    vals.forEach((v, i) => v === best && out[i].add(key));
  }
  return out;
}

/** Number as shown in text: at most one decimal, no trailing ".0". */
export function num(v: number): string {
  return String(Math.round(v * 10) / 10);
}

const STRENGTH: Record<MetricKey, (r: WindowRow) => string> = {
  sun_pct: (r) => `${num(r.sun_pct)}% sunlight`,
  longest_dark_h: (r) => (r.longest_dark_h === 0 ? "no dark stretch" : `a longest dark of only ${num(r.longest_dark_h)} h`),
  earth_h_min: (r) => (r.earth_h_min >= 24 ? "Earth in view all day, every day" : `Earth at least ${num(r.earth_h_min)} h every day`),
  earth_h_mean: (r) => `Earth ${num(r.earth_h_mean)} h/day on average`,
  longest_comm_gap_h: (r) => (r.longest_comm_gap_h === 0 ? "no comm gaps" : `comm gaps under ${num(r.longest_comm_gap_h)} h`),
  score: (r) => `the top score (${r.score.toFixed(2)})`,
};

// the score is a summary of the others: cite it only when nothing more concrete is best
const PRIORITY: MetricKey[] = ["sun_pct", "longest_dark_h", "earth_h_min", "longest_comm_gap_h", "earth_h_mean", "score"];

/** Short "why" text (spec 8.1), e.g. "Best option for 92% sunlight and a longest dark of only 14 h." */
export function whyText(r: WindowRow, best: Set<MetricKey>): string {
  const strengths = PRIORITY.filter((k) => best.has(k));
  const parts: string[] = [];
  if (strengths.length) {
    const phrases = strengths.slice(0, 2).map((k) => STRENGTH[k](r));
    parts.push(`Best option for ${phrases.join(" and ")}.`);
  } else {
    parts.push(`${num(r.sun_pct)}% sunlight, longest dark ${num(r.longest_dark_h)} h.`);
  }
  // one caveat, if there is a serious one the sentence above does not already cover
  if (r.longest_dark_h >= 48 && strengths.length) parts.push(`Watch out: ${num(r.longest_dark_h)} h without Sun.`);
  else if (r.earth_h_min < 12 && !best.has("earth_h_min")) parts.push(`Earth drops to ${num(r.earth_h_min)} h on the worst day.`);
  return parts.join(" ");
}
