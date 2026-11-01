import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fmtDay } from "../components/MissionSidebar";
import { CHAPTERS, stepChapter } from "../lib/chapters";
import { lookup } from "../lib/constraints";
import { phaseAt, timelineOf, type MissionTimeline } from "../lib/mission";
import { STRINGS } from "../lib/strings";
import { fmtMetric, round } from "../lib/why";
import { sceneBridge } from "../scene3d/bridge";
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

  // each chapter opens at its own moment of the mission
  useEffect(() => {
    if (!timeline) return;
    const t = c.start(timeline);
    appStore.getState().setMissionTime(t);
    appStore.getState().setMissionPhase(c.planning ? "overview" : phaseAt(timeline, t));
  }, [chapter, timeline]);

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
          <div className="edu-actions">
            <button type="button" className="btn pill" onClick={() => setChapter(stepChapter(chapter, -1))}>
              {STRINGS.educator.back}
            </button>
            {chapter < CHAPTERS.length - 1 && (
              <button type="button" className="btn pill primary" onClick={() => setChapter(stepChapter(chapter, 1))}>
                {STRINGS.educator.next}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
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
            {days.map((day) => {
              const m = index ? lookup(index, plan.site_id, day) : null;
              const label = STRINGS.planner.dayCell(fmtDay(day), m ? round(m.score, 2) : null);
              return (
                <button key={day} type="button" className="edu-bar" aria-pressed={day === arrival} aria-label={label} title={label} onClick={() => pick(plan.site_id, day)}>
                  <span style={{ height: `${Math.round(20 + 80 * (m?.score ?? 0))}%` }} />
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
