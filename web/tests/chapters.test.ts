/** TR.4.a: the Educator chapters take the mission to their phase, stay in order, and invent no figures. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CHAPTERS, chapterPhase, stepChapter } from "../src/lib/chapters";
import type { Plan, Trajectory } from "../src/lib/contract";
import { timelineOf } from "../src/lib/mission";
import { STRINGS } from "../src/lib/strings";

const DATA = join(__dirname, "..", "public", "data");
const plans = JSON.parse(readFileSync(join(DATA, "plans.json"), "utf-8")) as Plan[];
const plan = plans.find((p) => p.id === "haworth_20270309_7d")!;
const traj = JSON.parse(readFileSync(join(DATA, "trajectory", `${plan.trajectory_id}.json`), "utf-8")) as Trajectory;
const tl = timelineOf(plan, traj);

describe("Educator chapters (A7, C2/C3)", () => {
  it("four chapters in story order: globe, journey from launch, landing, the surface", () => {
    expect(CHAPTERS.map((c) => c.id)).toEqual(["leaving", "journey", "landing", "surface"]);
    expect(CHAPTERS.map((c) => c.planning)).toEqual([true, false, false, false]);
    expect(CHAPTERS.map((c) => chapterPhase(c, tl))).toEqual(["launch", "launch", "landing", "site"]);
    // each playing chapter ends where the next one starts: the story is continuous
    expect(CHAPTERS[1].end(tl)).toBe(CHAPTERS[2].start(tl));
    expect(CHAPTERS[2].end(tl)).toBe(CHAPTERS[3].start(tl));
    for (const c of CHAPTERS) expect(c.end(tl)).toBeGreaterThanOrEqual(c.start(tl));
  });

  it("back and next stay inside the story", () => {
    expect(stepChapter(0, -1)).toBe(0);
    expect(stepChapter(0, 1)).toBe(1);
    expect(stepChapter(3, 1)).toBe(3);
  });

  it("captions carry no figure of their own: every number comes from the plan's data", () => {
    const d = { site: "Haworth", transitDays: 3, windowDays: 7, sunPct: "95.8", earthHoursMean: "24.0", longestDarkH: "7.0" };
    for (const c of CHAPTERS) {
      const text = STRINGS.educator.chapters[c.id].caption(d);
      const left = text.replace(/95\.8|24\.0|7(?= days)|3(?= days)/g, "");
      expect(left, `${c.id}: ${text}`).not.toMatch(/\d/);
    }
  });
});
