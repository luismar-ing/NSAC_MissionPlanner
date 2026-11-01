import { useSyncExternalStore } from "react";
import { ambient, type AmbientSound } from "../lib/ambient";
import { STRINGS } from "../lib/strings";

/** Sound on/off button, shown on every screen (TR.1.c). Pressing it is the gesture that may start the pad. */
export function SoundToggle({ sound = ambient }: { sound?: AmbientSound }) {
  const on = useSyncExternalStore(sound.subscribe, () => sound.enabled);
  return (
    <button type="button" className="btn ghost sound-toggle" aria-pressed={on} title={STRINGS.sound.title} onClick={() => sound.toggle()}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M11 5 6 9H3v6h3l5 4V5z" />
        {on ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m16 9 6 6M22 9l-6 6" />}
      </svg>
      {on ? STRINGS.sound.on : STRINGS.sound.off}
    </button>
  );
}
