import { STRINGS } from "../lib/strings";
import { openLive } from "../lib/modeTransition";
import { useApp } from "../store/appStore";
import { TimeControl } from "../components/TimeControl";
import { Panorama } from "./Panorama";
import { SitePanel } from "./SitePanel";
import { useSiteData } from "./useSiteData";

/**
 * At-the-site section for the selected plan in compare mode (spec 8.4, 8.6): time control, horizon panorama
 * and site features panel. The live view mounts the same panorama and panel on arrival (T4.3.c).
 */
export function SiteSection() {
  const selectedPlanId = useApp((s) => s.selectedPlanId);
  const missionTime = useApp((s) => s.missionTime);
  const { plan, site, pinned, error } = useSiteData();

  if (!selectedPlanId) return <p className="placeholder">{STRINGS.site.empty}</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!plan || !site || missionTime === null) return <p className="placeholder">{STRINGS.loading}</p>;
  return (
    <>
      <div className="site-heading">
        <p>
          <strong>{plan.site.name}</strong> · {STRINGS.arrival} {plan.plan.arrival_utc.slice(0, 10)} · {STRINGS.windowDays(plan.plan.window_days)}
        </p>
        <button type="button" className="btn" onClick={() => openLive(plan.plan.id)}>
          {STRINGS.live.open}
        </button>
      </div>
      <TimeControl startMs={plan.series.startMs} windowDays={plan.plan.window_days} stepMin={plan.series.stepMin} />
      <Panorama data={plan} timeMs={missionTime} />
      <SitePanel plan={plan} features={site.features} daily={site.daily} pinned={pinned} />
    </>
  );
}
