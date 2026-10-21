import { useEffect, useState } from "react";
import type { Daily, SiteFeatures } from "../lib/contract";
import { loadPlanData, type PlanData } from "../lib/planData";
import { STRINGS } from "../lib/strings";
import { useApp } from "../store/appStore";
import { TimeControl } from "../components/TimeControl";
import { Panorama } from "./Panorama";
import { SitePanel } from "./SitePanel";

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
  const comparePlans = useApp((s) => s.comparePlans);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [site, setSite] = useState<{ features: SiteFeatures; daily: Daily } | null>(null);
  const [pinned, setPinned] = useState<PlanData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = selectedPlanId ? plansById.get(selectedPlanId) : undefined;
    if (!p) return setPlan(null);
    let alive = true;
    Promise.all([loadPlanData(data, p, sites), data.siteFeatures(p.site_id), data.daily(p.site_id)])
      .then(([d, features, daily]) => {
        if (!alive) return;
        setPlan(d);
        setSite({ features, daily });
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [selectedPlanId, plansById, sites, data]);

  // other pinned plans, for the compact comparison of the site panel (cached by the DataStore)
  useEffect(() => {
    let alive = true;
    Promise.all(comparePlans.map((id) => loadPlanData(data, plansById.get(id)!, sites)))
      .then((list) => alive && setPinned(list))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [comparePlans, plansById, sites, data]);

  if (!selectedPlanId) return <p className="placeholder">{STRINGS.site.empty}</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!plan || !site || plan.plan.id !== selectedPlanId || missionTime === null) return <p className="placeholder">{STRINGS.loading}</p>;
  return (
    <>
      <p className="site-heading">
        <strong>{plan.site.name}</strong> · {STRINGS.arrival} {plan.plan.arrival_utc.slice(0, 10)} · {STRINGS.windowDays(plan.plan.window_days)}
      </p>
      <TimeControl startMs={plan.series.startMs} windowDays={plan.plan.window_days} stepMin={plan.series.stepMin} />
      <Panorama data={plan} timeMs={missionTime} />
      <SitePanel plan={plan} features={site.features} daily={site.daily} pinned={pinned} />
    </>
  );
}
