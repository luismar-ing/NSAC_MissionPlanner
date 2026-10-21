import { SyntheticBanner } from "../components/SyntheticBanner";
import { STRINGS } from "../lib/strings";
import { useApp } from "../store/appStore";
import { ConstraintControls } from "../components/ConstraintControls";
import { Calendar } from "./Calendar";

/**
 * Compare mode layout (spec 8.0): constraints and compact calendar on top, comparison tray below.
 * The calendar (T3.2) and the tray panels (T3.3) are filled in by later tasks.
 */
export function CompareView() {
  const manifest = useApp((s) => s.manifest);
  const nSites = useApp((s) => s.sites.length);
  if (!manifest) return null;
  const nDays = (Date.parse(manifest.date_range.arrival_end) - Date.parse(manifest.date_range.arrival_start)) / 86_400_000 + 1;

  return (
    <>
      <SyntheticBanner manifest={manifest} />
      <section className="search-area" aria-label="Search">
        <div className="panel" aria-labelledby="constraints-title">
          <h2 id="constraints-title" className="panel-title">
            {STRINGS.constraintsTitle}
          </h2>
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
        <h2 id="tray-title" className="panel-title">
          {STRINGS.trayTitle}
        </h2>
        <p className="placeholder">{STRINGS.trayEmpty}</p>
      </section>
    </>
  );
}
