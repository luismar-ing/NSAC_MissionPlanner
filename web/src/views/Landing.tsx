import { useCallback, useEffect, useState, type ReactNode } from "react";
import { SpotlightCard } from "../components/SpotlightCard";
import { MoonBackdrop } from "../scene3d/MoonBackdrop";
import { ambient } from "../lib/ambient";
import { STRINGS } from "../lib/strings";
import { useApp, type Screen } from "../store/appStore";

const MODES: { screen: Exclude<Screen, "landing">; text: { name: string; title: string; body: string } }[] = [
  { screen: "educator", text: STRINGS.landing.educator },
  { screen: "planner", text: STRINGS.landing.planner },
];

/**
 * Landing page (decision A7, design A1): the Moon turning behind a short headline and two mode cards.
 * Needs no mission data, so it shows at once. The live Moon (TR.1.b) replaces the static image once its
 * texture is on the sphere; without WebGL the static image stays. `tools` holds the header controls.
 */
export function Landing({ tools, onCredits }: { tools?: ReactNode; onCredits(): void }) {
  const setScreen = useApp((s) => s.setScreen);
  const [moonReady, setMoonReady] = useState(false);
  const ready = useCallback(() => setMoonReady(true), []);
  // the landing page is the first thing a visitor sees: its time is measured by scripts/perf.mjs (spec 8.7)
  useEffect(() => {
    if (!performance.getEntriesByName("landing-ready").length) performance.mark("landing-ready");
  }, []);
  return (
    <main className="landing" data-testid="landing">
      <div className="landing-backdrop" aria-hidden="true" data-moon={moonReady ? "live" : "static"}>
        <div className="landing-moon-static" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}textures/moon_2k.jpg)` }} />
        <MoonBackdrop onReady={ready} />
        <div className="landing-shade" />
      </div>
      <header className="landing-bar">
        <span className="landing-wordmark">{STRINGS.appTitle}</span>
        <div className="landing-tools">{tools}</div>
      </header>
      <div className="landing-copy">
        <p className="landing-kicker">{STRINGS.landing.kicker}</p>
        <h1 className="landing-title">{STRINGS.landing.title}</h1>
      </div>
      <nav className="landing-modes" aria-label={STRINGS.landing.choose}>
        {MODES.map(({ screen, text }) => (
          <SpotlightCard key={screen} className="mode-card" data-mode={screen} onSelect={() => {
              ambient.startFromGesture(); // choosing a mode is the gesture that may start the music
              setScreen(screen);
            }}>
            <span className="mode-card-name">{text.name}</span>
            <span className="mode-card-title">{text.title}</span>
            <span className="mode-card-body">{text.body}</span>
            <span className="mode-card-enter">
              {STRINGS.landing.enter}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </SpotlightCard>
        ))}
      </nav>
      <footer className="landing-foot">
        <span>{STRINGS.footerCredits}</span>{" "}
        <button type="button" className="link-btn" onClick={onCredits}>
          {STRINGS.credits.open}
        </button>
      </footer>
    </main>
  );
}
