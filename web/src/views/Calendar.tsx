import { useEffect, useMemo, useRef, useState } from "react";
import {
  arrivalDate,
  bestInRange,
  calendarHeight,
  cellAt,
  cellColorIndices,
  cellRect,
  dayWidth,
  makeLayout,
  makeRange,
  monthTicks,
  planIdFor,
  type CalendarLayout,
} from "../lib/calendar";
import { MODE_DOMAIN, MODE_METRIC, rampLut, type CalendarMode } from "../lib/colorScale";
import { countValid, dayIndex, lookup, validMask, type WindowIndex } from "../lib/constraints";
import { STRINGS } from "../lib/strings";
import { MAX_COMPARE, useApp } from "../store/appStore";
import { COLORS, FONT } from "../styles/tokens";

const MODES: CalendarMode[] = ["combined", "energy", "comms"];
const LUTS: Record<CalendarMode, string[]> = { combined: rampLut("combined"), energy: rampLut("energy"), comms: rampLut("comms") };
const BEST_N = 3; // demo step 2: pin 3 plans

interface Cell {
  site: number;
  day: number;
}

/**
 * Arrival calendar heatmap (spec 8.5): one row per site, one column per arrival day, colour = metric of the
 * selected mode. Canvas (no WebGL, rule 7). Click selects, double-click / Enter / "Pin" pins to the tray,
 * drag selects a range, arrow keys move the selection. Hover shows the cell's metrics.
 */
