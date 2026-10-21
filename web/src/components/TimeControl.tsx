import { useEffect, useState } from "react";
import { relativeLabel } from "../lib/ribbon";
import { STRINGS } from "../lib/strings";
import { appStore, useApp } from "../store/appStore";

interface Props {
  startMs: number; // arrival (UTC ms)
  windowDays: number;
  stepMin: number;
}

const SPEEDS = [1, 6, 24] as const; // hours of mission per second

/**
 * Time control of the site view (spec 8.4): scrubber and playback over the selected plan's window, bound to
 * missionTime, the clock the 3D scene will share in Phase 4. "Match tray" copies the tray's relative clock.
 */
export function TimeControl({ startMs, windowDays, stepMin }: Props) {
  const missionTime = useApp((s) => s.missionTime) ?? startMs;
  const setMissionTime = useApp((s) => s.setMissionTime);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(6);
  const stepMs = stepMin * 60_000;
  const endMs = startMs + windowDays * 86_400_000 - stepMs; // last sample
  const clamp = (ms: number) => Math.min(endMs, Math.max(startMs, ms));
  const hours = (missionTime - startMs) / 3_600_000;

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const t = (appStore.getState().missionTime ?? startMs) + (now - last) * speed * 3600; // ms of mission
      last = now;
      if (t >= endMs) {
        setMissionTime(endMs);
        setPlaying(false);
        return;
      }
      setMissionTime(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, startMs, endMs, setMissionTime]);

  // label of the sample on screen (playback runs continuously, the data has one sample per step)
  const label = relativeLabel(Math.floor((missionTime - startMs) / stepMs) * stepMin, 1);
  return (
    <div className="scrubber time-control" data-testid="time-control">
      <button
        type="button"
        className="icon-btn"
        aria-pressed={playing}
        aria-label={playing ? STRINGS.timeControl.pause : STRINGS.timeControl.play}
        onClick={() => {
          if (!playing && missionTime >= endMs) setMissionTime(startMs);
          setPlaying(!playing);
        }}
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <input
        type="range"
        min={0}
        max={(endMs - startMs) / 3_600_000}
        step={stepMin / 60}
        value={hours}
        onChange={(e) => setMissionTime(clamp(startMs + Number(e.target.value) * 3_600_000))}
        aria-label={STRINGS.timeControl.label}
        aria-valuetext={label}
      />
      <output className="scrubber-value">{label}</output>
      <div className="segmented" role="group" aria-label={STRINGS.timeControl.speed}>
        {SPEEDS.map((s) => (
          <button key={s} type="button" aria-pressed={speed === s} className={speed === s ? "on" : ""} onClick={() => setSpeed(s)}>
            {STRINGS.timeControl.speedLabel(s)}
          </button>
        ))}
      </div>
      <button type="button" className="btn ghost" onClick={() => setMissionTime(clamp(startMs + appStore.getState().compareTime * 3_600_000))} title={STRINGS.timeControl.matchTitle}>
        {STRINGS.timeControl.match}
      </button>
    </div>
  );
}
