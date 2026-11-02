import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fmtDay } from "../components/MissionSidebar";
import { CHAPTERS, stepChapter } from "../lib/chapters";
import { lookup } from "../lib/constraints";
import { phaseAt, playbackRate, timelineOf, type MissionTimeline } from "../lib/mission";
import { Drawer } from "../components/Drawer";
import { ErrorMessage } from "../components/ErrorMessage";
import { describeError } from "../lib/errors";
import { Panorama } from "./Panorama";
import { useSiteData } from "./useSiteData";
import { STRINGS } from "../lib/strings";
import { fmtMetric, round } from "../lib/why";
import { sceneBridge } from "../scene3d/bridge";
import { ASCENT_MS } from "../scene3d/launch";
import { SceneHost } from "../scene3d/SceneHost";
import { appStore, useApp } from "../store/appStore";

const STRIP_DAYS = 21;
const DAY_MS = 86_400_000;
const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The chapter currently shown (read by the scene every frame: chapter 1 is the globe). */
const chapterNow = { index: 0 };
const isPlanning = () => CHAPTERS[chapterNow.index].planning;

/** The highest-scoring 7-day plan of the year: a good mission to tell the story with. */
async function bestPlanId(): Promise<string | null> {
  const st = appStore.getState();
  const index = await st.loadWindows(7);
  const score = index.metrics.score;
  let best = 0;
  for (let i = 1; i < score.length; i++) if (score[i] > score[best]) best = i;
  const site = index.siteIds[Math.floor(best / index.nDays)];
  const day = ymd(Date.parse(index.firstArrival) + (best % index.nDays) * DAY_MS);
  const id = `${site}_${day.replace(/-/g, "")}_7d`;
  return st.plansById.has(id) ? id : null;
}

/**
 * Educator mode (decision A7, designs C2 and C3): the mission as a story in four chapters over the same single
 * 3D scene as the Mission Planner. Chapter 1 (C2) chooses the site and the day on the globe; the others follow
 * the mission with one short caption each. Esc, or Home, goes back to the start page at any moment.
 */
