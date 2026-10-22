/**
 * Compare ↔ live transition (spec 8.0, 8.3: 200–400 ms between UI states). The view that is left records the
 * on-screen rectangle of the element that "becomes" the other one (the plan's panel, or the 3D scene); the
 * view that arrives plays a FLIP animation from that rectangle to its own element. Nothing here touches the
 * data or the WebGL context: the scene keeps the single renderer (renderer.ts) and the store keeps the state.
 */
import { sceneBridge } from "../scene3d/bridge";
import { appStore } from "../store/appStore";
import { MOTION } from "../styles/tokens";
import { clampMission, phaseAt, timelineOf } from "./mission";

export const TRANSITION_MS = MOTION.midMs;

let expandFrom: DOMRect | null = null; // panel → scene
let collapseFrom: DOMRect | null = null; // scene → panel

const reducedMotion = () => appStore.getState().reducedMotion; // app setting, initialised from the system one

/** Selector of a plan's panel in the tray (plan ids are [a-z0-9_], see the data contract). */
export const panelSelector = (planId: string) => `[data-plan-id="${planId}"]`;

/**
 * Open the live view on a plan. Re-selecting the plan that is already selected keeps its mission clock (so a
 * round trip resumes where it was); another plan starts a fresh mission (selectPlan).
 */
export function openLive(planId: string): void {
  const st = appStore.getState();
  if (st.selectedPlanId !== planId) st.selectPlan(planId);
  expandFrom = document.querySelector(panelSelector(planId))?.getBoundingClientRect() ?? null;
  st.setViewMode("live");
  if (appStore.getState().viewMode === "live") window.scrollTo?.({ top: 0 });
}

/** Back to compare mode (button or Esc); the selected plan's panel grows back out of the scene. */
export function closeLive(): void {
  collapseFrom = document.querySelector(".scene-wrap")?.getBoundingClientRect() ?? null;
  appStore.getState().setViewMode("compare");
}

export const takeExpandOrigin = () => {
  const r = expandFrom;
  expandFrom = null;
  return r;
};
export const takeCollapseOrigin = () => {
  const r = collapseFrom;
  collapseFrom = null;
  return r;
};

/**
 * FLIP: draw `el` first over the rectangle `from` (translate + scale), then let it settle in place.
 * Returns the Animation, or null when there is nothing to play (no origin, reduced motion, no WAAPI).
 */
export function playFrom(el: HTMLElement | null, from: DOMRect | null, ms = TRANSITION_MS): Animation | null {
  if (!el || !from || reducedMotion() || typeof el.animate !== "function") return null;
  const to = el.getBoundingClientRect();
  if (to.width < 1 || to.height < 1) return null;
  const sx = from.width / to.width;
  const sy = from.height / to.height;
  const dx = from.left - to.left;
  const dy = from.top - to.top;
  return el.animate(
    [
      { transformOrigin: "0 0", transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.6 },
      { transformOrigin: "0 0", transform: "none", opacity: 1 },
    ],
    { duration: ms, easing: "cubic-bezier(0.2, 0, 0, 1)" },
  );
}

let switchToken = 0;

/**
 * Change the live plan from a thumbnail without leaving live mode (T4.4.b). The new plan opens at the same
 * moment relative to its arrival as the current one (the clock the thumbnails show), clamped to its mission.
 * Its trajectory is loaded first; then the scene (camera hop, new trail and terrain) and the store change in
 * the same task, so no frame draws the old plan at the new instant. A later click wins over an earlier one.
 */
export async function switchLivePlan(planId: string): Promise<void> {
  const token = ++switchToken;
  const st = appStore.getState();
  const plan = st.plansById.get(planId);
  const old = st.selectedPlanId ? st.plansById.get(st.selectedPlanId) : undefined;
  if (!plan || planId === st.selectedPlanId) return;
  const [traj, oldTraj] = await Promise.all([st.data.trajectory(plan.trajectory_id), old ? st.data.trajectory(old.trajectory_id) : Promise.resolve(null)]);
  const now = appStore.getState();
  if (token !== switchToken || now.viewMode !== "live") return;
  const tl = timelineOf(plan, traj);
  const oldLanding = old && oldTraj ? timelineOf(old, oldTraj).landingMs : null;
  const rel = oldLanding !== null && now.missionTime !== null && now.missionPhase !== "overview" ? now.missionTime - oldLanding : tl.startMs - tl.landingMs;
  const t = clampMission(tl, tl.landingMs + rel);
  sceneBridge.setPlan?.({ trajectory: traj, timeline: tl, siteId: plan.site_id });
  now.selectPlan(planId);
  now.setMissionTime(t);
  now.setMissionPhase(phaseAt(tl, t));
}
