/**
 * Mission timeline of the selected plan (spec 8.2, 5.8): from launch to the end of the stay at the site.
 * Phase boundaries come from the trajectory file (contract §11): launch → injection → lunar arrival → landing
 * (= arrival_utc) → end of the window (arrival + L days).
 */
import type { Plan, Trajectory } from "./contract";
import { parseInstant } from "./contract";
import type { MissionPhase } from "../store/appStore";

/** Illustrative countdown on the pad before launch_utc (T4.2.b); the mission view starts there. */
export const PRELAUNCH_MS = 5 * 60_000;

export interface MissionTimeline {
  startMs: number; // start of the countdown = launch − PRELAUNCH_MS
  launchMs: number; // launch_utc (T+ 0)
  injectionMs: number;
  lunarArrivalMs: number;
  landingMs: number; // = arrival_utc
  endMs: number; // landing + window_days
}

/** The four playable phases, in order (the store's "overview" means "not started yet"). */
export const PLAY_PHASES = ["launch", "transit", "landing", "site"] as const satisfies readonly MissionPhase[];
export type PlayPhase = (typeof PLAY_PHASES)[number];

export function timelineOf(plan: Plan, traj: Trajectory): MissionTimeline {
  const p = traj.phases;
  return {
    startMs: parseInstant(p.launch_utc) - PRELAUNCH_MS,
    launchMs: parseInstant(p.launch_utc),
    injectionMs: parseInstant(p.injection_utc),
    lunarArrivalMs: parseInstant(p.lunar_arrival_utc),
    landingMs: parseInstant(p.landing_utc),
    endMs: parseInstant(plan.arrival_utc) + plan.window_days * 86_400_000,
  };
}

export function clampMission(tl: MissionTimeline, t: number): number {
  return Math.min(tl.endMs, Math.max(tl.startMs, t));
}

/** Phase at an instant: launch [countdown start, injection), transit [injection, lunar arrival), landing [lunar arrival, landing), site [landing, end]. */
export function phaseAt(tl: MissionTimeline, t: number): PlayPhase {
  if (t < tl.injectionMs) return "launch";
  if (t < tl.lunarArrivalMs) return "transit";
  if (t < tl.landingMs) return "landing";
  return "site";
}

/** Instant a "jump to phase" goes to: the start of that phase. */
export function phaseStart(tl: MissionTimeline, phase: PlayPhase): number {
  return { launch: tl.startMs, transit: tl.injectionMs, landing: tl.lunarArrivalMs, site: tl.landingMs }[phase];
}

/**
 * Mission elapsed time from launch: "T− 00:04:30" during the countdown (minutes:seconds), "T+ 2d 04:30"
 * afterwards (days hours:minutes), and the UTC instant "2027-01-01 00:00 UTC".
 */
export function missionClock(tl: MissionTimeline, t: number): { elapsed: string; utc: string } {
  const iso = new Date(t).toISOString();
  const utc = `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
  if (t < tl.launchMs) {
    const s = Math.ceil((tl.launchMs - t) / 1000);
    return { elapsed: `T− ${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`, utc };
  }
  const min = Math.floor((t - tl.launchMs) / 60_000);
  const d = Math.floor(min / 1440);
  const hh = String(Math.floor((min % 1440) / 60)).padStart(2, "0");
  const mm = String(min % 60).padStart(2, "0");
  return { elapsed: `T+ ${d}d ${hh}:${mm}`, utc };
}
