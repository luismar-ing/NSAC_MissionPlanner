import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { relativeLabel } from "../lib/ribbon";
import { STRINGS } from "../lib/strings";
import { appStore, useApp } from "../store/appStore";

const STEP_H = 0.5; // one timeseries sample
const PLAY_H_PER_S = 6; // playback speed: 6 h of mission per second

/**
 * Global relative clock of the comparison (spec 8.1): day and hour since arrival, shared by every panel.
 * `data-last-update-ms` holds the time from the input event to the end of the commit that redrew all panels.
 */
export function CompareScrubber() {
  const ids = useApp((s) => s.comparePlans);
  const plansById = useApp((s) => s.plansById);
  const compareTime = useApp((s) => s.compareTime);
  const setCompareTime = useApp((s) => s.setCompareTime);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t0 = useRef<number | null>(null);

  const maxDays = Math.max(1, ...ids.map((id) => plansById.get(id)?.window_days ?? 0));
  const maxH = maxDays * 24 - STEP_H;

  const move = (h: number) => {
    t0.current = performance.now();
    setCompareTime(Math.min(maxH, Math.max(0, h)));
  };

  // every panel has re-rendered by the time layout effects run: measure the whole update
  useLayoutEffect(() => {
    if (t0.current === null || !ref.current) return;
    ref.current.dataset.lastUpdateMs = (performance.now() - t0.current).toFixed(1);
    t0.current = null;
  }, [compareTime]);

  // keep the clock inside the longest window when plans are removed
  useEffect(() => {
    if (compareTime > maxH) setCompareTime(maxH);
  }, [compareTime, maxH, setCompareTime]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    // the first frame only sets the time origin: frame timestamps and performance.now() need not share a clock
    let last: number | null = null;
    const tick = (now: number) => {
      if (last === null) {
        last = now;
        raf = requestAnimationFrame(tick);
        return;
      }
      const st = appStore.getState();
      const next = st.compareTime + ((now - last) / 1000) * PLAY_H_PER_S;
      last = now;
      if (next >= maxH) {
        st.setCompareTime(maxH);
        setPlaying(false);
        return;
      }
      st.setCompareTime(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, maxH]);

  const label = relativeLabel(Math.round(compareTime * 60), 1);
  return (
    <div className="scrubber" ref={ref} data-testid="scrubber">
      <button
        type="button"
        className="icon-btn"
        onClick={() => {
          if (!playing && compareTime >= maxH) move(0);
          setPlaying(!playing);
        }}
        aria-label={playing ? STRINGS.scrubber.pause : STRINGS.scrubber.play}
        aria-pressed={playing}
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <button type="button" className="icon-btn" onClick={() => move(compareTime - 24)} aria-label={STRINGS.scrubber.back(24)}>
        −1d
      </button>
      <button type="button" className="icon-btn" onClick={() => move(compareTime - 1)} aria-label={STRINGS.scrubber.back(1)}>
        −1h
      </button>
      <input
        type="range"
        min={0}
        max={maxH}
        step={STEP_H}
        value={Math.min(compareTime, maxH)}
        onChange={(e) => move(Number(e.target.value))}
        aria-label={STRINGS.scrubber.label}
        aria-valuetext={label}
      />
      <button type="button" className="icon-btn" onClick={() => move(compareTime + 1)} aria-label={STRINGS.scrubber.forward(1)}>
        +1h
      </button>
      <button type="button" className="icon-btn" onClick={() => move(compareTime + 24)} aria-label={STRINGS.scrubber.forward(24)}>
        +1d
      </button>
      <output className="scrubber-value" aria-live="off">
        {label}
      </output>
    </div>
  );
}
