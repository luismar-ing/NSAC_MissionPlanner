import { useEffect, useRef, useState } from "react";
import { STRINGS } from "../lib/strings";
import { appStore } from "../store/appStore";

/**
 * Hosts the 3D scene. three.js is loaded on demand with a dynamic import (its own chunk), the first time the
 * live view opens; later openings reuse the cached module and the same WebGL context (renderer.ts).
 */
export function SceneHost() {
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let unmount: (() => void) | null = null;
    let cancelled = false;
    const st = appStore.getState();
    Promise.all([import("./renderer"), st.data.scene()])
      .then(([{ mountScene }, eph]) => {
        if (cancelled || !ref.current) return;
        const fallback = Date.parse(eph.start_utc);
        unmount = mountScene(ref.current, {
          eph,
          getTimeMs: () => appStore.getState().missionTime ?? fallback,
          baseUrl: import.meta.env.BASE_URL,
        });
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
      unmount?.();
    };
  }, []);

  return (
    <div ref={ref} className="scene-host" data-testid="scene-host" data-status={status} role="img" aria-label={STRINGS.live.sceneAria}>
      {status === "loading" && <p className="scene-status">{STRINGS.live.loading}</p>}
      {status === "error" && (
        <p className="scene-status" role="alert">
          {STRINGS.live.error}
        </p>
      )}
    </div>
  );
}
