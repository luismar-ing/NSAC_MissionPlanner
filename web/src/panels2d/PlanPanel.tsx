import type { PlanData } from "../lib/planData";
import type { ElevationScale } from "../lib/scale";
import { STRINGS } from "../lib/strings";
import { HorizonSilhouette } from "./HorizonSilhouette";
import type { MetricKey } from "../lib/why";
import { MetricsBox } from "./MetricsBox";
import { TimeRibbon } from "./TimeRibbon";

interface Props {
  data: PlanData;
  scale: ElevationScale;
  trajectoryMode: "REAL" | "ILLUSTRATIVE";
  selected: boolean;
  exaggeration: number | null;
  compareTime: number;
  best: Set<MetricKey>;
  onSelect(): void;
  onUnpin(): void;
  onLive(): void; // open this plan in live mode (spec 8.0, 8.1)
}

/**
 * One comparison panel (spec 8.1). Identical format for every plan; the silhouette (T3.3.b), the timeline
 * (T3.3.c) and the metrics box (T3.3.d) fill the reserved slots.
 */
export function PlanPanel({ data, scale, trajectoryMode, selected, exaggeration, compareTime, best, onSelect, onUnpin, onLive }: Props) {
  const { plan, site } = data;
  return (
    <article
      className={`plan-panel${selected ? " selected" : ""}`}
      aria-label={STRINGS.panel.aria(site.name, plan.arrival_utc.slice(0, 10), plan.window_days)}
      data-testid="plan-panel"
      data-plan-id={plan.id}
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
        <button type="button" className="btn live-btn" onClick={onLive} aria-label={STRINGS.panel.live(site.name)} title={STRINGS.panel.live(site.name)}>
          {STRINGS.panel.liveShort}
        </button>
        <button type="button" className="icon-btn" onClick={onUnpin} aria-label={STRINGS.panel.unpin(site.name)}>
          ×
        </button>
      </header>
      <div className="plan-slot silhouette-slot" data-slot="silhouette">
        <HorizonSilhouette data={data} scale={scale} exaggeration={exaggeration} compareTime={compareTime} />
      </div>
      <div className="plan-slot ribbon-slot" data-slot="ribbon">
        <TimeRibbon series={data.series} compareTime={compareTime} />
      </div>
      <div className="plan-slot metrics-slot" data-slot="metrics">
        <MetricsBox metrics={data.metrics} best={best} />
      </div>
    </article>
  );
}
