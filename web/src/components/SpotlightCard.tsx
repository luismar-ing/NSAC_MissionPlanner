import type { ReactNode } from "react";

/**
 * A real <button> with a soft light that follows the pointer (design A1). The position is written to CSS
 * custom properties straight on the element, so moving the pointer does not re-render React. With the
 * keyboard, :focus-visible centres the light (tokens.css), so the effect is not mouse-only.
 */
export function SpotlightCard({ onSelect, children, className = "", ...rest }: { onSelect(): void; children: ReactNode; className?: string } & Record<`data-${string}`, string>) {
  return (
    <button
      type="button"
      className={`spotlight-card ${className}`}
      onClick={onSelect}
      onPointerMove={(e) => {
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--spot-x", `${e.clientX - r.left}px`);
        el.style.setProperty("--spot-y", `${e.clientY - r.top}px`);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
