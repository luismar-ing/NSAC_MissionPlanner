import { useEffect, useState } from "react";
import { clampMission, missionClock, phaseAt, phaseStart, playbackRate, PLAY_PHASES, type MissionTimeline } from "../lib/mission";
import { STRINGS } from "../lib/strings";
import { appStore, useApp } from "../store/appStore";

const SPEEDS = [1, 6, 24] as const; // hours of mission per second
const STEP_MIN = 10; // scrubber resolution

/**
 * Mission time controls of the live view (spec 8.2): play / pause, scrubber over the whole mission (launch to
 * end of stay), jump to a phase, speed. The mission clock and the current phase are always visible.
 * Writes missionTime / missionPhase in the store; the 3D scene reads missionTime every frame.
 * `planId` is the plan the timeline belongs to: right after a change of plan in live mode (T4.4.b) the new
 * timeline arrives a moment later, and playback skips those frames instead of clamping the new plan's clock
 * into the old mission; then it carries on with the new plan.
 */
export function MissionControls({ timeline, planId }: { timeline: MissionTimeline; planId?: string }) {
  const missionTime = useApp((s) => s.missionTime);
  const missionPhase = useApp((s) => s.missionPhase);
  const setMissionTime = useApp((s) => s.setMissionTime);
  const setMissionPhase = useApp((s) => s.setMissionPhase);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(6);

  const go = (t: number) => {
    const c = clampMission(timeline, t);
    setMissionTime(c);
    setMissionPhase(phaseAt(timeline, c));
  };

  // a freshly selected plan ("overview") starts at launch; otherwise keep the clock where it is
  useEffect(() => {
    const st = appStore.getState();
    if (st.missionPhase === "overview" || st.missionTime === null) go(timeline.startMs);
    else go(st.missionTime);
  }, [timeline]);

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
      if (planId && appStore.getState().selectedPlanId !== planId) {
        last = now; // stale timeline: wait for the new plan's
        raf = requestAnimationFrame(tick);
        return;
      }
      const cur = appStore.getState().missionTime ?? timeline.startMs;
      const t = cur + (now - last) * playbackRate(timeline, cur, speed); // slow motion around launch (T5.2.a)
      last = now;
      if (t >= timeline.endMs) {
        go(timeline.endMs);
        setPlaying(false);
        return;
      }
      go(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, timeline, planId]);

  const t = missionTime ?? timeline.startMs;
  const clock = missionClock(timeline, t);
  const minutes = Math.round((t - timeline.startMs) / 60_000);
  const total = Math.round((timeline.endMs - timeline.startMs) / 60_000);

  return (
    <div className="mission-controls" data-testid="mission-controls">
      <div className="mission-clock" aria-live="off">
        <span className="mission-phase" data-testid="mission-phase">
          {STRINGS.mission.phases[missionPhase]}
        </span>
        <span className="mono">{clock.elapsed}</span>
        <span className="mono muted">{clock.utc}</span>
        {playing && playbackRate(timeline, t, speed) < speed * 3600 && (
          <span className="mission-slow" data-testid="slow-motion">
            {STRINGS.mission.slow}
          </span>
        )}
      </div>
      <div className="scrubber">
        <button
          type="button"
          className="icon-btn"
          aria-pressed={playing}
          aria-label={playing ? STRINGS.mission.pause : STRINGS.mission.play}
          onClick={() => {
            if (!playing && t >= timeline.endMs) go(timeline.startMs);
            setPlaying(!playing);
          }}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <input
          type="range"
          min={0}
          max={total}
          step={STEP_MIN}
          value={minutes}
          onChange={(e) => go(timeline.startMs + Number(e.target.value) * 60_000)}
          aria-label={STRINGS.mission.scrubber}
          aria-valuetext={`${clock.elapsed}, ${clock.utc}, ${STRINGS.mission.phases[missionPhase]}`}
        />
      </div>
      <div className="mission-row">
        <div className="segmented" role="group" aria-label={STRINGS.mission.jump}>
          <span className="segmented-label">{STRINGS.mission.jump}</span>
          {PLAY_PHASES.map((p) => (
            <button key={p} type="button" aria-pressed={missionPhase === p} className={missionPhase === p ? "on" : ""} onClick={() => go(phaseStart(timeline, p))}>
              {STRINGS.mission.phases[p]}
            </button>
          ))}
        </div>
        <div className="segmented" role="group" aria-label={STRINGS.mission.speed}>
          <span className="segmented-label">{STRINGS.mission.speed}</span>
          {SPEEDS.map((s) => (
            <button key={s} type="button" aria-pressed={speed === s} className={speed === s ? "on" : ""} onClick={() => setSpeed(s)}>
              {STRINGS.mission.speedLabel(s)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
