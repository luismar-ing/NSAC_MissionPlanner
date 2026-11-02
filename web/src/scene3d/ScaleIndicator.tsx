import { STRINGS } from "../lib/strings";
import { scaleSummary, type ScaleMode } from "./scale";

/** Always-visible scale notice of the 3D scene (spec 5.9): sizes exaggerated or real, directions exact. */
/** `compact`: one short chip (the journey of the Mission Planner); the sentence goes to the tooltip. */
export function ScaleIndicator({ mode, compact = false }: { mode: ScaleMode; compact?: boolean }) {
  const s = scaleSummary(mode);
  const sentence = s.exaggerated ? STRINGS.scale.exaggerated(s.factor) : STRINGS.scale.local;
  if (compact)
    return (
      <p className="scene-chip" data-testid="scale-indicator" role="note" title={`${sentence}. ${STRINGS.scale.detail(mode.kmPerUnit)}`}>
        <span className="scale-indicator-tag">{s.exaggerated ? STRINGS.scale.notToScale : STRINGS.scale.realScale}</span>
        {s.exaggerated && <span aria-hidden="true">{STRINGS.scale.factor(s.factor)}</span>}
        <span className="visually-hidden">{sentence}</span>
      </p>
    );
  return (
    <div className="scale-indicator" data-testid="scale-indicator" role="note" title={STRINGS.scale.detail(mode.kmPerUnit)}>
      <span className="scale-indicator-tag">{s.exaggerated ? STRINGS.scale.notToScale : STRINGS.scale.realScale}</span>
      <span>{s.exaggerated ? STRINGS.scale.exaggerated(s.factor) : STRINGS.scale.local}</span>
    </div>
  );
}
