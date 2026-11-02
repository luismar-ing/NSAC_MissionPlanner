import { useState } from "react";
import { createPortal } from "react-dom";
import { Drawer } from "../components/Drawer";
import { ErrorMessage } from "../components/ErrorMessage";
import { describeError } from "../lib/errors";
import type { PlanData } from "../lib/planData";
import { STRINGS } from "../lib/strings";
import { bestBadges, fmtMetric, METRICS } from "../lib/why";
import { MetricsBox } from "../panels2d/MetricsBox";
import { TimeRibbon } from "../panels2d/TimeRibbon";
import { useApp } from "../store/appStore";
import { Panorama } from "./Panorama";
import { SitePanel } from "./SitePanel";
import { useSiteData } from "./useSiteData";

/**
 * Arrival at the site in the Mission Planner (decision A7: layout of B3, style of A3). The 3D sky stays on top;
 * a metrics card sits on the right (spec 8.6, with "Site details" for the full panel: location, daily values,
 * nearby features, each with its source); the bottom console holds the 360° horizon panorama (8.4, level A)
 * and the time ribbon on the mission clock, and the metrics against the other pinned plans (★ = best).
 * `display: contents`: its parts take their places in the journey's grid (MissionStage).
 */
export function SiteLayout() {
  const missionTime = useApp((s) => s.missionTime);
  const compareTime = useApp((s) => s.compareTime);
  const { plan, site, pinned, error, retry } = useSiteData();
  const [details, setDetails] = useState(false);
  const levelB = useApp((s) => s.levelB);
  const setLevelB = useApp((s) => s.setLevelB);
  const surfaceView = useApp((s) => s.surfaceView);
  const setSurfaceView = useApp((s) => s.setSurfaceView);
  const others = plan ? pinned.filter((p) => p.plan.id !== plan.plan.id) : [];
  const best = plan
    ? bestBadges([plan.metrics, ...others.map((p) => p.metrics)])[0]
    : new Set<never>();

  return (
    <section
      className="site-layout"
      data-testid="live-site"
      aria-labelledby="live-site-title"
    >
      <h3 id="live-site-title" className="visually-hidden">
        {STRINGS.site.title}
      </h3>
      {error !== null && (
        <div className="site-console glass">
          <ErrorMessage
            what={STRINGS.errors.site}
            info={describeError(error)}
            onRetry={retry}
          />
        </div>
      )}
      {error === null && (!plan || !site || missionTime === null) && (
        <p className="site-console glass placeholder">{STRINGS.loading}</p>
      )}
      {plan && site && missionTime !== null && (
        <>
          <aside
            className="site-card glass"
            aria-label={STRINGS.siteLayout.card}
          >
            <p className="site-card-label">{STRINGS.siteLayout.card}</p>
            <MetricsBox metrics={plan.metrics} best={best} />
            <div className="site-card-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setDetails(true)}
              >
                {STRINGS.siteLayout.details}
              </button>
              {/* T6.1.c: Level B can be turned off; the MVP scene and every 2D view stay as they are */}
              <button
                type="button"
                className="btn ghost"
                aria-pressed={levelB}
                title={STRINGS.siteLayout.levelBTitle}
                onClick={() => setLevelB(!levelB)}
              >
                <span aria-hidden="true">{levelB ? "■" : "□"}</span>{" "}
                {STRINGS.siteLayout.levelB}
              </button>
              {/* TR.3.a: the first-person sky (Level B) or the aerial framing of the site */}
              {levelB && (
                <button
                  type="button"
                  className="btn ghost"
                  title={STRINGS.siteLayout.standTitle}
                  onClick={() => setSurfaceView(!surfaceView)}
                >
                  {surfaceView
                    ? STRINGS.siteLayout.aerial
                    : STRINGS.siteLayout.stand}
                </button>
              )}
            </div>
          </aside>
          <div className="site-console glass">
            <div className="site-console-main">
              <Panorama data={plan} timeMs={missionTime} />
              <TimeRibbon series={plan.series} compareTime={compareTime} />
            </div>
            {others.length > 0 && <CompareTable plan={plan} others={others} />}
          </div>
          {/* rendered in the Mission Planner's root layer: above the journey panels (which may scroll) and
              below the tool bar, like the search panel */}
          {details &&
            createPortal(
              <Drawer
                title={STRINGS.siteLayout.detailsTitle(plan.site.name)}
                closeLabel={STRINGS.planner.closeSearch}
                onClose={() => setDetails(false)}
                testId="site-details"
              >
                <SitePanel
                  plan={plan}
                  features={site.features}
                  daily={site.daily}
                  pinned={pinned}
                />
              </Drawer>,
              document.querySelector(".planner") ?? document.body,
            )}
        </>
      )}
    </section>
  );
}

/** Every metric of this plan against the other pinned ones; ★ marks the best of each row (shape, not colour). */
function CompareTable({
  plan,
  others,
}: {
  plan: PlanData;
  others: PlanData[];
}) {
  const rows = [plan, ...others];
  const best = bestBadges(rows.map((p) => p.metrics));
  return (
    <div className="site-compare-mini table-scroll">
      <table className="compare-table" data-testid="site-compare-mini">
        <caption className="site-card-label">
          {STRINGS.siteLayout.compare}
        </caption>
        <thead>
          <tr>
            <th scope="col">{STRINGS.sitePanel.short.metric}</th>
            {rows.map((p, i) => (
              <th
                key={p.plan.id}
                scope="col"
                className={i === 0 ? "this-plan" : ""}
                title={`${p.site.name} · ${p.plan.arrival_utc.slice(0, 10)}`}
              >
                {i === 0 ? STRINGS.siteLayout.thisPlan : p.site.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {METRICS.map(({ key }) => (
            <tr key={key}>
              <th scope="row">{STRINGS.metricNames[key]}</th>
              {rows.map((p, i) => (
                <td key={p.plan.id} data-best={best[i].has(key)}>
                  {fmtMetric(key, p.metrics[key])}
                  {best[i].has(key) && (
                    <span aria-label={STRINGS.panel.best}> ★</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
