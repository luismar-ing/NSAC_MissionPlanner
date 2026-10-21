import { useEffect } from "react";
import { SyntheticBanner } from "./components/SyntheticBanner";
import { appStore, useApp } from "./store/appStore";

export const APP_TITLE = "PolePlanner";

// Provisional shell: loads the dataset through the global store. The real layout arrives in T3.1.c.
export function App() {
  const load = useApp((s) => s.load);
  const manifest = useApp((s) => s.manifest);
  const nSites = useApp((s) => s.sites.length);
  const nPlans = useApp((s) => s.plans.length);

  useEffect(() => {
    void appStore.getState().loadCore(); // idempotent: StrictMode's double effect does not load twice
  }, []);

  return (
    <main>
      <h1>{APP_TITLE}</h1>
      {(load.status === "idle" || load.status === "loading") && <p aria-busy="true">Loading mission data…</p>}
      {load.status === "error" && <p role="alert">Could not load the mission data: {load.message}</p>}
      {load.status === "ready" && manifest && (
        <>
          <SyntheticBanner manifest={manifest} />
          <p data-testid="data-summary">
            {nSites} sites, {nPlans} mission plans, arrivals {manifest.date_range.arrival_start} to{" "}
            {manifest.date_range.arrival_end} ({manifest.data_status} data, version {manifest.data_version}).
          </p>
        </>
      )}
    </main>
  );
}
