/**
 * Time ribbon logic (spec 8.1): the visibility state of every sample of a plan window as runs, and the
 * longest dark stretch (no Sun) located in time, so the panel can highlight it.
 */

export type RibbonState = "both" | "sun" | "earth" | "none";

export interface Run {
  start: number; // sample index, inclusive
  end: number; // sample index, exclusive
}

export interface StateRun extends Run {
  state: RibbonState;
}

export function stateOf(sun: number, earth: number): RibbonState {
  if (sun && earth) return "both";
  if (sun) return "sun";
  if (earth) return "earth";
  return "none";
}

/** Consecutive samples with the same state, in order, covering [0, n). */
export function stateRuns(sunVis: ArrayLike<number>, earthVis: ArrayLike<number>): StateRun[] {
  const runs: StateRun[] = [];
  for (let i = 0; i < sunVis.length; i++) {
    const s = stateOf(sunVis[i], earthVis[i]);
    const last = runs[runs.length - 1];
    if (last && last.state === s) last.end = i + 1;
    else runs.push({ start: i, end: i + 1, state: s });
  }
  return runs;
}

/** Longest run of zeros (e.g. no Sun); the first one wins a tie. null if there are none. */
export function longestZeroRun(flags: ArrayLike<number>): Run | null {
  let best: Run | null = null;
  let start = -1;
  for (let i = 0; i <= flags.length; i++) {
    const zero = i < flags.length && !flags[i];
    if (zero && start < 0) start = i;
    if (!zero && start >= 0) {
      if (!best || i - start > best.end - best.start) best = { start, end: i };
      start = -1;
    }
  }
  return best;
}

/** "Day 2, 03:30" (relative to arrival) for a sample index. */
export function relativeLabel(sample: number, stepMin: number): string {
  const min = sample * stepMin;
  const day = Math.floor(min / 1440) + 1;
  const hh = String(Math.floor((min % 1440) / 60)).padStart(2, "0");
  const mm = String(min % 60).padStart(2, "0");
  return `Day ${day}, ${hh}:${mm}`;
}
