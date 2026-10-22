import { useEffect, useRef, useState } from "react";
import { timelineOf } from "../lib/mission";
import { STRINGS } from "../lib/strings";
import { appStore } from "../store/appStore";
import { sceneBridge, type PlanSpec } from "./bridge";
import { ErrorMessage } from "../components/ErrorMessage";
import { DataError } from "../lib/data";
import { describeError } from "../lib/errors";

/**
 * Hosts the 3D scene. three.js is loaded on demand with a dynamic import (its own chunk), the first time the
 * live view opens; later openings reuse the cached module and the same WebGL context (renderer.ts).
 * While the user drives the camera (drag, wheel, arrow keys), a button gives it back to the director.
 */
export function SceneHost() {
  const ref = useRef<HTMLDivElement>(null);
  const control = useRef<{ unmount(): void; resumeCamera(): void; setPlan(p: PlanSpec): void } | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  // a data failure (network, file) is not a WebGL failure: different message, and it can be retried (T5.2.b)
  const [failure, setFailure] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [cameraMode, setCameraMode] = useState<"director" | "manual">("director");

  useEffect(() => {
    let cancelled = false;
    const st = appStore.getState();
    const plan = st.selectedPlanId ? st.plansById.get(st.selectedPlanId) : undefined;
    Promise.all([import("./renderer"), st.data.scene(), plan ? st.data.trajectory(plan.trajectory_id) : Promise.resolve(null)])
      .then(([{ mountScene }, eph, trajectory]) => {
        if (cancelled || !ref.current) return;
        const fallback = Date.parse(eph.start_utc);
        control.current = mountScene(ref.current, {
          eph,
          getTimeMs: () => appStore.getState().missionTime ?? fallback,
          baseUrl: import.meta.env.BASE_URL,
          trajectory,
          timeline: plan && trajectory ? timelineOf(plan, trajectory) : null,
          onCameraModeChange: setCameraMode,
          onScaleChange: (s) => appStore.getState().setSceneScale(s),
          siteId: plan?.site_id,
          loadTerrain: (siteId, lod) => st.data.terrain(siteId, lod),
          reducedMotion: () => appStore.getState().reducedMotion,
        });
        sceneBridge.setPlan = (p) => control.current?.setPlan(p); // plan switch from the thumbnails (T4.4.b)
        setStatus("ready");
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setFailure(e);
        setStatus("error");
      });
    return () => {
      cancelled = true;
      sceneBridge.setPlan = null;
      control.current?.unmount();
      control.current = null;
    };
  }, [attempt]);

  return (
    <div ref={ref} className="scene-host" data-testid="scene-host" data-status={status} data-camera={cameraMode}>
      {status === "loading" && <p className="scene-status">{STRINGS.live.loading}</p>}
      {status === "error" &&
        (failure instanceof DataError ? (
          <div className="scene-status">
            <ErrorMessage
              what={STRINGS.errors.scene}
              info={describeError(failure)}
              onRetry={() => {
                setFailure(null);
                setStatus("loading");
                setAttempt((n) => n + 1);
              }}
            />
          </div>
        ) : (
          <p className="scene-status" role="alert">
            {STRINGS.live.error}
          </p>
        ))}
      {status === "ready" && cameraMode === "manual" && (
        <button type="button" className="btn scene-camera-btn" onClick={() => control.current?.resumeCamera()}>
          {STRINGS.live.guided}
        </button>
      )}
    </div>
  );
}
