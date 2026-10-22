import { useApp } from "../store/appStore";
import { STRINGS } from "../lib/strings";
import { SceneHost } from "../scene3d/SceneHost";
import { ScaleIndicator } from "../scene3d/ScaleIndicator";
import { SPACE_SCALE } from "../scene3d/scale";

/**
 * Provisional live view (T4.1.a): the 3D scene of the selected plan and a way back to compare mode.
 * T4.4.a replaces it with LiveView (animated expansion, live 2D thumbnail strip, Esc to go back).
 */
export function LiveStub() {
  const setViewMode = useApp((s) => s.setViewMode);
  const plan = useApp((s) => (s.selectedPlanId ? s.plansById.get(s.selectedPlanId) : undefined));
  const site = useApp((s) => s.sites.find((x) => x.id === plan?.site_id));
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
        <ScaleIndicator mode={SPACE_SCALE} />
      </div>
    </section>
  );
}
