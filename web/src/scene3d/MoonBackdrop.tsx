import { useEffect, useRef } from "react";
import { appStore } from "../store/appStore";

/**
 * Hosts the landing page Moon (backdrop.ts) on the shared WebGL renderer, loaded on demand. Until the texture
 * is on the sphere, or when WebGL is missing, the static Moon image behind it stays visible (onReady).
 */
export function MoonBackdrop({ onReady }: { onReady(): void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    let control: { unmount(): void } | null = null;
    import("./backdrop")
      .then(({ mountBackdrop }) => {
        if (cancelled || !ref.current) return;
        control = mountBackdrop(ref.current, {
          baseUrl: import.meta.env.BASE_URL,
          reducedMotion: () => appStore.getState().reducedMotion,
          onReady: () => !cancelled && onReady(),
        });
      })
      .catch(() => {}); // no WebGL: the static image is the backdrop
    return () => {
      cancelled = true;
      control?.unmount();
    };
  }, [onReady]);
  return <div ref={ref} className="landing-moon-gl" data-testid="moon-backdrop" />;
}
