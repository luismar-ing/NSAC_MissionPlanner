/**
 * Educator mode (decision A7, designs C2 and C3): the mission told in four short chapters. Each chapter sets
 * the mission clock to where its story starts and, for the journey and the landing, plays it to where the
 * story ends. Captions never carry a number of their own: every figure comes from the plan's data (rule 1).
 */
import { phaseAt, type MissionTimeline, type PlayPhase } from "./mission";

export type ChapterId = "leaving" | "journey" | "landing" | "surface";

export interface Chapter {
  id: ChapterId;
  /** Chapter 1 shows the globe before launch (the Mission Planner's planning stage), not the mission. */
  planning: boolean;
  /** Mission instant the chapter opens at. */
  start(tl: MissionTimeline): number;
  /** Instant playback stops at (= start: the chapter does not play by itself). */
  end(tl: MissionTimeline): number;
  /** Playback speed while the chapter plays (hours of mission per second). */
  hoursPerSecond: number;
}

export const CHAPTERS: readonly Chapter[] = [
  { id: "leaving", planning: true, start: (tl) => tl.startMs, end: (tl) => tl.startMs, hoursPerSecond: 0 },
  { id: "journey", planning: false, start: (tl) => tl.startMs, end: (tl) => tl.lunarArrivalMs, hoursPerSecond: 6 },
  { id: "landing", planning: false, start: (tl) => tl.lunarArrivalMs, end: (tl) => tl.landingMs, hoursPerSecond: 1 },
  { id: "surface", planning: false, start: (tl) => tl.landingMs, end: (tl) => tl.landingMs, hoursPerSecond: 0 },
];

/** The mission phase a chapter opens on. */
export function chapterPhase(c: Chapter, tl: MissionTimeline): PlayPhase {
  return phaseAt(tl, c.start(tl));
}

/** Previous / next chapter index, kept inside the story. */
export const stepChapter = (i: number, delta: number) => Math.min(CHAPTERS.length - 1, Math.max(0, i + delta));

/** Figures a caption may use, all from the plan's data. */
export interface CaptionData {
  site: string;
  transitDays: number;
  windowDays: number;
  sunPct: string; // already formatted from the window metrics
  earthHoursMean: string;
  longestDarkH: string;
}
