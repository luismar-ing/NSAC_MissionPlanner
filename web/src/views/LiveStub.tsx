import { useEffect, useState } from "react";
import { useApp } from "../store/appStore";
import { STRINGS } from "../lib/strings";
import { timelineOf, type MissionTimeline } from "../lib/mission";
import { SceneHost } from "../scene3d/SceneHost";
import { ScaleIndicator } from "../scene3d/ScaleIndicator";
import { MissionControls } from "../scene3d/MissionControls";
import { LOCAL_SCALE, SPACE_SCALE } from "../scene3d/scale";

/**
 * Provisional live view (T4.1.a): the 3D scene of the selected plan, its mission controls (T4.1.d) and a way
 * back to compare mode. T4.4.a replaces it with LiveView (animated expansion, live 2D thumbnails, Esc).
 */
export function LiveStub() {
  const setViewMode = useApp((s) => s.setViewMode);
  const data = useApp((s) => s.data);
  const plan = useApp((s) => (s.selectedPlanId ? s.plansById.get(s.selectedPlanId) : undefined));
  const site = useApp((s) => s.sites.find((x) => x.id === plan?.site_id));
  const missionPhase = useApp((s) => s.missionPhase);
  const sceneScale = useApp((s) => s.sceneScale);
  const trajectoryMode = useApp((s) => s.manifest?.params.trajectory_mode ?? "ILLUSTRATIVE");
  const [timeline, setTimeline] = useState<MissionTimeline | null>(null);

  useEffect(() => {
    if (!plan) return;
    let alive = true;
    data.trajectory(plan.trajectory_id).then((t) => alive && setTimeline(timelineOf(plan, t)));
    return () => {
      alive = false;
    };
  }, [plan, data]);

  return (
    <section className="panel live-area" aria-labelledby="live-title">
      <div className="live-head">
        <h2 id="live-title" className="panel-title">
          {STRINGS.live.title(site?.name ?? "")}
        </h2>
        <button type="button" className="btn" onClick={() => setViewMode("compare")}>
          {STRINGS.live.back}
        </button>
      </div>
      <div className="scene-wrap">
        <SceneHost />
        {/* spec 8.2: the scale indicator is shown in phases 1 to 3 (launch, transit, landing); it says "real
            scale" once the final approach has switched to it (T4.3.b) */}
        {missionPhase !== "site" && <ScaleIndicator mode={sceneScale === "local" ? LOCAL_SCALE : SPACE_SCALE} />}
        {/* rule 2: a launch / trajectory that is not real is labelled ILLUSTRATIVE wherever it is shown */}
        {trajectoryMode === "ILLUSTRATIVE" && missionPhase !== "site" && (
          <p className="scene-badge" data-testid="illustrative-label" title={STRINGS.panel.illustrativeTitle}>
            <span className="badge illustrative">ILLUSTRATIVE</span> {STRINGS.live.illustrative}
          </p>
        )}
      </div>
      {timeline && <MissionControls timeline={timeline} />}
    </section>
  );
}
