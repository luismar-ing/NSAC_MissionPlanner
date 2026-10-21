import type { WindowRow } from "../lib/contract";
import { STRINGS } from "../lib/strings";
import { METRICS, whyText, type MetricKey } from "../lib/why";

interface Props {
  metrics: WindowRow;
  best: Set<MetricKey>;
}

/** Metrics box of a plan (spec 8.1): six metrics, "best" badges (star + word, not colour alone) and the why text. */
export function MetricsBox({ metrics, best }: Props) {
  return (
    <div className="metrics-box" data-testid="metrics-box">
      <dl className="metrics-list">
        {METRICS.map(({ key, digits }) => (
          <div key={key} className={`metric${best.has(key) ? " best" : ""}`} data-metric={key} data-best={best.has(key)}>
            <dt>{STRINGS.metricNames[key]}</dt>
            <dd>
              <span className="metric-value">{metrics[key].toFixed(digits)}</span>
              {best.has(key) && (
                <span className="badge best" title={STRINGS.panel.bestTitle}>
                  ★ {STRINGS.panel.best}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="why" data-testid="why">
        {whyText(metrics, best)}
      </p>
    </div>
  );
}
