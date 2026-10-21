import { STRINGS } from "../lib/strings";
import { useApp, type Constraints } from "../store/appStore";

interface Spec {
  key: keyof Constraints;
  label: string;
  hint: string;
  unit: string;
  min: number;
  max: (L: number) => number;
  step: number;
  initial: (L: number) => number;
}

/** Spec 5.6: X = minimum sunlight, Y = maximum continuous darkness, Z = minimum daily Earth contact. */
const CONTROLS: Spec[] = [
  { key: "minSunPct", label: STRINGS.constraints.sun, hint: STRINGS.constraints.sunHint, unit: "%", min: 0, max: () => 100, step: 1, initial: () => 70 },
  { key: "maxDarkH", label: STRINGS.constraints.dark, hint: STRINGS.constraints.darkHint, unit: "h", min: 0, max: (L) => 24 * L, step: 1, initial: (L) => Math.min(48, 24 * L) },
  { key: "minEarthH", label: STRINGS.constraints.earth, hint: STRINGS.constraints.earthHint, unit: "h/day", min: 0, max: () => 24, step: 0.5, initial: () => 8 },
];

/** Marks the start of a constraint update so the calendar can measure control → repaint (spec 8.7). */
export function markConstraintChange(): void {
  performance.mark("constraint-change");
}

export function ConstraintControls() {
  const constraints = useApp((s) => s.constraints);
  const setConstraints = useApp((s) => s.setConstraints);
  const L = useApp((s) => s.selectedWindow);
  const validCount = useApp((s) => s.validCount);

  const update = (patch: Partial<Constraints>) => {
    markConstraintChange();
    setConstraints(patch);
  };

  return (
    <div className="constraints">
      {CONTROLS.map((c) => {
        const value = constraints[c.key];
        const enabled = value !== null;
        const max = c.max(L);
        const shown = enabled ? Math.min(value, max) : c.initial(L);
        const id = `constraint-${c.key}`;
        return (
          <div key={c.key} className={`constraint ${enabled ? "on" : "off"}`}>
            <label className="constraint-toggle">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => update({ [c.key]: e.target.checked ? shown : null })}
                aria-describedby={`${id}-hint`}
              />
              <span>{c.label}</span>
              <output htmlFor={id} className="constraint-value">
                {enabled ? `${shown} ${c.unit}` : STRINGS.constraints.off}
              </output>
            </label>
            <input
              id={id}
              type="range"
              min={c.min}
              max={max}
              step={c.step}
              value={shown}
              disabled={!enabled}
              aria-label={c.label}
              aria-valuetext={`${shown} ${c.unit}`}
              onChange={(e) => update({ [c.key]: Number(e.target.value) })}
            />
            <small id={`${id}-hint`} className="constraint-hint">
              {c.hint}
            </small>
          </div>
        );
      })}
      {validCount && (
        <p className="constraint-count" role="status" aria-live="polite">
          {STRINGS.constraints.count(validCount.valid, validCount.total, L)}
        </p>
      )}
    </div>
  );
}