export function EducatorView({ tools }: { tools: ReactNode }) {
  const plan = useApp((s) => (s.selectedPlanId ? s.plansById.get(s.selectedPlanId) : undefined));
  const sites = useApp((s) => s.sites);
  const range = useApp((s) => s.manifest?.date_range);
  const index = useApp((s) => s.windowIndex[7]);
  const trajectoryMode = useApp((s) => s.manifest?.params.trajectory_mode ?? "ILLUSTRATIVE");
  const [chapter, setChapterState] = useState(0);
  const [timeline, setTimeline] = useState<MissionTimeline | null>(null);
  const shown = useRef<string | null>(appStore.getState().selectedPlanId);
  const c = CHAPTERS[chapter];

  const setChapter = (i: number) => {
    chapterNow.index = i;
    setChapterState(i);
  };
  useEffect(() => () => void (chapterNow.index = 0), []);

  // a good mission to begin with: the best 7-day plan of the year
  useEffect(() => {
    let alive = true;
    void bestPlanId().then((id) => alive && id && appStore.getState().selectPlan(id));
    return () => {
      alive = false;
    };
  }, []);

  // the plan's timeline; while on the globe, the scene follows the chosen plan
  useEffect(() => {
    if (!plan) return;
    let alive = true;
    void appStore
      .getState()
      .data.trajectory(plan.trajectory_id)
      .then((traj) => {
        if (!alive) return;
        const tl = timelineOf(plan, traj);
        setTimeline(tl);
        if (shown.current !== plan.id && sceneBridge.setPlan) {
          sceneBridge.setPlan({ trajectory: traj, timeline: tl, siteId: plan.site_id });
          shown.current = plan.id;
        }
      });
    return () => {
      alive = false;
    };
  }, [plan]);

  // each chapter opens at its own moment of the mission; the journey and the landing then play by themselves
  const [play, setPlay] = useState<{ to: number; hoursPerSecond: number } | null>(null);
  useEffect(() => {
    if (!timeline) return;
    const t = c.start(timeline);
    appStore.getState().setMissionTime(t);
    appStore.getState().setMissionPhase(c.planning ? "overview" : phaseAt(timeline, t));
    setPlay(c.hoursPerSecond > 0 ? { to: c.end(timeline), hoursPerSecond: c.hoursPerSecond } : null);
  }, [chapter, timeline]);

  // playback towards play.to, with the mission's slow motion around launch (lib/mission playbackRate)
  useEffect(() => {
    if (!play || !timeline) return;
    let raf = 0;
    let last: number | null = null;
    const go = (t: number) => {
      appStore.getState().setMissionTime(t);
      appStore.getState().setMissionPhase(phaseAt(timeline, t));
    };
    const tick = (now: number) => {
      if (last !== null) {
        const cur = appStore.getState().missionTime ?? timeline.startMs;
        const hold = appStore.getState().detailedLaunch ? ASCENT_MS : 0; // staging stays watchable (T6.3.a)
        const t = cur + (now - last) * playbackRate(timeline, cur, play.hoursPerSecond, hold);
        if (t >= play.to) {
          go(play.to);
          setPlay(null);
          return;
        }
        go(t);
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [play, timeline]);

  const skip = () => {
    if (!play || !timeline) return;
    appStore.getState().setMissionTime(play.to);
    appStore.getState().setMissionPhase(phaseAt(timeline, play.to));
    setPlay(null);
  };
  const fullDay = () => {
    if (!timeline) return;
    const now = appStore.getState().missionTime ?? timeline.landingMs;
    const from = now >= timeline.endMs - 3_600_000 ? timeline.landingMs : now; // at the end of the stay: start again
    appStore.getState().setMissionTime(from);
    setPlay({ to: Math.min(timeline.endMs, from + 86_400_000), hoursPerSecond: 1 });
  };
  const levelB = useApp((s) => s.levelB);
  const [panorama, setPanorama] = useState(false);
  const lookAround = () => {
    // Level B: stand on the site and drag the sky; without it, the 2D 360° panorama (level A)
    if (levelB) appStore.getState().setSurfaceView(true);
    else setPanorama(true);
  };

  // Esc leaves the story for the start page (no dialog of this view handles it first)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) appStore.getState().setScreen("landing");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const metrics = plan && index ? lookup(index, plan.site_id, plan.arrival_utc.slice(0, 10)) : null;
  const site = sites.find((s) => s.id === plan?.site_id);
  const caption = useMemo(() => {
    if (!plan) return "";
    const text = STRINGS.educator.chapters[c.id];
    return text.caption({
      site: site?.name ?? "",
      transitDays: plan.transit_days,
      windowDays: plan.window_days,
      sunPct: metrics ? fmtMetric("sun_pct", metrics.sun_pct) : "…",
      earthHoursMean: metrics ? fmtMetric("earth_h_mean", metrics.earth_h_mean) : "…",
    });
  }, [plan, c.id, site, metrics]);

  return (
    <div className="educator" data-chapter={c.id} data-testid="educator">
      {plan && (
        <div className="planner-scene">
          <SceneHost planning={isPlanning} />
        </div>
      )}
      <header className="planner-top">
        <div className="landing-tools">{tools}</div>
      </header>

      <div className="edu-head">
        <p className="edu-kicker">{STRINGS.educator.chapterOf(chapter + 1, CHAPTERS.length)}</p>
        <h2 className="edu-title">{STRINGS.educator.chapters[c.id].title}</h2>
        {chapter === 0 && <p className="edu-lead">{caption}</p>}
        {trajectoryMode === "ILLUSTRATIVE" && c.id !== "surface" && (
          <p className="edu-note" title={STRINGS.panel.illustrativeTitle}>
            <span className="badge illustrative">ILLUSTRATIVE</span> {STRINGS.live.illustrative}
          </p>
        )}
      </div>
      <ol className="edu-progress" aria-label={STRINGS.educator.progress}>
        {CHAPTERS.map((ch, i) => (
          <li key={ch.id} aria-current={i === chapter ? "step" : undefined} data-done={i < chapter || undefined}>
            <span className="visually-hidden">{STRINGS.educator.chapters[ch.id].title}</span>
          </li>
        ))}
      </ol>

      {chapter === 0 && plan && range && (
        <ChooseDock
          plan={plan}
          sites={sites}
          index={index}
          first={Date.parse(range.arrival_start.slice(0, 10))}
          last={Date.parse(range.arrival_end.slice(0, 10))}
          onBegin={() => setChapter(1)}
        />
      )}

      {chapter > 0 && (
        <div className="edu-caption">
          <p className="edu-caption-text" aria-live="polite">
            {caption}
          </p>
          {c.id === "surface" && levelB && <p className="edu-hint">{STRINGS.educator.lookHint}</p>}
          <div className="edu-actions">
            <button type="button" className="btn pill" onClick={() => setChapter(stepChapter(chapter, -1))}>
              {STRINGS.educator.back}
            </button>
            {play && (
              <button type="button" className="btn pill" onClick={skip}>
                {STRINGS.educator.skip}
              </button>
            )}
            {c.id === "surface" && (
              <>
                <button type="button" className="btn pill primary" onClick={fullDay} disabled={play !== null}>
                  {STRINGS.educator.fullDay}
                </button>
                <button type="button" className="btn pill" onClick={lookAround}>
                  {STRINGS.educator.lookAround}
                </button>
              </>
            )}
            {chapter < CHAPTERS.length - 1 && (
              <button type="button" className="btn pill primary" onClick={() => setChapter(stepChapter(chapter, 1))}>
                {STRINGS.educator.next}
              </button>
            )}
          </div>
        </div>
      )}
      {panorama && <PanoramaDrawer onClose={() => setPanorama(false)} />}
    </div>
  );
}

/** "Look around 360°" without Level B: the 2D horizon panorama (spec 8.4, level A) on the mission clock. */
function PanoramaDrawer({ onClose }: { onClose(): void }) {
  const missionTime = useApp((s) => s.missionTime);
  const { plan, error, retry } = useSiteData();
  return (
    <Drawer title={STRINGS.educator.lookAround} closeLabel={STRINGS.planner.closeSearch} onClose={onClose} testId="edu-panorama">
      {error !== null && <ErrorMessage what={STRINGS.errors.site} info={describeError(error)} onRetry={retry} />}
      {error === null && (!plan || missionTime === null) && <p className="placeholder">{STRINGS.loading}</p>}
      {plan && missionTime !== null && <Panorama data={plan} timeMs={missionTime} />}
    </Drawer>
  );
}

/** Chapter 1 (C2): site tabs, arrival days as bars of the site's score, and "Begin the journey". */
function ChooseDock({
  plan,
  sites,
  index,
  first,
  last,
  onBegin,
}: {
  plan: { id: string; site_id: string; arrival_utc: string; window_days: number };
  sites: { id: string; name: string }[];
  index: ReturnType<typeof appStore.getState>["windowIndex"][number];
  first: number;
  last: number;
  onBegin(): void;
}) {
  const arrival = plan.arrival_utc.slice(0, 10);
  const pick = (siteId: string, day: string) => {
    const id = `${siteId}_${day.replace(/-/g, "")}_7d`;
    if (appStore.getState().plansById.has(id)) appStore.getState().selectPlan(id);
  };
  const startMs = Math.min(Math.max(first, Date.parse(arrival) - Math.floor(STRIP_DAYS / 2) * DAY_MS), last - (STRIP_DAYS - 1) * DAY_MS);
  const days = Array.from({ length: STRIP_DAYS }, (_, i) => ymd(startMs + i * DAY_MS));
  // heights relative to the days shown, so differences read at a glance; each bar's label keeps the real score
  const scores = days.map((d) => (index ? (lookup(index, plan.site_id, d)?.score ?? null) : null));
  const known = scores.filter((x): x is number => x !== null);
  const lo = Math.min(...known);
  const span = Math.max(...known) - lo;
  const height = (x: number | null) => (x === null ? 15 : span < 1e-3 ? 100 : 15 + (85 * (x - lo)) / span);
  return (
    <div className="edu-dock">
      <div className="edu-tabs" role="group" aria-label={STRINGS.educator.siteTabs}>
        {sites.map((s) => (
          <button key={s.id} type="button" aria-pressed={s.id === plan.site_id} onClick={() => pick(s.id, arrival)}>
            {s.name}
          </button>
        ))}
      </div>
      <div className="edu-choose">
        <div className="edu-days">
          <div className="edu-bars" role="group" aria-label={STRINGS.educator.dayBars}>
            {days.map((day, i) => {
              const label = STRINGS.planner.dayCell(fmtDay(day), scores[i] === null ? null : round(scores[i]!, 2));
              return (
                <button key={day} type="button" className="edu-bar" aria-pressed={day === arrival} aria-label={label} title={label} onClick={() => pick(plan.site_id, day)}>
                  <span style={{ height: `${Math.round(height(scores[i]))}%` }} />
                </button>
              );
            })}
          </div>
          <div className="edu-days-axis">
            <span>{fmtDay(days[0])}</span>
            <span className="edu-arrive">{STRINGS.educator.arrive(fmtDay(arrival), plan.window_days)}</span>
            <span>{fmtDay(days[days.length - 1])}</span>
          </div>
        </div>
        <button type="button" className="btn pill primary edu-begin" onClick={onBegin}>
          {STRINGS.educator.begin}
        </button>
      </div>
    </div>
  );
}
