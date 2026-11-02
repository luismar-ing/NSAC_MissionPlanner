import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { PlanWindowSeries } from "../lib/planData";
import { sampleAt } from "../lib/planData";
import { longestZeroRun, relativeLabel, stateRuns } from "../lib/ribbon";
import { STRINGS } from "../lib/strings";
import { COLORS } from "../styles/tokens";
import { ASSUMED_BATTERY, batteryRun } from "../lib/energy";
import { useApp } from "../store/appStore";

interface Props {
  series: PlanWindowSeries;
  compareTime: number; // hours since arrival
}

// two lanes: Sun on top (orange), Earth below (blue). Each lane has its own colour, so "both" is simply
// both lanes lit and the state reads by position as well as by colour (spec 9, decision A7).
const LANE_SUN = { y: 2, h: 15 };
const LANE_EARTH = { y: 19, h: 15 };
const LABEL_Y = 50;
// battery lane (T6.4.b, extra): below the two lanes, the labels move under it
const LANE_BATTERY = { y: 40, h: 18 };
const LABEL_Y_BATTERY = 72; // the usual labels, under the battery lane
const BATTERY_LABEL_Y = 88; // the battery's own line

/** Time ribbon of a plan (spec 8.1): Sun / Earth / both / none over the window, longest dark stretch outlined. */
export const TimeRibbon = memo(function TimeRibbon({ series, compareTime }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setW(Math.floor(el.clientWidth));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const energy = useApp((s) => s.energyModel);
  const battery = useMemo(() => (energy ? batteryRun(series.sunVis, series.stepMin) : null), [energy, series]);
  const labelY = battery ? LABEL_Y_BATTERY : LABEL_Y;
  const runs = useMemo(() => stateRuns(series.sunVis, series.earthVis), [series]);
  const dark = useMemo(() => longestZeroRun(series.sunVis), [series]);
  const darkH = dark ? ((dark.end - dark.start) * series.stepMin) / 60 : 0;
  const days = Math.round((series.n * series.stepMin) / 1440);
  const x = (i: number) => (i / series.n) * w;
  const k = sampleAt(series, compareTime);
  const label = dark
    ? STRINGS.ribbon.aria(darkH, relativeLabel(dark.start, series.stepMin))
    : STRINGS.ribbon.ariaNoDark;

  return (
    <div ref={ref} className="ribbon" data-testid="ribbon" data-dark-start={dark?.start} data-dark-h={darkH}>
      {w > 0 && (
        <svg width={w} height={battery ? 94 : 56} role="img" aria-label={battery ? `${label} ${STRINGS.ribbon.batteryAria(battery.minSoc, (battery.emptySamples * series.stepMin) / 60)}` : label}>
          <rect className="rib-bg" x={0} y={LANE_SUN.y} width={w} height={LANE_EARTH.y + LANE_EARTH.h - LANE_SUN.y} fill={COLORS.dark} />
          {runs.map((r) => {
            const sun = r.state === "both" || r.state === "sun";
            const earth = r.state === "both" || r.state === "earth";
            const rx = x(r.start);
            const rw = Math.max(0.5, x(r.end) - rx);
            return (
              <g key={r.start} className={`rib-run ${r.state}`} data-state={r.state}>
                {sun && <rect x={rx} y={LANE_SUN.y} width={rw} height={LANE_SUN.h} fill={COLORS.sun} />}
                {earth && <rect x={rx} y={LANE_EARTH.y} width={rw} height={LANE_EARTH.h} fill={COLORS.earth} />}
              </g>
            );
          })}
          {/* day boundaries */}
          {Array.from({ length: days + 1 }, (_, d) => (
            <line className="rib-day" key={d} x1={x((d * 1440) / series.stepMin)} x2={x((d * 1440) / series.stepMin)} y1={LANE_SUN.y} y2={LANE_EARTH.y + LANE_EARTH.h + 3} stroke={COLORS.bg} strokeWidth={1} />
          ))}
          {/* longest dark stretch: dashed outline over both lanes, plus its length */}
          {dark && (
            <rect
              className="rib-dark"
              data-testid="longest-dark"
              x={x(dark.start) + 0.75}
              y={LANE_SUN.y - 1}
              width={Math.max(2, x(dark.end) - x(dark.start) - 1.5)}
              height={LANE_EARTH.y + LANE_EARTH.h - LANE_SUN.y + 2}
              fill="none"
              stroke={COLORS.textMuted}
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
          )}
          {/* compareTime cursor */}
          <line className="rib-cursor" x1={x(Math.min(k + 0.5, series.n))} x2={x(Math.min(k + 0.5, series.n))} y1={0} y2={LANE_EARTH.y + LANE_EARTH.h + 2} stroke={COLORS.text} strokeWidth={1.5} />
          {battery && (
            <g className="rib-battery" data-testid="battery" data-min-soc={battery.minSoc.toFixed(3)}>
              <title>{STRINGS.ribbon.batteryTitle(ASSUMED_BATTERY)}</title>
              <rect x={0} y={LANE_BATTERY.y} width={w} height={LANE_BATTERY.h} fill={COLORS.panelRaised} />
              <path
                d={`M0 ${LANE_BATTERY.y + LANE_BATTERY.h} ${Array.from(battery.soc, (s, i) => `L${x(i + 1).toFixed(1)} ${(LANE_BATTERY.y + LANE_BATTERY.h * (1 - s)).toFixed(1)}`).join(" ")} L${w} ${LANE_BATTERY.y + LANE_BATTERY.h} Z`}
                fill={COLORS.both}
                fillOpacity={0.35}
                stroke={COLORS.both}
                strokeWidth={1}
              />
            </g>
          )}
          <text className="rib-label" x={2} y={labelY} fill={COLORS.textMuted} fontSize={10}>
            {STRINGS.ribbon.lanes}
          </text>
          {battery && (
            <text className="rib-label rib-battery-label" x={2} y={BATTERY_LABEL_Y} fill={COLORS.textMuted} fontSize={10}>
              {STRINGS.ribbon.battery(battery.minSoc, (battery.emptySamples * series.stepMin) / 60)}
            </text>
          )}
          <text className="rib-label strong" x={w - 2} y={labelY} textAnchor="end" fill={COLORS.text} fontSize={10}>
            {dark ? STRINGS.ribbon.longest(darkH) : STRINGS.ribbon.noDark}
          </text>
        </svg>
      )}
    </div>
  );
});
