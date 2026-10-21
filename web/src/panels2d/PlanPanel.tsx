import type { PlanData } from "../lib/planData";
import type { ElevationScale } from "../lib/scale";
import { STRINGS } from "../lib/strings";
import { HorizonSilhouette } from "./HorizonSilhouette";

interface Props {
  data: PlanData;
  scale: ElevationScale;
  trajectoryMode: "REAL" | "ILLUSTRATIVE";
  selected: boolean;
  exaggeration: number | null;
  compareTime: number;
  onSelect(): void;
  onUnpin(): void;
}

/**
 * One comparison panel (spec 8.1). Identical format for every plan; the silhouette (T3.3.b), the timeline
 * (T3.3.c) and the metrics box (T3.3.d) fill the reserved slots.
 */
export function PlanPanel({ data, scale, trajectoryMode, selected, exaggeration, compareTime, onSelect, onUnpin }: Props) {
  const { plan, site } = data;
  return (
    <article
      className={`plan-panel${selected ? " selected" : ""}`}
      aria-label={STRINGS.panel.aria(site.name, plan.arrival_utc.slice(0, 10), plan.window_days)}
      data-testid="plan-panel"
      data-scale={`${scale.minDeg}:${scale.maxDeg}`}
    >
      <header className="plan-panel-header">
        <button type="button" className="plan-panel-title" onClick={onSelect} aria-pressed={selected}>
          <span className="plan-site">{site.name}</span>
          <span className="plan-meta">
            {STRINGS.arrival} {plan.arrival_utc.slice(0, 10)} · {STRINGS.windowDays(plan.window_days)}
          </span>
        </button>
        {trajectoryMode === "ILLUSTRATIVE" && (
          <span className="badge illustrative" title={STRINGS.panel.illustrativeTitle}>
            ILLUSTRATIVE
          </span>
        )}
        <button type="button" className="icon-btn" onClick={onUnpin} aria-label={STRINGS.panel.unpin(site.name)}>
          ×
        </button>
      </header>
      <div className="plan-slot silhouette-slot" data-slot="silhouette">
        <HorizonSilhouette data={data} scale={scale} exaggeration={exaggeration} compareTime={compareTime} />
      </div>
      <div className="plan-slot ribbon-slot" data-slot="ribbon" />
      <div className="plan-slot metrics-slot" data-slot="metrics" />
    </article>
  );
}
