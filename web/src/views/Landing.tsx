import type { ReactNode } from "react";
import { SpotlightCard } from "../components/SpotlightCard";
import { STRINGS } from "../lib/strings";
import { useApp, type Screen } from "../store/appStore";

const MODES: { screen: Exclude<Screen, "landing">; text: { name: string; title: string; body: string } }[] = [
  { screen: "educator", text: STRINGS.landing.educator },
  { screen: "planner", text: STRINGS.landing.planner },
];

/**
 * Landing page (decision A7, design A1): the Moon turning behind a short headline and two mode cards.
 * Needs no mission data, so it shows at once. `backdrop` is the live Moon (TR.1.b); until it is ready, or
 * without WebGL, the static Moon image stands in. `tools` holds the header controls (sound, motion).
 */
export function Landing({ backdrop, tools, onCredits }: { backdrop?: ReactNode; tools?: ReactNode; onCredits(): void }) {
  const setScreen = useApp((s) => s.setScreen);
  return (
    <main className="landing" data-testid="landing">
      <div className="landing-backdrop" aria-hidden="true">
        <div className="landing-moon-static" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}textures/moon_2k.jpg)` }} />
        {backdrop}
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
          <SpotlightCard key={screen} className="mode-card" data-mode={screen} onSelect={() => setScreen(screen)}>
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
        <span>{STRINGS.landing.credit}</span>{" "}
        <button type="button" className="link-btn" onClick={onCredits}>
          {STRINGS.credits.open}
        </button>
      </footer>
    </main>
  );
}
