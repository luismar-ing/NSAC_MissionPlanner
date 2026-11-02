/**
 * Constraints in plain English (T6.5.a, extra): a small rule-based interpreter that runs in the browser (no server,
 * spec 4.3) and turns a sentence such as "at least 80% sunlight and no more than 24 hours of darkness" into the
 * three constraints of spec 5.6: X = minimum sunlight (%), Y = maximum darkness (h), Z = minimum Earth contact
 * (h/day). It only understands what those three controls can express; anything else is reported, never guessed.
 */
import type { Constraints } from "../store/appStore";

export interface Interpretation {
  /** Only the constraints the sentence mentions (null = switch that control off). */
  patch: Partial<Constraints>;
  /** Short English notes of what was understood, for the UI. */
  understood: string[];
  /** Clauses that mention none of the three, or ask for something the controls cannot express. */
  unrecognized: string[];
}

type Key = keyof Constraints;

const SUBJECT: [Key, RegExp][] = [
  // Earth first: "earth contact" must not be read as anything else
  ["minEarthH", /\b(earth|contact|link|comms?|communications?|radio|signal)\b/],
  ["maxDarkH", /\b(dark|darkness|night|shadows?|eclipse)\b/],
  ["minSunPct", /\b(sun|sunlight|sunlit|sunny|light|lit|illuminat\w*|illumination|solar)\b/],
];
const AT_LEAST = /\b(at least|more than|over|above|minimum|min|no less than|not less than|>=?)\b|>=?/;
const AT_MOST = /\b(at most|less than|under|below|maximum|max|no more than|not more than|up to|within)\b|<=?/;
const NUMBER = /(\d+(?:\.\d+)?)\s*(%|percent|per ?cent|hours?|hrs?|h\b|days?|d\b)?/;

const CLEAR_ALL = /\b(clear|reset|remove|drop|no)\b.*\b(constraints?|filters?|limits?)\b|^\s*(anything|any plan)\s*$/;
const IGNORE = /\b(ignore|any|don'?t care|whatever|no limit|unlimited)\b/;
const ALWAYS: Record<Key, RegExp> = {
  minSunPct: /\b(always|constant|continuous|permanent)\w*\b.*\b(sun|light|lit)|\b(sun|light)\w*\b.*\b(all the time|always)\b/,
  maxDarkH: /\b(no|never|without|zero)\b.*\b(dark|darkness|night|shadows?)\b|\b(dark|darkness)\b.*\bnever\b/,
  minEarthH: /\b(always|constant|continuous|permanent|uninterrupted|24\/7)\w*\b.*\b(earth|contact|link|comms?|communications?)\b|\b(earth|contact|link)\b.*\b(all the time|always|24\/7)\b/,
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Interprets `text` for a window of `windowDays` days (darkness can be at most the whole window). */
export function parseConstraints(text: string, windowDays: number): Interpretation {
  const out: Interpretation = { patch: {}, understood: [], unrecognized: [] };
  const s = text.toLowerCase().trim();
  if (!s) return out;
  if (CLEAR_ALL.test(s)) {
    out.patch = { minSunPct: null, maxDarkH: null, minEarthH: null };
    out.understood.push("all constraints off");
    return out;
  }
  const clauses = s
    .split(/,|;|\band\b|\bwith\b|\bbut\b|\bplus\b/)
    .map((c) => c.trim())
    .filter(Boolean);
  for (const clause of clauses) {
    const subject = SUBJECT.find(([, re]) => re.test(clause))?.[0];
    if (!subject) {
      out.unrecognized.push(clause);
      continue;
    }
    const m = clause.match(NUMBER);
    // "always / never" phrasings carry no figure ("no more than 24 hours" is a number, not "never")
    if ((!m || /24\/7/.test(clause)) && ALWAYS[subject].test(clause)) {
      const v = subject === "minSunPct" ? 100 : subject === "maxDarkH" ? 0 : 24;
      out.patch[subject] = v;
      out.understood.push(describe(subject, v));
      continue;
    }
    if (!m) {
      if (subject in out.patch) continue; // the rest of a phrase already understood ("contact with Earth")
      if (IGNORE.test(clause)) {
        out.patch[subject] = null;
        out.understood.push(`${NAMES[subject]}: off`);
      } else out.unrecognized.push(clause);
      continue;
    }
    // each control has one direction (sunlight and Earth: a minimum; darkness: a maximum)
    const wantsMin = subject !== "maxDarkH";
    if ((wantsMin && AT_MOST.test(clause) && !AT_LEAST.test(clause)) || (!wantsMin && AT_LEAST.test(clause) && !AT_MOST.test(clause))) {
      out.unrecognized.push(clause);
      continue;
    }
    let v = Number(m[1]);
    const unit = m[2] ?? "";
    if (/^d/.test(unit)) v *= 24; // days -> hours (darkness), or "1 day" of contact = 24 h/day
    const value =
      subject === "minSunPct" ? clamp(Math.round(v), 0, 100) : subject === "maxDarkH" ? clamp(Math.round(v), 0, 24 * windowDays) : clamp(Math.round(v * 2) / 2, 0, 24);
    out.patch[subject] = value;
    out.understood.push(describe(subject, value));
  }
  return out;
}

const NAMES: Record<Key, string> = { minSunPct: "sunlight", maxDarkH: "darkness", minEarthH: "Earth contact" };
function describe(k: Key, v: number): string {
  if (k === "minSunPct") return `sunlight ≥ ${v}%`;
  if (k === "maxDarkH") return `darkness ≤ ${v} h`;
  return `Earth contact ≥ ${v} h/day`;
}
