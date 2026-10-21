import { useEffect, useState } from "react";
import { loadPlanData, type PlanData } from "../lib/planData";
import { STRINGS } from "../lib/strings";
import { useApp } from "../store/appStore";
import { TimeControl } from "../components/TimeControl";
import { Panorama } from "./Panorama";

/**
 * At-the-site section for the selected plan (spec 8.4, 8.6): the horizon panorama, and later the time
 * control (T3.4.b) and the site features panel (T3.4.c). Phase 4 mounts the same pieces in live mode.
 */
export function SiteSection() {
  const selectedPlanId = useApp((s) => s.selectedPlanId);
  const plansById = useApp((s) => s.plansById);
  const sites = useApp((s) => s.sites);
  const data = useApp((s) => s.data);
  const missionTime = useApp((s) => s.missionTime);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = selectedPlanId ? plansById.get(selectedPlanId) : undefined;
    if (!p) return setPlan(null);
    let alive = true;
    loadPlanData(data, p, sites)
      .then((d) => alive && setPlan(d))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [selectedPlanId, plansById, sites, data]);

  if (!selectedPlanId) return <p className="placeholder">{STRINGS.site.empty}</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!plan || plan.plan.id !== selectedPlanId || missionTime === null) return <p className="placeholder">{STRINGS.loading}</p>;
  return (
    <>
      <p className="site-heading">
        <strong>{plan.site.name}</strong> · {STRINGS.arrival} {plan.plan.arrival_utc.slice(0, 10)} · {STRINGS.windowDays(plan.plan.window_days)}
      </p>
      <TimeControl startMs={plan.series.startMs} windowDays={plan.plan.window_days} stepMin={plan.series.stepMin} />
      <Panorama data={plan} timeMs={missionTime} />
    </>
  );
}
