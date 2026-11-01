import { useEffect, useRef, type ReactNode } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, canvas[tabindex], [tabindex]:not([tabindex="-1"])';

/**
 * Side panel over the 3D scene (TR.2.c): a modal dialog that slides in from the right. Focus moves into it,
 * Tab stays inside, Esc and the backdrop close it, and focus returns to what opened it. Esc is marked as
 * handled, so the live view's own Esc (back to planning) does not also fire.
 */
export function Drawer({ title, closeLabel, onClose, children, testId }: { title: string; closeLabel: string; onClose(): void; children: ReactNode; testId?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>(".drawer-close")?.focus();
    return () => opener?.focus?.();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault(); // marks the native event too: the live view's window listener skips it
      onClose();
      return;
    }
    if (e.key !== "Tab" || !ref.current) return;
    const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <div className="drawer-scrim" aria-hidden="true" onClick={onClose} />
      <div ref={ref} className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" data-testid={testId} onKeyDown={onKeyDown}>
        <div className="drawer-head">
          <h2 id="drawer-title" className="drawer-title">
            {title}
          </h2>
          <button type="button" className="btn ghost drawer-close" onClick={onClose} aria-keyshortcuts="Escape">
            {closeLabel}
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
