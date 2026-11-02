import { useEffect, useState } from "react";
import { Credits } from "./views/Credits";
import { ErrorMessage } from "./components/ErrorMessage";
import { describeError } from "./lib/errors";
import { STRINGS } from "./lib/strings";
import { appStore, useApp } from "./store/appStore";
import { Landing } from "./views/Landing";
import { SoundToggle } from "./components/SoundToggle";
import { PlannerView } from "./views/PlannerView";
import { EducatorView } from "./views/EducatorView";

export const APP_TITLE = STRINGS.appTitle;

export function App() {
  const load = useApp((s) => s.load);
  const screen = useApp((s) => s.screen);
  const setScreen = useApp((s) => s.setScreen);
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

  const credits = creditsOpen && <Credits onClose={() => setCreditsOpen(false)} />;

  // the landing page needs no data: it shows at once while the core data loads behind it
  const motionToggle = (
    <button type="button" className="btn ghost motion-toggle" aria-pressed={reducedMotion} title={STRINGS.motion.title} onClick={() => setReducedMotion(!reducedMotion)}>
      {/* a small switch: knob left and outlined while off, knob right and filled while on */}
      <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true">
        <rect x="1" y="1" width="24" height="14" rx="7" fill={reducedMotion ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" />
        <circle cx={reducedMotion ? 18 : 8} cy="8" r="4" fill={reducedMotion ? "var(--color-bg)" : "currentColor"} />
      </svg>
      {STRINGS.motion.reduce}
    </button>
  );

  if (screen === "landing")
    return (
      <div className="app-landing" data-screen="landing">
        <Landing
          tools={
            <>
              <SoundToggle />
              {motionToggle}
            </>
          }
          onCredits={() => setCreditsOpen(true)} />
        {credits}
      </div>
    );

  const status = (
    <>
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
    </>
  );

  // the two modes share one full-screen layout: the 3D scene behind, the mode's own panels over it (A7)
  const tools = (
    <>
      <button type="button" className="btn ghost" title={STRINGS.homeTitle} onClick={() => setScreen("landing")}>
        {STRINGS.home}
      </button>
      <SoundToggle />
      {motionToggle}
      <button type="button" className="btn ghost" onClick={() => setCreditsOpen(true)}>
        {STRINGS.credits.open}
      </button>
    </>
  );
  return (
    <div className="app-planner" data-screen={screen}>
      {load.status === "ready" ? (
        screen === "planner" ? (
          <PlannerView tools={tools} />
        ) : (
          <EducatorView tools={tools} />
        )
      ) : (
        <>
          <header className="planner-top">
            <div className="landing-tools">{tools}</div>
          </header>
          {status}
        </>
      )}
      {credits}
    </div>
  );
}
