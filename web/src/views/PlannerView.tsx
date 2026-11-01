import { useEffect, useRef, useState, type ReactNode } from "react";
import { MissionSidebar } from "../components/MissionSidebar";
import { timelineOf, PLAY_PHASES } from "../lib/mission";
import { STRINGS } from "../lib/strings";
import { sceneBridge } from "../scene3d/bridge";
import { SceneHost } from "../scene3d/SceneHost";
import { appStore, useApp } from "../store/appStore";
import { CompareView } from "./CompareView";
import { LiveView } from "./LiveView";

/** The globe shows while the plan is being chosen; "Launch" (live view mode) starts the journey. */
const isPlanning = () => appStore.getState().viewMode !== "live";

/**
 * Mission Planner (decision A7): one 3D scene behind every stage, so the camera can hop from the globe to the
 * launch. Planning (A2): globe + mission sidebar. Mission: the journey with its controls (restyled in TR.2.d,
 * TR.2.e). Search and comparison (calendar, constraints, tray, site) open in a panel over the scene.
 */
export function PlannerView({ tools }: { tools: ReactNode }) {
  const planId = useApp((s) => s.selectedPlanId);
  const viewMode = useApp((s) => s.viewMode);
  const missionPhase = useApp((s) => s.missionPhase);
  const drawerOpen = useApp((s) => s.drawerOpen);
  const setDrawerOpen = useApp((s) => s.setDrawerOpen);
  const trajectoryMode = useApp((s) => s.manifest?.params.trajectory_mode ?? "ILLUSTRATIVE");
  const [launched, setLaunched] = useState(false);
  const mission = viewMode === "live";

  // while planning, the scene follows the plan chosen in the sidebar or the calendar (the live view switches
  // plans itself, with its own clock rules: switchLivePlan)
  const shown = useRef(planId);
  useEffect(() => {
    if (!planId || planId === shown.current) return;
    if (mission) {
      shown.current = planId;
      return;
    }
    let alive = true;
    const st = appStore.getState();
    const plan = st.plansById.get(planId);
    if (!plan) return;
    void st.data.trajectory(plan.trajectory_id).then((traj) => {
      if (!alive || !sceneBridge.setPlan) return;
      sceneBridge.setPlan({ trajectory: traj, timeline: timelineOf(plan, traj), siteId: plan.site_id });
      shown.current = planId;
    });
    return () => {
      alive = false;
    };
  }, [planId, mission]);

  const launch = () => {
    setDrawerOpen(false);
    setLaunched(true);
    appStore.getState().setMissionPhase("overview"); // the controls start the mission at the countdown
    appStore.getState().setViewMode("live");
  };

  const current = mission ? (missionPhase === "overview" ? "launch" : missionPhase) : "plan";
  return (
    <div className="planner" data-stage={mission ? "mission" : "planning"} data-testid="planner">
      {planId && (
        <div className="planner-scene">
          <SceneHost planning={isPlanning} />
        </div>
      )}
      <header className="planner-top">
        <div className="landing-tools">{tools}</div>
      </header>
      {!mission && <MissionSidebar onLaunch={launch} onOpenSearch={() => setDrawerOpen(true)} />}
      {mission && (
        <div className="planner-mission">
          <LiveView sceneOutside autoPlay={launched} />
        </div>
      )}
      {trajectoryMode === "ILLUSTRATIVE" && !mission && (
        <p className="planner-badge" title={STRINGS.panel.illustrativeTitle}>
          <span className="badge illustrative">ILLUSTRATIVE</span> {STRINGS.live.illustrative}
        </p>
      )}
      <ol className="phase-rail" aria-label={STRINGS.planner.phaseRail}>
        {(["plan", ...PLAY_PHASES] as const).map((p) => (
          <li key={p} aria-current={p === current ? "step" : undefined}>
            {STRINGS.planner.phases[p]}
          </li>
        ))}
      </ol>
      {drawerOpen && (
        <div className="search-drawer" role="dialog" aria-modal="false" aria-label={STRINGS.planner.searchTitle} data-testid="search-drawer">
          <div className="search-drawer-head">
            <h2 className="panel-title">{STRINGS.planner.searchTitle}</h2>
            <button type="button" className="btn ghost" onClick={() => setDrawerOpen(false)}>
              {STRINGS.planner.closeSearch}
            </button>
          </div>
          <CompareView />
        </div>
      )}
    </div>
  );
}
