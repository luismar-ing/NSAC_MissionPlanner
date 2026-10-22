import { useEffect, useMemo, useState } from "react";
import { loadPlanData, type PlanData } from "../lib/planData";
import { relativeLabel } from "../lib/ribbon";
import { sharedElevationScale } from "../lib/scale";
import { STRINGS } from "../lib/strings";
import { useApp } from "../store/appStore";
import { HorizonSilhouette } from "./HorizonSilhouette";
import { TimeRibbon } from "./TimeRibbon";

/** Hours since arrival of the live plan's mission clock: the relative clock the thumbnails follow (≥ 0). */
export function liveRelativeHours(missionTime: number | null, arrivalMs: number | null): number {
  if (missionTime === null || arrivalMs === null) return 0;
  return Math.max(0, (missionTime - arrivalMs) / 3_600_000);
}

/**
 * Live mode's strip of the other pinned plans (spec 8.0): small 2D panels (silhouette with the Sun and Earth,
 * time ribbon, score), still live and linked: they follow the live plan's clock as "hours since arrival", the
 * same relative clock the tray uses, so each one shows its own site at the same moment of its stay. SVG only.
 */
export function ThumbnailStrip() {
  const ids = useApp((s) => s.comparePlans);
  const selectedPlanId = useApp((s) => s.selectedPlanId);
  const plansById = useApp((s) => s.plansById);
  const sites = useApp((s) => s.sites);
  const data = useApp((s) => s.data);
  const missionTime = useApp((s) => s.missionTime);
  const exaggeration = useApp((s) => s.exaggeration);
  const [loaded, setLoaded] = useState<PlanData[]>([]);

  useEffect(() => {
    let alive = true;
    Promise.all(ids.map((id) => loadPlanData(data, plansById.get(id)!, sites)))
      .then((list) => alive && setLoaded(list))
      .catch(() => {
        /* the tray reports load errors; the strip just stays empty */
      });
    return () => {
      alive = false;
    };
  }, [ids, data, plansById, sites]);

  const key = loaded.map((p) => p.plan.id).join(",");
  // same vertical scale as the tray (computed over every pinned plan), so the thumbnails compare like the panels
  const scale = useMemo(() => sharedElevationScale(loaded), [key]);
  const selected = selectedPlanId ? plansById.get(selectedPlanId) : undefined;
  const hours = liveRelativeHours(missionTime, selected ? Date.parse(selected.arrival_utc) : null);
  const others = loaded.filter((p) => p.plan.id !== selectedPlanId);

  return (
    <aside className="thumb-strip" aria-label={STRINGS.thumbs.aria} data-testid="thumb-strip">
      <p className="thumb-clock">
        <span>{STRINGS.thumbs.title}</span>
        <span className="mono" data-testid="thumb-clock">
          {relativeLabel(Math.floor(hours * 60), 1)}
        </span>
      </p>
      {others.length === 0 && <p className="placeholder">{STRINGS.thumbs.empty}</p>}
      <ul className="thumb-list">
        {others.map((p) => (
          <li key={p.plan.id}>
            <article className="thumb" data-testid="thumb" data-plan-id={p.plan.id} aria-label={STRINGS.panel.aria(p.site.name, p.plan.arrival_utc.slice(0, 10), p.plan.window_days)}>
              <header className="thumb-head">
                <span className="plan-site">{p.site.name}</span>
                <span className="plan-meta">
                  {p.plan.arrival_utc.slice(0, 10)} · {STRINGS.windowDays(p.plan.window_days)}
                </span>
              </header>
              <div className="thumb-silhouette">
                <HorizonSilhouette data={p} scale={scale} exaggeration={exaggeration} compareTime={hours} />
              </div>
              <TimeRibbon series={p.series} compareTime={hours} />
              <p className="thumb-score">
                {STRINGS.thumbs.score} <span className="mono">{p.metrics.score.toFixed(2)}</span>
              </p>
            </article>
          </li>
        ))}
      </ul>
    </aside>
  );
}
