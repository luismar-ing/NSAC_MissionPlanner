import { useEffect, useState } from "react";
import { SyntheticBanner } from "./components/SyntheticBanner";
import { DataError, DataStore, type Core } from "./lib/data";

export const APP_TITLE = "PolePlanner";

type State = { status: "loading" } | { status: "error"; error: DataError | Error } | { status: "ready"; core: Core };

// Provisional shell (T3.1.a): loads and validates the dataset. The real layout arrives in T3.1.c.
export function App() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    DataStore.forPage()
      .loadCore()
      .then((core) => setState({ status: "ready", core }))
      .catch((error: Error) => setState({ status: "error", error }));
  }, []);

  return (
    <main>
      <h1>{APP_TITLE}</h1>
      {state.status === "loading" && <p aria-busy="true">Loading mission data…</p>}
      {state.status === "error" && (
        <p role="alert">
          Could not load the mission data: {state.error.message}
        </p>
      )}
      {state.status === "ready" && (
        <>
          <SyntheticBanner manifest={state.core.manifest} />
          <p data-testid="data-summary">
            {state.core.sites.length} sites, {state.core.plans.length} mission plans, arrivals{" "}
            {state.core.manifest.date_range.arrival_start} to {state.core.manifest.date_range.arrival_end} (
            {state.core.manifest.data_status} data, version {state.core.manifest.data_version}).
          </p>
        </>
      )}
    </main>
  );
}
