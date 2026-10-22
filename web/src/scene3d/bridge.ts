/**
 * Link from the 2D UI to the mounted 3D scene. It must not import renderer.ts (three.js stays out of the 2D
 * shell's chunk), so the plan inputs are declared here and renderer.ts imports them. SceneHost fills the link
 * while the scene is mounted; the plan switch of live mode (T4.4.b) calls it.
 */
import type { Trajectory } from "../lib/contract";
import type { MissionTimeline } from "../lib/mission";

/** The plan-dependent inputs of the scene (they can change while the scene stays mounted). */
export interface PlanSpec {
  trajectory: Trajectory | null;
  timeline: MissionTimeline | null;
  siteId?: string;
}

export const sceneBridge: { setPlan: ((p: PlanSpec) => void) | null } = { setPlan: null };
