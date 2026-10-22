import { STRINGS } from "../lib/strings";
import { scaleSummary, type ScaleMode } from "./scale";

/** Always-visible scale notice of the 3D scene (spec 5.9): sizes exaggerated or real, directions exact. */
export function ScaleIndicator({ mode }: { mode: ScaleMode }) {
  const s = scaleSummary(mode);
  return (
    <div className="scale-indicator" data-testid="scale-indicator" role="note" title={STRINGS.scale.detail(mode.kmPerUnit)}>
      <span className="scale-indicator-tag">{s.exaggerated ? STRINGS.scale.notToScale : STRINGS.scale.realScale}</span>
      <span>{s.exaggerated ? STRINGS.scale.exaggerated(s.factor) : STRINGS.scale.local}</span>
    </div>
  );
}
