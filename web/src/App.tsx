import { useEffect, useState } from "react";
import { Credits } from "./views/Credits";
import { ErrorMessage } from "./components/ErrorMessage";
import { describeError } from "./lib/errors";
import { STRINGS } from "./lib/strings";
import { appStore, useApp } from "./store/appStore";
import { CompareView } from "./views/CompareView";
import { LiveView } from "./views/LiveView";

export const APP_TITLE = STRINGS.appTitle;

export function App() {
  const load = useApp((s) => s.load);
  const manifest = useApp((s) => s.manifest);
  const viewMode = useApp((s) => s.viewMode);
  const reducedMotion = useApp((s) => s.reducedMotion);
  const setReducedMotion = useApp((s) => s.setReducedMotion);
  const [creditsOpen, setCreditsOpen] = useState(false);

  // the whole page follows the reduced-motion choice (CSS transitions and animations, see tokens.css)
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reducedMotion);
  }, [reducedMotion]);

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
        <div className="header-tools">
          <button type="button" className="btn ghost motion-toggle" aria-pressed={reducedMotion} title={STRINGS.motion.title} onClick={() => setReducedMotion(!reducedMotion)}>
            <span aria-hidden="true">{reducedMotion ? "■" : "□"}</span> {STRINGS.motion.reduce}
          </button>
          {manifest && <span className="data-badge">{STRINGS.dataBadge(manifest.data_status, manifest.data_version)}</span>}
        </div>
      </header>
      {(load.status === "idle" || load.status === "loading") && (
        <p className="state-message" aria-busy="true">
          {STRINGS.loading}
        </p>
      )}
      {load.status === "error" && (
        <div className="state-message">
          <ErrorMessage what={STRINGS.loadError} info={describeError(load.error)} onRetry={() => void appStore.getState().loadCore()} />
        </div>
      )}
      {load.status === "ready" && (viewMode === "live" ? <LiveView /> : <CompareView />)}
      <footer className="app-footer">
        <span>{STRINGS.footerCredits}</span>{" "}
        <button type="button" className="link-btn" onClick={() => setCreditsOpen(true)}>
          {STRINGS.credits.open}
        </button>
      </footer>
      {creditsOpen && <Credits onClose={() => setCreditsOpen(false)} />}
    </div>
  );
}
