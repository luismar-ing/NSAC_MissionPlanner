import { STRINGS } from "../lib/strings";
import { useApp, type Screen } from "../store/appStore";

const MODES: { screen: Exclude<Screen, "landing">; text: { name: string; title: string; body: string } }[] = [
  { screen: "educator", text: STRINGS.landing.educator },
  { screen: "planner", text: STRINGS.landing.planner },
];

/** Landing page (decision A7, design A1): pick Educator or Mission Planner. Styled in TR.1.a. */
export function Landing() {
  const setScreen = useApp((s) => s.setScreen);
  return (
    <main className="landing" data-testid="landing">
      <p className="landing-kicker">{STRINGS.landing.kicker}</p>
      <h1 className="landing-title">{STRINGS.landing.title}</h1>
      <nav className="landing-modes" aria-label={STRINGS.landing.choose}>
        {MODES.map(({ screen, text }) => (
          <button key={screen} type="button" className="mode-card" data-mode={screen} onClick={() => setScreen(screen)}>
            <span className="mode-card-name">{text.name}</span>
            <span className="mode-card-title">{text.title}</span>
            <span className="mode-card-body">{text.body}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
