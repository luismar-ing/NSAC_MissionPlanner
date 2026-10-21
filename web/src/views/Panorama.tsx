import { useEffect, useMemo, useRef, useState } from "react";
import type { PlanData } from "../lib/planData";
import { angularSizePx, azToX, centredOn, elToY, exaggerationOf, makeProjection, silhouettePath, trackPath, type Projection } from "../lib/projection";
import { STRINGS } from "../lib/strings";
import { COLORS } from "../styles/tokens";

/** Angular diameters drawn to scale (spec 8.4). */
export const SUN_DIAMETER_DEG = 0.53;
export const EARTH_DIAMETER_DEG = 1.9;

const HEIGHT = 260;
const FOVS = [360, 120, 60] as const;
const CENTRES = ["N", "E", "S", "W", "sun", "earth"] as const;
type Centre = (typeof CENTRES)[number];
const CENTRE_AZ: Record<string, number> = { N: 0, E: 90, S: 180, W: 270 };

/** Disc radii in px for a projection: diameters 0.53° and 1.9° at the horizontal angular scale. */
export function discRadii(p: Projection): { sun: number; earth: number } {
  return { sun: angularSizePx(p, SUN_DIAMETER_DEG) / 2, earth: angularSizePx(p, EARTH_DIAMETER_DEG) / 2 };
}

/** Elevation range of the panorama: −3° to 12° (spec 8.4), extended down if the terrain goes lower. */
export function panoramaRange(elevDeg: number[]): { minDeg: number; maxDeg: number } {
  return { minDeg: Math.min(-3, Math.floor(Math.min(...elevDeg)) - 0.5), maxDeg: 12 };
}

/** Sample of the plan window at an absolute instant (clamped), and whether the instant is inside the window. */
export function sampleAtTime(data: PlanData, timeMs: number): { k: number; inside: boolean } {
  const s = data.series;
  const raw = Math.floor((timeMs - s.startMs) / (s.stepMin * 60_000));
  return { k: Math.min(s.n - 1, Math.max(0, raw)), inside: raw >= 0 && raw < s.n };
}

interface Props {
  data: PlanData;
  timeMs: number; // absolute instant (epoch ms, UTC): missionTime
}

/**
 * 360° horizon panorama at the site, level A (spec 8.4): terrain from elev_deg, the Sun and Earth discs at
 * angular scale with their tracks for the day or the window, recentrable on any bearing, with the UTC time,
 * az/el of both bodies and the light / link status always shown. SVG only.
 */
