import { useEffect, useState } from "react";
import { ErrorMessage } from "../components/ErrorMessage";
import { Telemetry } from "../components/Telemetry";
import { describeError } from "../lib/errors";
import { timelineOf, type MissionTimeline } from "../lib/mission";
import { closeLive } from "../lib/modeTransition";
import { STRINGS } from "../lib/strings";
import { ThumbnailStrip } from "../panels2d/ThumbnailStrip";
import { MissionControls } from "../scene3d/MissionControls";
import { ScaleIndicator } from "../scene3d/ScaleIndicator";
import { LOCAL_SCALE, SPACE_SCALE } from "../scene3d/scale";
import { useApp } from "../store/appStore";
import { ArrivalDock } from "./LiveView";

/**
 * The journey of the Mission Planner (design B2): the scene stays full screen behind (PlannerView); over it, the
 * telemetry column, the scale notice and ILLUSTRATIVE label, the other pinned plans, and the mission dock.
 * "Back to planning" (or Esc) returns to the globe with the state kept (spec 8.0).
 */
export function MissionStage({ autoPlay }: { autoPlay: boolean }) {
  const data = useApp((s) => s.data);
  const plan = useApp((s) => (s.selectedPlanId ? s.plansById.get(s.selectedPlanId) : undefined));
  const site = useApp((s) => s.sites.find((x) => x.id === plan?.site_id));
  const missionPhase = useApp((s) => s.missionPhase);
  const sceneScale = useApp((s) => s.sceneScale);
  const pinned = useApp((s) => s.comparePlans.length);
  const trajectoryMode = useApp((s) => s.manifest?.params.trajectory_mode ?? "ILLUSTRATIVE");
  const [timeline, setTimeline] = useState<{ planId: string; tl: MissionTimeline } | null>(null);
  const [failure, setFailure] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const atSite = missionPhase === "site";

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
    setFailure(null);
    data
      .trajectory(plan.trajectory_id)
      .then((t) => alive && setTimeline({ planId: plan.id, tl: timelineOf(plan, t) }))
      .catch((e: unknown) => alive && setFailure(e));
    return () => {
      alive = false;
    };
  }, [plan, data, attempt]);

  if (!plan) return null;
  const scale = sceneScale === "local" ? LOCAL_SCALE : SPACE_SCALE;
  return (
    <section className={`mission-stage${atSite ? " at-site" : ""}`} aria-labelledby="live-title" data-testid="live-view">
      <div className="mission-head">
        <h2 id="live-title" className="telemetry-title">
          {STRINGS.live.title(site?.name ?? "")}
        </h2>
        <button type="button" className="btn ghost" onClick={closeLive} aria-keyshortcuts="Escape">
          {STRINGS.live.back} <kbd>Esc</kbd>
        </button>
        <Telemetry plan={plan} phase={missionPhase} scale={sceneScale === "local" ? STRINGS.scale.realScale : STRINGS.scale.notToScale} />
      </div>

      {!atSite && (
        <div className="mission-notes">
          {trajectoryMode === "ILLUSTRATIVE" && (
            <p className="scene-badge" data-testid="illustrative-label" title={STRINGS.panel.illustrativeTitle}>
              <span className="badge illustrative">ILLUSTRATIVE</span> {STRINGS.live.illustrative}
            </p>
          )}
          <ScaleIndicator mode={scale} />
        </div>
      )}

      {pinned > 0 && (
        <div className="mission-thumbs">
          <ThumbnailStrip />
        </div>
      )}

      <p className="visually-hidden" aria-live="polite">
        {atSite && site ? STRINGS.live.arrived(site.name) : ""}
      </p>

      <div className="mission-dock">
        {failure !== null && <ErrorMessage what={STRINGS.errors.scene} info={describeError(failure)} onRetry={() => setAttempt((n) => n + 1)} />}
        {timeline && <MissionControls timeline={timeline.tl} planId={timeline.planId} autoPlay={autoPlay} />}
        {atSite && <ArrivalDock />}
      </div>
    </section>
  );
}
