"""Informe de un plan (T1.5.c): métricas de 5.5 y figura de horizonte + cinta de tiempo de la ventana.

    python -m pipeline.report_site --site malapert_massif --arrival 2027-03-10 --window 7 [--out ruta.png]

Lee las salidas de pipeline/out/ (ephemeris, horizon, visibility, windows). Colores de la spec 9.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from pipeline import config
from pipeline.ephemeris import load_series
from pipeline.horizon import load_mask
from pipeline.windows import longest_run, samples_per_day

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "pipeline" / "out"
SUN, EARTH, DARK, BOTH, BG, PANEL, TEXT = "#ffb347", "#4aa3ff", "#1a2238", "#9be3a6", "#0b0f1a", "#121a2b", "#e6edf7"


def plan_slice(arrival: datetime, window_days: int) -> slice:
    start, _ = config.timeseries_range()
    spd = samples_per_day(config.STEP_MIN)
    d0 = (arrival - start).days
    return slice(d0 * spd, (d0 + window_days) * spd)


def main(argv=None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--site", required=True)
    ap.add_argument("--arrival", required=True, help="AAAA-MM-DD (llegada a las 00:00 UTC)")
    ap.add_argument("--window", type=int, choices=config.WINDOW_DAYS, default=7)
    ap.add_argument("--out", type=Path)
    a = ap.parse_args(argv)

    site = next(s for s in json.loads((ROOT / "pipeline" / "sites.json").read_text(encoding="utf-8")) if s["id"] == a.site)
    arrival = datetime.strptime(a.arrival, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    rows = json.loads((OUT / "windows" / f"{a.site}_{a.window}d.json").read_text(encoding="utf-8"))["rows"]
    row = next(r for r in rows if r["start"].startswith(a.arrival))
    print(f"Plan {a.site}_{arrival:%Y%m%d}_{a.window}d — {site['name']} ({site['lat']:.3f}°, {site['lon']:.3f}°, {site['elevation_m']:.0f} m)")
    print(f"  ventana: {row['start']} + {a.window} días (llegada; lanzamiento ILLUSTRATIVE {config.TRANSIT_DAYS} días antes)")
    for k, label in [("sun_pct", "sun_pct (%)"), ("longest_dark_h", "longest_dark_h (h)"), ("earth_h_min", "earth_h_per_day_min (h)"),
                     ("earth_h_mean", "earth_h_per_day_mean (h)"), ("longest_comm_gap_h", "longest_comm_gap_h (h)"), ("score", "score [0,1]")]:
        print(f"  {label:26s} {row[k]}")

    s = load_series(a.site)
    mask = load_mask(a.site)
    f = np.load(OUT / f"flags_{a.site}.npz")
    sl = plan_slice(arrival, a.window)
    sun_v, earth_v = f["sun_vis"][sl].astype(bool), f["earth_vis"][sl].astype(bool)
    # comprobación de coherencia: las métricas del JSON salen de las mismas banderas
    assert abs(100 * sun_v.mean() - row["sun_pct"]) < 0.01
    assert abs(longest_run(~sun_v) * config.STEP_MIN / 60 - row["longest_dark_h"]) < 0.01

    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig = plt.figure(figsize=(13, 6), dpi=110, facecolor=BG)
    ax = fig.add_axes([0.06, 0.36, 0.9, 0.56], facecolor=BG)
    az = np.arange(360.0)
    ax.fill_between(np.append(az, 360), np.append(mask, mask[0]), -30, color="#3a4256")
    ax.plot(s["sun_az"][sl], s["sun_el"][sl], ".", ms=1.5, color=SUN, label="Sun (window)")
    ax.plot(s["earth_az"][sl], s["earth_el"][sl], ".", ms=1.5, color=EARTH, label="Earth (window)")
    lo = min(-4.0, float(mask.min()), float(np.min(s["sun_el"][sl])), float(np.min(s["earth_el"][sl]))) - 0.5
    ax.set_xlim(0, 360); ax.set_ylim(lo, max(8, float(np.max(s["earth_el"][sl])) + 1))
    ax.set_xticks(range(0, 361, 45)); ax.set_xticklabels(["N", "45", "E", "135", "S", "225", "W", "315", "N"], color=TEXT)
    ax.tick_params(colors=TEXT); [sp.set_color("#3a4256") for sp in ax.spines.values()]
    ax.set_ylabel("elevation (deg)", color=TEXT)
    ax.set_title(f"{site['name']} — arrival {a.arrival}, {a.window}-day window: sun {row['sun_pct']:.1f} %, "
                 f"longest dark {row['longest_dark_h']:.1f} h, Earth {row['earth_h_mean']:.1f} h/day, score {row['score']:.2f}",
                 color=TEXT, fontsize=10)
    ax.legend(loc="upper right", fontsize=8, markerscale=6, facecolor=PANEL, labelcolor=TEXT)
    rb = fig.add_axes([0.06, 0.1, 0.9, 0.14], facecolor=BG)
    state = np.where(sun_v & earth_v, 3, np.where(sun_v, 1, np.where(earth_v, 2, 0)))
    cmap = matplotlib.colors.ListedColormap([DARK, SUN, EARTH, BOTH])
    days = a.window
    rb.imshow(state[None, :], aspect="auto", cmap=cmap, vmin=0, vmax=3, extent=(0, days, 0, 1))
    # racha de oscuridad más larga resaltada
    dark = ~sun_v
    if dark.any():
        padded = np.concatenate([[False], dark, [False]])
        e = np.flatnonzero(np.diff(padded.astype(np.int8)))
        k = int(np.argmax(e[1::2] - e[::2]))
        t0, t1 = e[::2][k] * config.STEP_MIN / 1440, e[1::2][k] * config.STEP_MIN / 1440
        rb.add_patch(plt.Rectangle((t0, 0), t1 - t0, 1, fill=False, ec="white", lw=1.5, hatch="//"))
    rb.set_yticks([]); rb.tick_params(colors=TEXT); rb.set_xlabel("days since arrival", color=TEXT)
    rb.set_title("timeline: both (green) / sun only (orange) / Earth only (blue) / none (dark); hatched = longest dark",
                 color=TEXT, fontsize=8)
    out = a.out or OUT / "reports" / f"report_{a.site}_{arrival:%Y%m%d}_{a.window}d.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out, facecolor=BG)
    plt.close(fig)
    print(f"  figura: {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