export function Calendar() {
  const L = useApp((s) => s.selectedWindow);
  const sites = useApp((s) => s.sites);
  const loadWindows = useApp((s) => s.loadWindows);
  const constraints = useApp((s) => s.constraints);
  const setValidCount = useApp((s) => s.setValidCount);
  const setWindow = useApp((s) => s.setWindow);
  const windowDays = useApp((s) => s.manifest?.params.window_days ?? [3, 7, 14]);
  const selectedPlanId = useApp((s) => s.selectedPlanId);
  const comparePlans = useApp((s) => s.comparePlans);
  const plansById = useApp((s) => s.plansById);
  const selectPlan = useApp((s) => s.selectPlan);
  const selectedSite = useApp((s) => s.selectedSite);
  const selectSite = useApp((s) => s.selectSite);
  const pinPlan = useApp((s) => s.pinPlan);
  const range = useApp((s) => s.selectedRange);
  const setRange = useApp((s) => s.setRange);
  const notice = useApp((s) => s.notice);
  const clearNotice = useApp((s) => s.clearNotice);

  const [mode, setMode] = useState<CalendarMode>("combined");
  const [index, setIndex] = useState<WindowIndex | null>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<(Cell & { x: number; y: number }) | null>(null);
  const dragFrom = useRef<Cell | null>(null);
  const dragged = useRef(false);
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
    // Initial width straight from layout: ResizeObserver may not report while the page is in the background
    const initial = Math.floor(el.getBoundingClientRect().width);
    if (initial > 0) setWidth(initial);
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(clearNotice, 4000);
    return () => clearTimeout(t);
  }, [notice, clearNotice]);

  const layout: CalendarLayout | null = useMemo(
    () => (index && width > 0 ? makeLayout(width, index.siteIds.length, index.nDays) : null),
    [index, width],
  );
  const colors = useMemo(() => (index ? cellColorIndices(index, mode) : null), [index, mode]);
  const mask = useMemo(() => (index ? validMask(index, constraints) : null), [index, constraints]);
  const anyConstraint = constraints.minSunPct !== null || constraints.maxDarkH !== null || constraints.minEarthH !== null;

  useEffect(() => {
    setValidCount(mask ? { valid: countValid(mask), total: mask.length } : null);
  }, [mask, setValidCount]);

  const cellOfPlan = (id: string | null): Cell | null => {
    const p = id ? plansById.get(id) : undefined;
    if (!p || !index || p.window_days !== L) return null;
    const site = index.siteIds.indexOf(p.site_id);
    const day = dayIndex(index, p.arrival_utc);
    return site >= 0 && day >= 0 && day < index.nDays ? { site, day } : null;
  };
  const planOfCell = (c: Cell) => (index ? planIdFor(index.siteIds[c.site], arrivalDate(index.firstArrival, c.day), L) : "");
  const selectedCell = cellOfPlan(selectedPlanId);
  const pinnedCells = comparePlans.map(cellOfPlan).filter((c): c is Cell => c !== null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout || !index || !colors || !mask) return;
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
        const k = s * layout.nDays + d;
        ctx.globalAlpha = anyConstraint && !mask[k] ? 0.22 : 1; // spec 8.5: valid cells highlighted, the rest dimmed
        ctx.fillStyle = lut[colors[k]];
        ctx.fillRect(x, y, w + 0.6, hh); // +0.6 px hides sub-pixel seams between columns
      }
      ctx.globalAlpha = 1;
      if (anyConstraint) {
        // Pattern as well as colour (spec 9): diagonal hatch over the cells that fail the constraints
        const [, y0, , hh] = cellRect(layout, s, 0);
        ctx.save();
        ctx.beginPath();
        for (let d = 0; d < layout.nDays; d++) {
          if (mask[s * layout.nDays + d]) continue;
          const [x, , w] = cellRect(layout, s, d);
          ctx.rect(x, y0, w + 0.6, hh);
        }
        ctx.clip();
        ctx.strokeStyle = COLORS.textMuted;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = layout.labelW - hh; x < layout.width; x += 6) {
          ctx.moveTo(x, y0 + hh);
          ctx.lineTo(x + hh, y0);
        }
        ctx.stroke();
        ctx.restore();
      }
      const [, y] = cellRect(layout, s, 0);
      const name = sites.find((x) => x.id === index.siteIds[s])?.name ?? index.siteIds[s];
      // selected site (T5.1.a): a bar beside its name and bold text (shape and weight, not only colour)
      const isSel = index.siteIds[s] === selectedSite;
      if (isSel) {
        ctx.fillStyle = COLORS.accent;
        ctx.fillRect(0, y + 3, 3, layout.rowH - 6);
      }
      ctx.fillStyle = COLORS.text;
      ctx.font = `${isSel ? 600 : 400} ${FONT.size.md}px ${FONT.family}`;
      ctx.textBaseline = "middle";
      ctx.fillText(name.replace(" (Shackleton rim)", ""), 8, y + layout.rowH / 2, layout.labelW - 16);
    }
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = `${FONT.size.sm}px ${FONT.family}`;
    ctx.textBaseline = "alphabetic";
    for (const t of monthTicks(index.firstArrival, index.nDays)) {
      const [x] = cellRect(layout, 0, t.day);
      ctx.fillRect(x, layout.axisH - 6, 1, 6);
      ctx.fillText(t.label, x + 3, layout.axisH - 6);
    }
    // Range (dashed outline), pinned cells (triangle marker: shape, not only colour) and selection (white box)
    const dw = dayWidth(layout);
    if (range) {
      const [x0, y0] = cellRect(layout, range.site0, range.day0);
      const [x1, y1, w1, h1] = cellRect(layout, range.site1, range.day1);
      ctx.save();
      ctx.setLineDash([5, 3]);
      ctx.strokeStyle = COLORS.text;
      ctx.lineWidth = 2;
      ctx.strokeRect(x0 - 1, y0 - 1, x1 + w1 - x0 + 2, y1 + h1 - y0 + 2);
      ctx.restore();
    }
    for (const c of pinnedCells) {
      const [x, y] = cellRect(layout, c.site, c.day);
      const cx = x + dw / 2;
      ctx.fillStyle = COLORS.text;
      ctx.strokeStyle = COLORS.bg;
      ctx.lineWidth = 2; // surface ring so the marker reads on any cell colour
      ctx.beginPath();
      ctx.moveTo(cx, y + 9);
      ctx.lineTo(cx - 5, y);
      ctx.lineTo(cx + 5, y);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
    }
    if (selectedCell) {
      const [x, y, w, hh] = cellRect(layout, selectedCell.site, selectedCell.day);
      ctx.strokeStyle = COLORS.bg;
      ctx.lineWidth = 4;
      ctx.strokeRect(x - 2, y - 2, Math.max(w, 3) + 4, hh + 4);
      ctx.strokeStyle = COLORS.text;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 2, y - 2, Math.max(w, 3) + 4, hh + 4);
    }
    // Spec 8.7: initial load of the 2D shell (< 3 s) ends at the first calendar draw (T3.5.a)
    if (!performance.getEntriesByName("shell-ready").length) performance.mark("shell-ready");
    // Spec 8.7: time from the last control change until the canvas is redrawn (< 100 ms). Measured
    // synchronously (rAF is paused in background tabs); the next-frame time is added when available.
    if (performance.getEntriesByName("constraint-change").length) {
      const m = performance.measure("constraint-to-draw", "constraint-change");
      performance.clearMarks("constraint-change");
      canvas.dataset.lastUpdateMs = m.duration.toFixed(1);
      const start = performance.now() - m.duration;
      requestAnimationFrame(() => {
        canvas.dataset.lastFrameMs = (performance.now() - start).toFixed(1);
      });
    }
  }, [layout, index, colors, mask, anyConstraint, mode, sites, range, selectedPlanId, comparePlans, selectedSite]);

  const cellFromEvent = (e: React.MouseEvent<HTMLCanvasElement>): (Cell & { x: number; y: number }) | null => {
    if (!layout) return null;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const c = cellAt(layout, x, y);
    return c ? { ...c, x, y } : null;
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    dragFrom.current = cellFromEvent(e);
    dragged.current = false;
  };
  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = cellFromEvent(e);
    setHover(c);
    if (e.buttons === 1 && dragFrom.current && c && (c.day !== dragFrom.current.day || c.site !== dragFrom.current.site)) {
      dragged.current = true;
      setRange(makeRange(dragFrom.current, c));
    }
  };
  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = cellFromEvent(e);
    if (!dragged.current && c) {
      selectPlan(planOfCell(c)); // a plain click selects (spec 8.5)
      setRange(null);
    }
    dragFrom.current = null;
  };
  const onDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = cellFromEvent(e);
    if (c) pinPlan(planOfCell(c)); // explicit gesture pins (spec 8.5)
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!index) return;
    const cur = selectedCell ?? { site: 0, day: 0 };
    const moves: Record<string, Cell> = {
      ArrowLeft: { site: cur.site, day: Math.max(0, cur.day - 1) },
      ArrowRight: { site: cur.site, day: Math.min(index.nDays - 1, cur.day + 1) },
      ArrowUp: { site: Math.max(0, cur.site - 1), day: cur.day },
      ArrowDown: { site: Math.min(index.siteIds.length - 1, cur.site + 1), day: cur.day },
    };
    if (moves[e.key]) {
      e.preventDefault();
      selectPlan(planOfCell(moves[e.key]));
    } else if (e.key === "Enter" && selectedPlanId) {
      e.preventDefault();
      pinPlan(selectedPlanId);
    }
  };

  const best = index && range ? bestInRange(index, anyConstraint ? mask : null, range, BEST_N) : [];
  const rangeValid = index && range && mask
    ? (() => {
        let n = 0;
        for (let s = range.site0; s <= range.site1; s++) for (let d = range.day0; d <= range.day1; d++) n += anyConstraint ? mask[s * index.nDays + d] : 1;
        return n;
      })()
    : 0;

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
            <button key={d} type="button" aria-pressed={L === d} className={L === d ? "on" : ""} onClick={() => { setWindow(d); setRange(null); }}>
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
        <button type="button" className="btn" disabled={!selectedPlanId || comparePlans.includes(selectedPlanId)} onClick={() => selectedPlanId && pinPlan(selectedPlanId)}>
          {STRINGS.pin.selected}
        </button>
        <span className="pin-count">{STRINGS.pin.count(comparePlans.length, MAX_COMPARE)}</span>
      </div>
      <div ref={wrapRef} className="calendar-canvas-wrap">
        {!index && <p className="placeholder">{STRINGS.loading}</p>}
        <canvas
          ref={canvasRef}
          tabIndex={0}
          role="img"
          aria-label={STRINGS.calendarAria(L)}
          data-testid="calendar-canvas"
          data-selected-cell={selectedCell ? `${index?.siteIds[selectedCell.site]}:${selectedCell.day}` : ""}
          data-pinned-cells={pinnedCells.length}
          data-selected-site={selectedSite ?? ""}
          onMouseDown={onMouseDown}
          onMouseMove={onMove}
          onMouseUp={onMouseUp}
          onMouseLeave={() => setHover(null)}
          onDoubleClick={onDoubleClick}
          onKeyDown={onKeyDown}
        />
        {/* the site names are drawn on the canvas; these buttons over them make each one selectable (T5.1.a) */}
        {layout && index && (
          <div className="calendar-site-buttons" style={{ top: layout.axisH, width: layout.labelW }}>
            {index.siteIds.map((id, s) => {
              const name = sites.find((x) => x.id === id)?.name ?? id;
              return (
                <button
                  key={id}
                  type="button"
                  className="calendar-site-btn"
                  style={{ top: s * (layout.rowH + layout.rowGap), height: layout.rowH }}
                  aria-pressed={selectedSite === id}
                  aria-label={STRINGS.pin.site(name)}
                  title={STRINGS.pin.site(name)}
                  onClick={() => selectSite(id)}
                />
              );
            })}
          </div>
        )}
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
      <div className="calendar-footer">
        {range && index ? (
          <div className="range-bar" role="group" aria-label="Range selection">
            <span>{STRINGS.pin.rangeSummary(range.day1 - range.day0 + 1, range.site1 - range.site0 + 1, rangeValid)}</span>
            <button type="button" className="btn" disabled={best.length === 0} onClick={() => best.forEach((c) => pinPlan(planOfCell(c)))}>
              {STRINGS.pin.best(Math.min(BEST_N, best.length))}
            </button>
            <button type="button" className="btn ghost" onClick={() => setRange(null)}>
              {STRINGS.pin.clearRange}
            </button>
          </div>
        ) : (
          <small className="calendar-help">{STRINGS.pin.help}</small>
        )}
        {notice && (
          <p className="notice" role="status" aria-live="polite">
            {notice}
          </p>
        )}
      </div>
    </div>
  );
}
