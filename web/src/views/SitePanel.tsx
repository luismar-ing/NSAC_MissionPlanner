import type { Daily, SiteFeatures } from "../lib/contract";
import type { PlanData } from "../lib/planData";
import { STRINGS } from "../lib/strings";
import { bestBadges, METRICS, num, whyText, type MetricKey } from "../lib/why";

interface Props {
  plan: PlanData;
  features: SiteFeatures;
  daily: Daily;
  pinned: PlanData[]; // other plans in the tray, for the compact comparison
}

/** Source and method of every window metric (spec 5.5), shown on hover/focus like the site attributes. */
const METRIC_SOURCE: Record<MetricKey, string> = {
  sun_pct: "Share of the window's 30-min samples with the Sun's upper limb above the terrain horizon (Sun centre elevation + 0.265° > LOLA horizon mask).",
  longest_dark_h: "Longest continuous run of samples without the Sun in the window (spec 5.5).",
  earth_h_min: "Lowest daily total of hours with the Earth's centre above the horizon mask + 0.5° antenna margin, over the window's UTC days.",
  earth_h_mean: "Mean daily hours with the Earth's centre above the horizon mask + 0.5° antenna margin, over the window's UTC days.",
  longest_comm_gap_h: "Longest continuous run of samples without Earth link in the window.",
  score: "(w1·norm(sun_pct) + w2·(1 − norm(longest_dark_h)) + w3·norm(earth_h_mean)) / (w1 + w2 + w3), min–max normalised over every site's windows of the same length (spec 5.6).",
};
const METRIC_ORIGIN = "Computed by the PolePlanner pipeline from NAIF/SPICE ephemerides (validated against JPL Horizons) and the LOLA horizon mask.";

const UNIT: Record<string, string> = { deg: "°", m: " m", km: " km" };

/** Text of an attribute value; null when there is nothing verifiable to show. */
export function attributeText(a: SiteFeatures["attributes"][number]): string | null {
  if (a.status !== "available" || a.value === null || !a.source?.trim()) return null; // never show an unsourced value
  const v = typeof a.value === "number" ? String(a.value) : a.value;
  return `${v}${a.unit ? (UNIT[a.unit] ?? ` ${a.unit}`) : ""}`;
}

/**
 * Site features card (spec 8.6, 5.10): DEM attributes, window metrics, daily Sun/Earth hours, official nearby
 * features, the why text and a compact comparison with the other pinned plans. Every value carries its source
 * or method as a tooltip (title + accessible description); a value without a source reads "Not available".
 * Pure 2D, independent of the 3D scene (rule 6).
 */
