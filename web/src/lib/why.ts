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

/**
 * Rounds to `digits` decimals HALF UP ON THE DECIMAL VALUE: the data hold exact decimals (68.45, 0.745) whose
 * binary doubles sit just below the half, so toFixed alone would show 68.4 and 0.74. Every view formats with
 * this (T5.1.b), so the tray, the site panel, the calendar and the why text never disagree on a digit.
 */
export function round(v: number, digits: number): string {
  const f = 10 ** digits;
  const scaled = Number((v * f).toPrecision(12)); // 68.45 * 10 = 684.4999999999999 -> 684.5
  return (Math.round(scaled) / f).toFixed(digits);
}

const DIGITS = Object.fromEntries(METRICS.map((m) => [m.key, m.digits])) as Record<MetricKey, number>;

/** A window metric as displayed in every view (box, site panel, calendar, comparison table). */
export function fmtMetric(key: MetricKey, v: number): string {
  return round(v, DIGITS[key]);
}

/** Number as shown in text: one decimal (same rounding as the metric boxes), no trailing ".0". */
export function num(v: number): string {
  return round(v, 1).replace(/\.0$/, "");
}

/**
 * What a "best" badge says about the plan. A best value is only the best AMONG THE COMPARED PLANS: a strong value
 * reads as a strength ("92% sunlight"), a weak one is stated as the relative best it is ("the most sunlight
 * (10%)"), so the sentence never sells a long blackout as a virtue (T5.1.b).
 */
const STRENGTH: Record<MetricKey, (r: WindowRow) => string> = {
  sun_pct: (r) => (r.sun_pct >= 50 ? `${num(r.sun_pct)}% sunlight` : `the most sunlight (${num(r.sun_pct)}%)`),
  longest_dark_h: (r) =>
    r.longest_dark_h === 0
      ? "no dark stretch"
      : r.longest_dark_h <= 24
        ? `a longest dark of only ${num(r.longest_dark_h)} h`
        : `the shortest dark stretch (${num(r.longest_dark_h)} h)`,
  earth_h_min: (r) =>
    r.earth_h_min >= 24
      ? "Earth in view all day, every day"
      : r.earth_h_min >= 12
        ? `Earth at least ${num(r.earth_h_min)} h every day`
        : `the most Earth time on its worst day (${num(r.earth_h_min)} h)`,
  earth_h_mean: (r) => `Earth ${num(r.earth_h_mean)} h/day on average`,
  longest_comm_gap_h: (r) =>
    r.longest_comm_gap_h === 0
      ? "no comm gaps"
      : r.longest_comm_gap_h <= 24
        ? `comm gaps of at most ${num(r.longest_comm_gap_h)} h`
        : `the shortest comm blackout (${num(r.longest_comm_gap_h)} h)`,
  score: (r) => `the top score (${fmtMetric("score", r.score)})`,
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
    parts.push(`${num(r.sun_pct)}% sunlight, ${r.longest_dark_h === 0 ? "no dark stretch" : `longest dark ${num(r.longest_dark_h)} h`}.`);
  }
  // one caveat, if there is a serious one the sentence above does not already state
  if (r.longest_dark_h >= 48 && strengths.length && !best.has("longest_dark_h")) parts.push(`Watch out: ${num(r.longest_dark_h)} h without Sun.`);
  else if (r.earth_h_min < 12 && !best.has("earth_h_min"))
    parts.push(r.earth_h_min === 0 ? "Earth is out of view for at least one whole day." : `Earth drops to ${num(r.earth_h_min)} h on its worst day.`);
  return parts.join(" ");
}
