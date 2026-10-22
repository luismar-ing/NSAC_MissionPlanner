import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useApp } from "../store/appStore";
import { STRINGS } from "../lib/strings";
import { timelineOf, type MissionTimeline } from "../lib/mission";
import { closeLive, playFrom, takeExpandOrigin } from "../lib/modeTransition";
import { ThumbnailStrip } from "../panels2d/ThumbnailStrip";
import { SceneHost } from "../scene3d/SceneHost";
import { ScaleIndicator } from "../scene3d/ScaleIndicator";
import { MissionControls } from "../scene3d/MissionControls";
import { LOCAL_SCALE, SPACE_SCALE } from "../scene3d/scale";
import { Panorama } from "./Panorama";
import { SitePanel } from "./SitePanel";
import { useSiteData } from "./useSiteData";

/**
 * Live mode (spec 8.0, 8.2): the 3D scene of the selected plan with its mission controls, and the other pinned
 * plans as a strip of live 2D thumbnails. Entering it, the scene grows out of the plan's panel (FLIP, 300 ms);
 * the back button or Esc returns to compare mode with the state untouched. On arrival (missionPhase = site)
 * the horizon panorama (8.4) and the site features panel (8.6) appear under the scene, driven by the same
 * missionTime as the scene, so scrubbing or playing moves the 3D sky and the panorama together.
 */
export function LiveView() {
  const data = useApp((s) => s.data);
  const plan = useApp((s) => (s.selectedPlanId ? s.plansById.get(s.selectedPlanId) : undefined));
  const site = useApp((s) => s.sites.find((x) => x.id === plan?.site_id));
  const missionPhase = useApp((s) => s.missionPhase);
  const sceneScale = useApp((s) => s.sceneScale);
  const trajectoryMode = useApp((s) => s.manifest?.params.trajectory_mode ?? "ILLUSTRATIVE");
  // timeline and the plan it belongs to: after a switch (T4.4.b) the controls know when theirs is stale
  const [timeline, setTimeline] = useState<{ planId: string; tl: MissionTimeline } | null>(null);
  const atSite = missionPhase === "site";
  const sceneRef = useRef<HTMLDivElement>(null);

  // the scene grows out of the panel that was clicked (no origin, or reduced motion: it simply appears)
  useLayoutEffect(() => {
    playFrom(sceneRef.current, takeExpandOrigin());
  }, []);

  // Esc goes back to compare (spec 8.0: "a button or key")
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) closeLive();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!plan) return;
    let alive = true;
    data.trajectory(plan.trajectory_id).then((t) => alive && setTimeline({ planId: plan.id, tl: timelineOf(plan, t) }));
    return () => {
      alive = false;
    };
  }, [plan, data]);

  return (
    <section className={`panel live-area${atSite ? " at-site" : ""}`} aria-labelledby="live-title" data-testid="live-view">
      <div className="live-head">
        <h2 id="live-title" className="panel-title">
          {STRINGS.live.title(site?.name ?? "")}
        </h2>
        <button type="button" className="btn" onClick={closeLive} aria-keyshortcuts="Escape">
          {STRINGS.live.back} <kbd>Esc</kbd>
        </button>
      </div>
      <div className="live-body">
        <div className="live-main">
          <div className="scene-wrap" ref={sceneRef}>
            <SceneHost />
            {/* spec 8.2: the scale indicator is shown in phases 1 to 3 (launch, transit, landing); it says "real
                scale" once the final approach has switched to it (T4.3.b) */}
            {!atSite && <ScaleIndicator mode={sceneScale === "local" ? LOCAL_SCALE : SPACE_SCALE} />}
            {/* rule 2: a launch / trajectory that is not real is labelled ILLUSTRATIVE wherever it is shown */}
            {trajectoryMode === "ILLUSTRATIVE" && !atSite && (
              <p className="scene-badge" data-testid="illustrative-label" title={STRINGS.panel.illustrativeTitle}>
                <span className="badge illustrative">ILLUSTRATIVE</span> {STRINGS.live.illustrative}
              </p>
            )}
          </div>
          {timeline && <MissionControls timeline={timeline.tl} planId={timeline.planId} />}
          <p className="visually-hidden" aria-live="polite">
            {atSite && site ? STRINGS.live.arrived(site.name) : ""}
          </p>
          {atSite && <ArrivalDock />}
        </div>
        <ThumbnailStrip />
      </div>
    </section>
  );
}

/** Panorama and site features panel shown on arrival (spec 8.2 phase 4, 8.6), on the mission clock. */
function ArrivalDock() {
  const missionTime = useApp((s) => s.missionTime);
  const { plan, site, pinned, error } = useSiteData();
  return (
    <section className="live-site" data-testid="live-site" aria-labelledby="live-site-title">
      <h3 id="live-site-title" className="panel-title">
        {STRINGS.site.title}
      </h3>
      {error && <p role="alert">{error}</p>}
      {!error && (!plan || !site || missionTime === null) && <p className="placeholder">{STRINGS.loading}</p>}
      {plan && site && missionTime !== null && (
        <>
          <Panorama data={plan} timeMs={missionTime} />
          <SitePanel plan={plan} features={site.features} daily={site.daily} pinned={pinned} />
        </>
      )}
    </section>
  );
}