export function SitePanel({ plan, features, daily, pinned }: Props) {
  const others = pinned.filter((p) => p.plan.id !== plan.plan.id);
  const best = bestBadges([plan.metrics, ...others.map((p) => p.metrics)])[0];
  const start = plan.plan.arrival_utc.slice(0, 10);
  const i0 = daily.days.findIndex((d) => d.date === start);
  const days = i0 < 0 ? [] : daily.days.slice(i0, i0 + plan.plan.window_days);

  return (
    <article className="site-panel" data-testid="site-panel" aria-label={STRINGS.sitePanel.aria(plan.site.name)}>
      <section>
        <h3>{STRINGS.sitePanel.location}</h3>
        <dl className="kv">
          {features.attributes.map((a) => {
            const text = attributeText(a);
            return (
              <div key={a.key} data-key={a.key}>
                <dt>{a.label}</dt>
                <dd>
                  <Sourced text={text} source={text ? [a.source, a.method].filter(Boolean).join(" — ") : STRINGS.sitePanel.noSource} />
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section>
        <h3>{STRINGS.sitePanel.metrics}</h3>
        <dl className="kv">
          {METRICS.map(({ key, digits }) => (
            <div key={key} data-key={key}>
              <dt>{STRINGS.metricNames[key]}</dt>
              <dd>
                <Sourced text={plan.metrics[key].toFixed(digits)} source={`${METRIC_SOURCE[key]} ${METRIC_ORIGIN}`} />
              </dd>
            </div>
          ))}
        </dl>
        <p className="why" data-testid="site-why">
          {whyText(plan.metrics, best)}
        </p>
      </section>

      <section>
        <h3>{STRINGS.sitePanel.daily}</h3>
        {days.length ? (
          <table className="daily-table">
            <thead>
              <tr>
                <th scope="col">{STRINGS.sitePanel.day}</th>
                <th scope="col">{STRINGS.sitePanel.sunH}</th>
                <th scope="col">{STRINGS.sitePanel.earthH}</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => {
                const sunH = (d.sun_pct * 24) / 100;
                return (
                  <tr key={d.date} data-date={d.date}>
                    <th scope="row" title={d.date}>
                      {STRINGS.sitePanel.dayN(i + 1)}
                    </th>
                    <td>
                      <Bar value={sunH} kind="sun" />
                      <Sourced text={num(sunH)} source={STRINGS.sitePanel.dailySource(d.date, "Sun")} />
                    </td>
                    <td>
                      <Bar value={d.earth_h} kind="earth" />
                      <Sourced text={num(d.earth_h)} source={STRINGS.sitePanel.dailySource(d.date, "Earth")} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p>{STRINGS.sitePanel.notAvailable}</p>
        )}
      </section>

      <section>
        <h3>{STRINGS.sitePanel.nearby}</h3>
        {features.nearby_features.length ? (
          <ul className="nearby">
            {features.nearby_features.map((f) => (
              <li key={f.name}>
                <Sourced text={`${f.name} (${f.type}) · ${num(f.distance_km)} km`} source={f.source} />
              </li>
            ))}
          </ul>
        ) : (
          <p>{STRINGS.sitePanel.noNearby}</p>
        )}
      </section>

      {others.length > 0 && (
        <section className="wide">
          <h3>{STRINGS.sitePanel.compare}</h3>
          <div className="table-scroll">
          <table className="compare-table" data-testid="site-compare">
            <thead>
              <tr>
                <th scope="col">{STRINGS.sitePanel.plan}</th>
                <th scope="col" title={STRINGS.metricNames.sun_pct}>{STRINGS.sitePanel.short.sun}</th>
                <th scope="col" title={STRINGS.metricNames.longest_dark_h}>{STRINGS.sitePanel.short.dark}</th>
                <th scope="col" title={STRINGS.metricNames.earth_h_min}>{STRINGS.sitePanel.short.earth}</th>
                <th scope="col" title={STRINGS.metricNames.score}>{STRINGS.sitePanel.short.score}</th>
              </tr>
            </thead>
            <tbody>
              {[plan, ...others].map((p) => (
                <tr key={p.plan.id} className={p === plan ? "this-plan" : ""}>
                  <th scope="row">
                    {p === plan ? "▸ " : ""}
                    {p.site.name} · {p.plan.arrival_utc.slice(0, 10)}
                  </th>
                  <td>{p.metrics.sun_pct.toFixed(1)}</td>
                  <td>{p.metrics.longest_dark_h.toFixed(1)}</td>
                  <td>{p.metrics.earth_h_min.toFixed(1)}</td>
                  <td>{p.metrics.score.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>
      )}
    </article>
  );
}

/** A value with its source as tooltip (title) and as accessible description; null text → "Not available". */
function Sourced({ text, source }: { text: string | null; source: string }) {
  return (
    <span className={`sourced${text === null ? " na" : ""}`} tabIndex={0} title={source} aria-description={source} data-source={source}>
      {text ?? STRINGS.sitePanel.notAvailable}
    </span>
  );
}

function Bar({ value, kind }: { value: number; kind: "sun" | "earth" }) {
  return <span className={`hbar ${kind}`} style={{ width: `${(value / 24) * 48}px` }} aria-hidden="true" />;
}
