import { useEffect, useMemo, useRef, useState } from "react";
import { arrivalDate, calendarHeight, cellAt, cellColorIndices, cellRect, makeLayout, monthTicks, type CalendarLayout } from "../lib/calendar";
import { MODE_DOMAIN, MODE_METRIC, rampLut, type CalendarMode } from "../lib/colorScale";
import { lookup, type WindowIndex } from "../lib/constraints";
import { STRINGS } from "../lib/strings";
import { useApp } from "../store/appStore";
import { COLORS, FONT } from "../styles/tokens";

const MODES: CalendarMode[] = ["combined", "energy", "comms"];
const LUTS: Record<CalendarMode, string[]> = { combined: rampLut("combined"), energy: rampLut("energy"), comms: rampLut("comms") };

interface Hover {
  site: number;
  day: number;
  x: number;
  y: number;
}

/**
 * Arrival calendar heatmap (spec 8.5): one row per site, one column per arrival day, colour = metric of the
 * selected mode. Canvas (no WebGL, rule 7). Hover shows the cell's metrics.
 */
export function Calendar() {
  const L = useApp((s) => s.selectedWindow);
  const sites = useApp((s) => s.sites);
  const loadWindows = useApp((s) => s.loadWindows);
  const setWindow = useApp((s) => s.setWindow);
  const windowDays = useApp((s) => s.manifest?.params.window_days ?? [3, 7, 14]);
  const [mode, setMode] = useState<CalendarMode>("combined");
  const [index, setIndex] = useState<WindowIndex | null>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<Hover | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let alive = true;
    void loadWindows(L).then((idx) => alive && setIndex(idx));
    return () => {
      alive = false;
    };
  }, [L, loadWindows]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout: CalendarLayout | null = useMemo(
    () => (index && width > 0 ? makeLayout(width, index.siteIds.length, index.nDays) : null),
    [index, width],
  );
  const colors = useMemo(() => (index ? cellColorIndices(index, mode) : null), [index, mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout || !index || !colors) return;
    const dpr = window.devicePixelRatio || 1;
    const h = calendarHeight(layout);
    canvas.width = Math.round(layout.width * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${layout.width}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(0, 0, layout.width, h);
    const lut = LUTS[mode];
    for (let s = 0; s < layout.nSites; s++) {
      for (let d = 0; d < layout.nDays; d++) {
        const [x, y, w, hh] = cellRect(layout, s, d);
        ctx.fillStyle = lut[colors[s * layout.nDays + d]];
        ctx.fillRect(x, y, w + 0.6, hh); // +0.6 px hides sub-pixel seams between columns
      }
      ctx.fillStyle = COLORS.text;
      ctx.font = `${FONT.size.md}px ${FONT.family}`;
      ctx.textBaseline = "middle";
      const [, y] = cellRect(layout, s, 0);
      const name = sites.find((x) => x.id === index.siteIds[s])?.name ?? index.siteIds[s];
      ctx.fillText(name.replace(" (Shackleton rim)", ""), 4, y + layout.rowH / 2, layout.labelW - 12);
    }
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = `${FONT.size.sm}px ${FONT.family}`;
    ctx.textBaseline = "alphabetic";
    for (const t of monthTicks(index.firstArrival, index.nDays)) {
      const [x] = cellRect(layout, 0, t.day);
      ctx.fillRect(x, layout.axisH - 6, 1, 6);
      ctx.fillText(t.label, x + 3, layout.axisH - 6);
    }
  }, [layout, index, colors, mode, sites]);

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!layout) return;
    const r = e.currentTarget.getBoundingClientRect();
    const c = cellAt(layout, e.clientX - r.left, e.clientY - r.top);
    setHover(c ? { ...c, x: e.clientX - r.left, y: e.clientY - r.top } : null);
  };

  const hoverInfo = hover && index ? (() => {
    const siteId = index.siteIds[hover.site];
    const date = arrivalDate(index.firstArrival, hover.day);
    return { site: sites.find((x) => x.id === siteId)?.name ?? siteId, date, m: lookup(index, siteId, date) };
  })() : null;

  const [lo, hi] = MODE_DOMAIN[mode];
  return (
    <div className="calendar">
      <div className="calendar-controls" role="toolbar" aria-label={STRINGS.calendarTitle}>
        <div className="segmented" role="group" aria-label={STRINGS.calendarModeLabel}>
          {MODES.map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>
              {STRINGS.calendarModes[m]}
            </button>
          ))}
        </div>
        <div className="segmented" role="group" aria-label={STRINGS.windowLabel}>
          {windowDays.map((d) => (
            <button key={d} type="button" aria-pressed={L === d} className={L === d ? "on" : ""} onClick={() => setWindow(d)}>
              {STRINGS.windowDays(d)}
            </button>
          ))}
        </div>
        <div className="legend" aria-label={STRINGS.legendLabel}>
          <span className="legend-name">{STRINGS.metricNames[MODE_METRIC[mode]]}</span>
          <span className="legend-value">{lo}</span>
          <span
            className="legend-ramp"
            style={{ background: `linear-gradient(90deg, ${LUTS[mode][0]}, ${LUTS[mode][128]}, ${LUTS[mode][191]}, ${LUTS[mode][255]})` }}
          />
          <span className="legend-value">{hi}</span>
        </div>
      </div>
      <div ref={wrapRef} className="calendar-canvas-wrap">
        {!index && <p className="placeholder">{STRINGS.loading}</p>}
        <canvas ref={canvasRef} onMouseMove={onMove} onMouseLeave={() => setHover(null)} aria-label={STRINGS.calendarAria(L)} role="img" />
        {hover && hoverInfo?.m && (
          <div className="tooltip" style={{ left: hover.x + 14, top: hover.y + 14 }} role="status">
            <strong>{hoverInfo.site}</strong>
            <span>
              {STRINGS.arrival} {hoverInfo.date} · {STRINGS.windowDays(L)}
            </span>
            <span>{STRINGS.fmt.sun(hoverInfo.m.sun_pct)}</span>
            <span>{STRINGS.fmt.dark(hoverInfo.m.longest_dark_h)}</span>
            <span>{STRINGS.fmt.earth(hoverInfo.m.earth_h_min, hoverInfo.m.earth_h_mean)}</span>
            <span>{STRINGS.fmt.score(hoverInfo.m.score)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
