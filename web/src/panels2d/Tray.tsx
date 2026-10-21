import { useEffect, useMemo, useState } from "react";
import { loadPlanData, type PlanData } from "../lib/planData";
import { sharedElevationScale } from "../lib/scale";
import { STRINGS } from "../lib/strings";
import { bestBadges } from "../lib/why";
import { useApp } from "../store/appStore";
import { PlanPanel } from "./PlanPanel";

/** Comparison tray (spec 8.1): 2–5 pinned plans in identical panels with shared scales. */
export function Tray() {
  const ids = useApp((s) => s.comparePlans);
  const plansById = useApp((s) => s.plansById);
  const sites = useApp((s) => s.sites);
  const data = useApp((s) => s.data);
  const selectedPlanId = useApp((s) => s.selectedPlanId);
  const selectPlan = useApp((s) => s.selectPlan);
  const unpinPlan = useApp((s) => s.unpinPlan);
  const trajectoryMode = useApp((s) => s.manifest?.params.trajectory_mode ?? "ILLUSTRATIVE");
  const exaggeration = useApp((s) => s.exaggeration);
  const setExaggeration = useApp((s) => s.setExaggeration);
  const compareTime = useApp((s) => s.compareTime);
  const [loaded, setLoaded] = useState<Record<string, PlanData>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const missing = ids.filter((id) => !loaded[id]);
    if (!missing.length) return;
    Promise.all(missing.map((id) => loadPlanData(data, plansById.get(id)!, sites)))
      .then((list) => alive && setLoaded((prev) => ({ ...prev, ...Object.fromEntries(list.map((p) => [p.plan.id, p])) })))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [ids, loaded, data, plansById, sites]);

  const visible = ids.map((id) => loaded[id]).filter((p): p is PlanData => !!p);
  const key = visible.map((p) => p.plan.id).join(",");
  // recomputed only when the set of visible plans changes
  const scale = useMemo(() => sharedElevationScale(visible), [key]);
  const best = useMemo(() => bestBadges(visible.map((p) => p.metrics)), [key]);

  if (!ids.length) return <p className="placeholder">{STRINGS.trayEmpty}</p>;
  return (
    <>
      {ids.length === 1 && <p className="placeholder">{STRINGS.panel.pinOneMore}</p>}
      {error && <p role="alert">{error}</p>}
      <div className="tray-toolbar">
        <div className="segmented" role="group" aria-label={STRINGS.silhouette.exaggerationLabel}>
          <span className="segmented-label">{STRINGS.silhouette.exaggerationLabel}</span>
          {[null, 10, 20, 40].map((x) => (
            <button key={String(x)} type="button" aria-pressed={exaggeration === x} className={exaggeration === x ? "on" : ""} onClick={() => setExaggeration(x)}>
              {x === null ? STRINGS.silhouette.fit : STRINGS.silhouette.times(x)}
            </button>
          ))}
        </div>
      </div>
      <div className="tray-grid" style={{ ["--cols" as string]: Math.max(2, ids.length) }} data-testid="tray-grid">
        {visible.map((p, i) => (
          <PlanPanel
            key={p.plan.id}
            data={p}
            scale={scale}
            trajectoryMode={trajectoryMode}
            selected={selectedPlanId === p.plan.id}
            exaggeration={exaggeration}
            compareTime={compareTime}
            best={best[i]}
            onSelect={() => selectPlan(p.plan.id)}
            onUnpin={() => unpinPlan(p.plan.id)}
          />
        ))}
      </div>
    </>
  );
}
