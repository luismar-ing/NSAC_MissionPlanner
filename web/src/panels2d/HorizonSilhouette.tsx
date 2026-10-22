import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { PlanData } from "../lib/planData";
import { sampleAt } from "../lib/planData";
import { azToX, elToY, exaggerationOf, makeProjection, silhouettePath, trackPath } from "../lib/projection";
import type { ElevationScale } from "../lib/scale";
import { STRINGS } from "../lib/strings";
import { COLORS } from "../styles/tokens";

interface Props {
  data: PlanData;
  scale: ElevationScale;
  exaggeration: number | null; // null = fit the shared range
  compareTime: number; // hours since arrival (shared clock)
}

const CARDINALS: [number, string][] = [
  [0, "N"],
  [90, "E"],
  [180, "S"],
  [270, "W"],
];

/**
 * Horizon silhouette of a plan (spec 8.1): terrain mask, Sun and Earth tracks over the window and their
 * position at compareTime. SVG only (rule 7: no WebGL in comparison panels). Visible bodies are filled,
 * blocked ones are hollow (shape + fill, not colour alone).
 */
export const HorizonSilhouette = memo(function HorizonSilhouette({ data, scale, exaggeration, compareTime }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setSize({ w: Math.floor(el.clientWidth), h: Math.floor(el.clientHeight) });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = size;
  const { series, horizon } = data;
  const k = sampleAt(series, compareTime);
  const over = compareTime * 60 >= series.n * series.stepMin; // shared clock past this plan's window
  const p = useMemo(() => (w > 0 && h > 0 ? makeProjection(w, h, scale, exaggeration) : null), [w, h, scale, exaggeration]);
  const paths = useMemo(
    () =>
      p && {
        earth: trackPath(p, series.earthAz, series.earthEl, 2),
        sun: trackPath(p, series.sunAz, series.sunEl, 2),
        terrain: silhouettePath(p, horizon.elev_deg, horizon.az_step_deg),
      },
    [p, series, horizon],
  );

  return (
    <div ref={ref} className="silhouette" data-testid="silhouette" data-sample={k} data-over={over}>
      {p && paths && (
        <svg width={w} height={h} role="img" aria-label={STRINGS.silhouette.aria(data.site.name)}>
          <defs>
            <clipPath id={`clip-${data.plan.id}`}>
              <rect width={w} height={h} />
            </clipPath>
          </defs>
          <g clipPath={`url(#clip-${data.plan.id})`}>
            {/* sky grid: horizon line, elevation ticks every 5°, cardinal directions */}
            {Array.from({ length: Math.floor(p.maxEl / 5) - Math.ceil(p.minEl / 5) + 1 }, (_, i) => (Math.ceil(p.minEl / 5) + i) * 5).map((e) => (
              <g key={e}>
                <line className={e === 0 ? "sil-grid sil-horizon" : "sil-grid"} x1={0} x2={w} y1={elToY(p, e)} y2={elToY(p, e)} stroke={COLORS.border} strokeWidth={1} strokeDasharray={e === 0 ? "4 3" : undefined} />
                <text className="sil-label" x={4} y={elToY(p, e) - 3} fill={COLORS.textMuted} fontSize={10}>
                  {e}°
                </text>
              </g>
            ))}
            {/* tracks over the whole window */}
            {/* the Earth track is dashed and the Sun track solid: they differ by shape, not only colour (spec 9, T5.2.b) */}
            <path className="sil-track earth" d={paths.earth} fill="none" stroke={COLORS.earth} strokeWidth={1.5} strokeOpacity={0.55} strokeDasharray="6 3" />
            <path className="sil-track sun" d={paths.sun} fill="none" stroke={COLORS.sun} strokeWidth={1.5} strokeOpacity={0.55} />
            {/* terrain on top of the tracks: a body behind the terrain is hidden by it, as in reality */}
            <path className="sil-terrain" d={paths.terrain} fill={COLORS.terrain} stroke={COLORS.borderStrong} strokeWidth={1} />
            {/* cardinal directions and the actual vertical exaggeration, above the terrain */}
            {CARDINALS.map(([az, label]) => (
              <text className="sil-cardinal" key={label} x={Math.min(w - 10, azToX(p, az) + 3)} y={h - 4} fill={COLORS.text} fontSize={11}>
                {label}
              </text>
            ))}
            <text className="sil-label" x={w - 4} y={12} textAnchor="end" fill={COLORS.textMuted} fontSize={10} data-testid="exaggeration">
              {STRINGS.silhouette.shown(exaggerationOf(p))}
            </text>
            {/* bodies at compareTime */}
            {over ? (
              <text className="sil-label" x={w / 2} y={h / 2} textAnchor="middle" fill={COLORS.textMuted} fontSize={12}>
                {STRINGS.scrubber.after}
              </text>
            ) : (
              <>
                <Earth x={azToX(p, series.earthAz[k])} y={elToY(p, series.earthEl[k])} azel={[series.earthAz[k], series.earthEl[k]]} visible={series.earthVis[k] === 1} />
                <Sun x={azToX(p, series.sunAz[k])} y={elToY(p, series.sunEl[k])} azel={[series.sunAz[k], series.sunEl[k]]} visible={series.sunVis[k] === 1} />
              </>
            )}
          </g>
        </svg>
      )}
    </div>
  );
});

function Sun({ x, y, azel, visible }: { x: number; y: number; azel: [number, number]; visible: boolean }) {
  const rays = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
  return (
    <g className="body-marker sun" data-testid="sun-marker" data-az={azel[0]} data-el={azel[1]} data-visible={visible} transform={`translate(${x},${y})`}>
      {rays.map((a) => (
        <line className="sun-ray" key={a} x1={Math.cos(a) * 7} y1={Math.sin(a) * 7} x2={Math.cos(a) * 10} y2={Math.sin(a) * 10} stroke={COLORS.sun} strokeWidth={1.5} />
      ))}
      <circle className="body-disc" r={5} fill={visible ? COLORS.sun : COLORS.bg} stroke={COLORS.sun} strokeWidth={2} />
    </g>
  );
}

function Earth({ x, y, azel, visible }: { x: number; y: number; azel: [number, number]; visible: boolean }) {
  return (
    <g className="body-marker earth" data-testid="earth-marker" data-az={azel[0]} data-el={azel[1]} data-visible={visible} transform={`translate(${x},${y})`}>
      <circle className="earth-ring" r={9} fill="none" stroke={COLORS.earth} strokeWidth={1} strokeOpacity={0.7} />
      <circle className="body-disc" r={5.5} fill={visible ? COLORS.earth : COLORS.bg} stroke={COLORS.earth} strokeWidth={2} />
    </g>
  );
}
