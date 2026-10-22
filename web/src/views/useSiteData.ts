import { useEffect, useState } from "react";
import type { Daily, SiteFeatures } from "../lib/contract";
import { loadPlanData, type PlanData } from "../lib/planData";
import { useApp } from "../store/appStore";

export interface SiteData {
  plan: PlanData | null; // selected plan with its series and horizon (null while loading or with no selection)
  site: { features: SiteFeatures; daily: Daily } | null;
  pinned: PlanData[]; // the plans in the tray, for the site panel's compact comparison
  error: unknown; // null when there is none
  retry(): void;
}

/**
 * Data of the selected plan's site (spec 8.4, 8.6), shared by the compare view's site section and the live
 * view's arrival (T4.3.c): plan series and horizon, site features, daily aggregates and the pinned plans.
 * Everything is cached by the DataStore, so mounting it in both views loads each file once.
 */
export function useSiteData(): SiteData {
  const selectedPlanId = useApp((s) => s.selectedPlanId);
  const plansById = useApp((s) => s.plansById);
  const sites = useApp((s) => s.sites);
  const data = useApp((s) => s.data);
  const comparePlans = useApp((s) => s.comparePlans);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [site, setSite] = useState<{ features: SiteFeatures; daily: Daily } | null>(null);
  const [pinned, setPinned] = useState<PlanData[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

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
      .catch((e: unknown) => alive && setError(e));
    return () => {
      alive = false;
    };
  }, [selectedPlanId, plansById, sites, data, attempt]);

  useEffect(() => {
    let alive = true;
    Promise.all(comparePlans.map((id) => loadPlanData(data, plansById.get(id)!, sites)))
      .then((list) => alive && setPinned(list))
      .catch((e: unknown) => alive && setError(e));
    return () => {
      alive = false;
    };
  }, [comparePlans, plansById, sites, data, attempt]);

  // a plan that is still loading after a change of selection is not shown as the new one
  const current = plan && plan.plan.id === selectedPlanId ? plan : null;
  const retry = () => {
    setError(null);
    setAttempt((n) => n + 1);
  };
  return { plan: current, site: current ? site : null, pinned, error, retry };
}