export function Panorama({ data, timeMs }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [fov, setFov] = useState<number>(360);
  const [centre, setCentre] = useState<Centre>("S");
  const [exaggeration, setExaggeration] = useState<number | null>(null);
  const [tracks, setTracks] = useState<"day" | "window">("day");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setW(Math.floor(el.clientWidth));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { series, horizon } = data;
  const { k, inside } = sampleAtTime(data, timeMs);
  const sun = { az: series.sunAz[k], el: series.sunEl[k], vis: series.sunVis[k] === 1 };
  const earth = { az: series.earthAz[k], el: series.earthEl[k], vis: series.earthVis[k] === 1 };
  const centreAz = centre === "sun" ? sun.az : centre === "earth" ? earth.az : CENTRE_AZ[centre];
  const range = useMemo(() => panoramaRange(horizon.elev_deg), [horizon]);
  const p = w > 0 ? makeProjection(w, HEIGHT, range, exaggeration, centredOn(centreAz, fov), fov) : null;

  // tracks: the current UTC day of the window, or the whole window
  const perDay = (24 * 60) / series.stepMin;
  const dayStart = Math.floor(k / perDay) * perDay;
  const [from, to] = tracks === "day" ? [dayStart, Math.min(series.n, dayStart + perDay)] : [0, series.n];
  const discs = p ? discRadii(p) : null;
  const t = new Date(series.startMs + k * series.stepMin * 60_000).toISOString();
  const azTicks = p ? Array.from({ length: 24 }, (_, i) => i * 15).filter((a) => azToX(p, a) <= p.width) : [];

  return (
    <div className="panorama" data-testid="panorama" data-sample={k}>
      <div className="panorama-controls">
        <Segmented label={STRINGS.panorama.centre} value={centre} options={CENTRES.map((c) => [c, STRINGS.panorama.centres[c]])} onChange={(v) => setCentre(v as Centre)} />
        <Segmented label={STRINGS.panorama.fov} value={String(fov)} options={FOVS.map((f) => [String(f), `${f}°`])} onChange={(v) => setFov(Number(v))} />
        <Segmented
          label={STRINGS.silhouette.exaggerationLabel}
          value={String(exaggeration)}
          options={[
            ["null", STRINGS.silhouette.fit],
            ["10", "×10"],
            ["20", "×20"],
          ]}
          onChange={(v) => setExaggeration(v === "null" ? null : Number(v))}
        />
        <Segmented
          label={STRINGS.panorama.tracks}
          value={tracks}
          options={[
            ["day", STRINGS.panorama.day],
            ["window", STRINGS.panorama.window],
          ]}
          onChange={(v) => setTracks(v as "day" | "window")}
        />
      </div>
      <div ref={ref} className="panorama-canvas">
        {p && discs && (
          <svg width={w} height={HEIGHT} role="img" aria-label={STRINGS.panorama.aria(data.site.name)}>
            {/* elevation grid every 3°, azimuth ticks every 15° with cardinal letters */}
            {Array.from({ length: Math.floor(p.maxEl / 3) - Math.ceil(p.minEl / 3) + 1 }, (_, i) => (Math.ceil(p.minEl / 3) + i) * 3).map((e) => (
              <g key={e}>
                <line x1={0} x2={w} y1={elToY(p, e)} y2={elToY(p, e)} stroke={COLORS.border} strokeDasharray={e === 0 ? "4 3" : undefined} />
                <text x={4} y={elToY(p, e) - 3} fill={COLORS.textMuted} fontSize={10}>
                  {e}°
                </text>
              </g>
            ))}
            <path d={trackPath(p, series.earthAz, series.earthEl, 1, from, to)} fill="none" stroke={COLORS.earth} strokeWidth={1.5} strokeOpacity={0.6} />
            <path d={trackPath(p, series.sunAz, series.sunEl, 1, from, to)} fill="none" stroke={COLORS.sun} strokeWidth={1.5} strokeOpacity={0.6} />
            <path d={silhouettePath(p, horizon.elev_deg, horizon.az_step_deg)} fill={COLORS.terrain} stroke={COLORS.textMuted} strokeOpacity={0.6} />
            {azTicks.map((a) => (
              <g key={a}>
                <line x1={azToX(p, a)} x2={azToX(p, a)} y1={HEIGHT - 14} y2={HEIGHT} stroke={COLORS.textMuted} />
                <text x={azToX(p, a) + 3} y={HEIGHT - 4} fill={a % 90 === 0 ? COLORS.text : COLORS.textMuted} fontSize={10}>
                  {a % 90 === 0 ? CARD[a] : `${a}°`}
                </text>
              </g>
            ))}
            <Body testid="earth-disc" x={azToX(p, earth.az)} y={elToY(p, earth.el)} r={discs.earth} color={COLORS.earth} visible={earth.vis} />
            <Body testid="sun-disc" x={azToX(p, sun.az)} y={elToY(p, sun.el)} r={discs.sun} color={COLORS.sun} visible={sun.vis} />
            <text x={w - 4} y={12} textAnchor="end" fill={COLORS.textMuted} fontSize={10}>
              {STRINGS.silhouette.shown(exaggerationOf(p))} · {STRINGS.panorama.ringNote}
            </text>
          </svg>
        )}
      </div>
      <dl className="panorama-readout" aria-live="polite">
        <div>
          <dt>{STRINGS.panorama.time}</dt>
          <dd className="mono">
            {t.slice(0, 10)} {t.slice(11, 16)} UTC{!inside && ` · ${STRINGS.panorama.outside}`}
          </dd>
        </div>
        <div>
          <dt>{STRINGS.panorama.sun}</dt>
          <dd className="mono">{STRINGS.panorama.azel(sun.az, sun.el)}</dd>
        </div>
        <div>
          <dt>{STRINGS.panorama.earth}</dt>
          <dd className="mono">{STRINGS.panorama.azel(earth.az, earth.el)}</dd>
        </div>
        <div>
          <dt>{STRINGS.panorama.status}</dt>
          <dd>
            <span className={`status ${sun.vis ? "on sun" : "off"}`} data-testid="status-light">
              {sun.vis ? `☀ ${STRINGS.panorama.lit}` : `○ ${STRINGS.panorama.shadow}`}
            </span>{" "}
            <span className={`status ${earth.vis ? "on earth" : "off"}`} data-testid="status-link">
              {earth.vis ? `● ${STRINGS.panorama.link}` : `○ ${STRINGS.panorama.noLink}`}
            </span>
          </dd>
        </div>
      </dl>
    </div>
  );
}

const CARD: Record<number, string> = { 0: "N", 90: "E", 180: "S", 270: "W" };

/** Disc at angular scale (filled = visible, hollow = blocked) plus a dashed finder ring that is not to scale. */
function Body({ testid, x, y, r, color, visible }: { testid: string; x: number; y: number; r: number; color: string; visible: boolean }) {
  return (
    <g data-testid={testid} data-r={r} data-visible={visible} transform={`translate(${x},${y})`}>
      <circle r={Math.max(r + 5, 9)} fill="none" stroke={color} strokeWidth={1} strokeDasharray="2 2" />
      <circle className="disc" r={r} fill={visible ? color : "none"} stroke={color} strokeWidth={visible ? 0 : 1} />
    </g>
  );
}

function Segmented({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange(v: string): void }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      <span className="segmented-label">{label}</span>
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={value === v} className={value === v ? "on" : ""} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}
