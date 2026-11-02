import { SyntheticBanner } from "../components/SyntheticBanner";
import { STRINGS } from "../lib/strings";
import { useApp } from "../store/appStore";
import { ConstraintControls } from "../components/ConstraintControls";
import { Tray } from "../panels2d/Tray";
import { Calendar } from "./Calendar";
import { SiteSection } from "./SiteSection";

/**
 * Compare mode layout (spec 8.0): constraints and compact calendar on top, comparison tray below.
 * The calendar (T3.2) and the tray panels (T3.3) are filled in by later tasks.
 */
export function CompareView() {
  const manifest = useApp((s) => s.manifest);
  const nSites = useApp((s) => s.sites.length);
  const energyModel = useApp((s) => s.energyModel);
  const nlConstraints = useApp((s) => s.nlConstraints);
  const setNlConstraints = useApp((s) => s.setNlConstraints);
  const setEnergyModel = useApp((s) => s.setEnergyModel);
  if (!manifest) return null;
  const nDays = (Date.parse(manifest.date_range.arrival_end) - Date.parse(manifest.date_range.arrival_start)) / 86_400_000 + 1;

  return (
    <>
      <SyntheticBanner manifest={manifest} />
      <section className="search-area" aria-label="Search">
        <div className="panel" aria-labelledby="constraints-title">
          <div className="tray-head">
            <h2 id="constraints-title" className="panel-title">
              {STRINGS.constraintsTitle}
            </h2>
            {/* T6.5.b: the plain-English field, on or off */}
            <button type="button" className="btn ghost" aria-pressed={nlConstraints} title={STRINGS.nl.toggleTitle} onClick={() => setNlConstraints(!nlConstraints)}>
              <span aria-hidden="true">{nlConstraints ? "■" : "□"}</span> {STRINGS.nl.toggle}
            </button>
          </div>
          <p className="visually-hidden">{STRINGS.constraintsPlaceholder}</p>
          <ConstraintControls />
        </div>
        <div className="panel" aria-labelledby="calendar-title">
          <h2 id="calendar-title" className="panel-title">
            {STRINGS.calendarTitle}
          </h2>
          <p className="visually-hidden">{STRINGS.calendarPlaceholder(nSites, nDays)}</p>
          <Calendar />
        </div>
      </section>
      <section className="panel tray-area" aria-labelledby="tray-title">
        <div className="tray-head">
          <h2 id="tray-title" className="panel-title">
            {STRINGS.trayTitle}
          </h2>
          {/* T6.4.b: the illustrative battery lane under every time ribbon, on or off */}
          <button type="button" className="btn ghost" aria-pressed={energyModel} title={STRINGS.energy.title} onClick={() => setEnergyModel(!energyModel)}>
            <span aria-hidden="true">{energyModel ? "■" : "□"}</span> {STRINGS.energy.toggle}
          </button>
        </div>
        <Tray />
      </section>
      <section className="panel site-area" aria-labelledby="site-title">
        <h2 id="site-title" className="panel-title">
          {STRINGS.site.title}
        </h2>
        <SiteSection />
      </section>
    </>
  );
}
