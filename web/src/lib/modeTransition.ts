/**
 * Compare ↔ live transition (spec 8.0, 8.3: 200–400 ms between UI states). The view that is left records the
 * on-screen rectangle of the element that "becomes" the other one (the plan's panel, or the 3D scene); the
 * view that arrives plays a FLIP animation from that rectangle to its own element. Nothing here touches the
 * data or the WebGL context: the scene keeps the single renderer (renderer.ts) and the store keeps the state.
 */
import { appStore } from "../store/appStore";

export const TRANSITION_MS = 300;

let expandFrom: DOMRect | null = null; // panel → scene
let collapseFrom: DOMRect | null = null; // scene → panel

const reducedMotion = () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
