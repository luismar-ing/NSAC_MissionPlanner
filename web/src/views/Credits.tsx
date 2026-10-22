import { useEffect, useRef } from "react";
import { DATA_CREDITS, NOT_DATA, SOFTWARE_CREDITS } from "../lib/credits";
import { STRINGS } from "../lib/strings";

/**
 * "About & credits" (rule 12, T5.3.b): every data source with its citation, files, links and licence, what is
 * not real data, and the software licences. A modal dialog: focus moves into it, Esc or the button closes it.
 */
export function Credits({ onClose }: { onClose(): void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault(); // the live view's Esc must not also fire
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div className="credits-backdrop" onClick={onClose}>
      <div
        ref={ref}
        className="credits"
        role="dialog"
        aria-modal="true"
        aria-labelledby="credits-title"
        tabIndex={-1}
        data-testid="credits"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="credits-head">
          <h2 id="credits-title">{STRINGS.credits.title}</h2>
          <button type="button" className="btn" onClick={onClose}>
            {STRINGS.credits.close}
          </button>
        </div>
        <p>{STRINGS.credits.intro}</p>

        <h3>{STRINGS.credits.data}</h3>
        <ul className="credits-list">
          {DATA_CREDITS.map((c) => (
            <li key={c.source}>
              <strong>{c.what}</strong>
              <span>{c.source}</span>
              {c.citation && <span className="muted">{c.citation}</span>}
              {c.items && <span className="mono muted">{c.items.join(" · ")}</span>}
              <span className="credits-links">
                {c.urls.map((u) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer">
                    {u}
                  </a>
                ))}
              </span>
              <span className="muted">
                {STRINGS.credits.license}: {c.license}
              </span>
            </li>
          ))}
        </ul>

        <h3>{STRINGS.credits.notData}</h3>
        <ul>
          {NOT_DATA.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>

        <h3>{STRINGS.credits.software}</h3>
        <p className="muted">{STRINGS.credits.softwareNote}</p>
        <div className="credits-software">
          {(["app", "pipeline"] as const).map((k) => (
            <table key={k}>
              <caption>{STRINGS.credits.softwareGroup[k]}</caption>
              <tbody>
                {SOFTWARE_CREDITS[k].map((s) => (
                  <tr key={s.name}>
                    <th scope="row">{s.name}</th>
                    <td className="mono">{s.version}</td>
                    <td>{s.license}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
      </div>
    </div>
  );
}
