import { useEffect } from "react";
import { STRINGS } from "./lib/strings";
import { appStore, useApp } from "./store/appStore";
import { CompareView } from "./views/CompareView";

export const APP_TITLE = STRINGS.appTitle;

export function App() {
  const load = useApp((s) => s.load);
  const manifest = useApp((s) => s.manifest);

  useEffect(() => {
    void appStore.getState().loadCore(); // idempotent: StrictMode's double effect does not load twice
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          {STRINGS.appTitle}
          <span className="app-subtitle">{STRINGS.appSubtitle}</span>
        </h1>
        {manifest && <span className="data-badge">{STRINGS.dataBadge(manifest.data_status, manifest.data_version)}</span>}
      </header>
      {(load.status === "idle" || load.status === "loading") && (
        <p className="state-message" aria-busy="true">
          {STRINGS.loading}
        </p>
      )}
      {load.status === "error" && (
        <p className="state-message" role="alert">
          {STRINGS.loadError} {load.message}
        </p>
      )}
      {load.status === "ready" && <CompareView />}
      <footer className="app-footer">{STRINGS.footerCredits}</footer>
    </div>
  );
}
