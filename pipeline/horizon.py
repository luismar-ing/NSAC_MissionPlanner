"""Máscara de horizonte por sitio (spec 5.2; contrato §6).

Por cada bin de azimut i (az = i · az_step, desde el Norte local hacia el Este) se traza un rayo sobre
la esfera hasta R_max y, en cada paso a distancia d con altura z(d):

    elev = atan2(z(d) − z0 − h_obs − d² / (2·R_luna), d)        horizon_el[i] = max_d elev

Recorte (5.2, paso 3): por defecto NO se recorta a 0 (`clip_negative = False`). En cumbres altas
(Malapert, Nobile) el horizonte real queda por debajo de 0°; recortarlo marcaría como oscuro un Sol
que sí se ve. La elección se escribe en manifest.params.horizon.clip_negative.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

from pipeline import config
from pipeline.dem import R_MOON_M, DemWindow, ray_points_xy

CLIP_NEGATIVE = False


def compute_mask(window: DemWindow, lat_deg: float, lon_deg: float, z0_m: float,
                 h_obs_m: float = config.H_OBS_M, az_step_deg: float = config.HORIZON_AZ_STEP_DEG,
                 r_max_m: float = config.HORIZON_R_MAX_KM * 1000.0, step_m: float | None = None,
                 clip_negative: bool = CLIP_NEGATIVE, az_chunk: int = 45) -> np.ndarray:
    """Elevación del horizonte (grados) en los azimuts i · az_step, i = 0 … 360/az_step − 1.

    step_m: paso del rayo (por defecto, el tamaño de píxel de la ventana). Los rayos se procesan
    en bloques de azimuts para limitar la memoria.
    """
    n_az = int(round(360.0 / az_step_deg))
    step = window.res if step_m is None else step_m
    d = np.arange(1, int(np.floor(r_max_m / step)) + 1) * step
    drop = d**2 / (2.0 * R_MOON_M)
    out = np.empty(n_az)
    for start in range(0, n_az, az_chunk):
        az = np.arange(start, min(start + az_chunk, n_az)) * az_step_deg
        x, y = ray_points_xy(lat_deg, lon_deg, az, d)
        z = window.sample(x, y)
        if np.isnan(z).any():
            bad = az[np.isnan(z).any(axis=1)]
            raise ValueError(f"la ventana del DEM no cubre R_max en los azimuts {bad[:5]}…; amplía la ventana")
        elev = np.degrees(np.arctan2(z - z0_m - h_obs_m - drop[None, :], d[None, :]))
        out[start:start + len(az)] = elev.max(axis=1)
    return np.maximum(out, 0.0) if clip_negative else out


def site_mask(site: dict, r_max_m: float = config.HORIZON_R_MAX_KM * 1000.0, **kw) -> tuple[np.ndarray, dict]:
    """Máscara de un sitio de sites.json con el DEM real. Devuelve (elev_deg, tiempos en s)."""
    import time

    from pipeline.dem import latlon_to_xy

    t0 = time.perf_counter()
    x, y = latlon_to_xy(site["lat"], site["lon"])
    window = DemWindow.read(x, y, r_max_m + 1_000.0)
    t1 = time.perf_counter()
    z0 = float(window.sample(np.array([x]), np.array([y]))[0])
    mask = compute_mask(window, site["lat"], site["lon"], z0, r_max_m=r_max_m, **kw)
    t2 = time.perf_counter()
    return mask, {"read_s": t1 - t0, "compute_s": t2 - t1, "z0_m": z0, "window_px": window.z.shape}


OUT_DIR = Path(__file__).with_name("out")


def save_mask(site_id: str, mask: np.ndarray, z0_m: float) -> Path:
    """Intermedio pipeline/out/horizon_{sitio}.npz (el JSON del contrato lo escribe build_all, T2.4.a)."""
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / f"horizon_{site_id}.npz"
    np.savez_compressed(path, elev_deg=mask, z0_m=z0_m, az_step_deg=config.HORIZON_AZ_STEP_DEG,
                        h_obs_m=config.H_OBS_M, r_max_km=config.HORIZON_R_MAX_KM, clip_negative=CLIP_NEGATIVE)
    return path


def load_mask(site_id: str) -> np.ndarray:
    return np.load(OUT_DIR / f"horizon_{site_id}.npz")["elev_deg"]


def plot_mask(site: dict, mask: np.ndarray, path: Path) -> None:
    """Figura de verificación: silueta lineal con las trayectorias anuales del Sol y la Tierra, y vista polar."""
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    from pipeline.ephemeris import load_series

    az = np.arange(mask.size) * config.HORIZON_AZ_STEP_DEG
    fig = plt.figure(figsize=(14, 4.8), dpi=110)
    ax = fig.add_axes([0.05, 0.12, 0.62, 0.78])
    try:
        s = load_series(site["id"])
        ax.scatter(s["earth_az"], s["earth_el"], s=0.2, color="#4aa3ff", alpha=0.25, label="Earth (1 year, 30 min)")
        ax.scatter(s["sun_az"], s["sun_el"], s=0.2, color="#ffb347", alpha=0.25, label="Sun (1 year, 30 min)")
    except FileNotFoundError:
        pass
    ax.fill_between(np.append(az, 360), np.append(mask, mask[0]), -15, color="#5a5a5a", alpha=0.9, label="terrain (horizon mask)")
    ax.plot(np.append(az, 360), np.append(mask, mask[0]), color="black", lw=0.8)
    ax.axhline(0, color="k", lw=0.4, ls=":")
    lo = min(mask.min(), -3.0) - 1
    ax.set_xlim(0, 360); ax.set_ylim(lo, 12)
    ax.set_xticks(range(0, 361, 45)); ax.set_xticklabels(["N", "45", "E", "135", "S", "225", "W", "315", "N"])
    ax.set_xlabel("azimuth (deg from local north, eastward)"); ax.set_ylabel("elevation (deg)")
    ax.set_title(f"{site['name']}: horizon mask (LOLA 40 m, R_max {config.HORIZON_R_MAX_KM:.0f} km, h_obs {config.H_OBS_M:.0f} m); "
                 f"max {mask.max():+.2f}° at az {int(np.argmax(mask))}°", fontsize=9)
    ax.legend(loc="upper right", fontsize=7, markerscale=20)
    pax = fig.add_axes([0.70, 0.08, 0.28, 0.84], projection="polar")
    pax.set_theta_zero_location("N"); pax.set_theta_direction(-1)
    pax.plot(np.radians(np.append(az, 360)), np.append(mask, mask[0]) - lo, color="black", lw=1)
    pax.fill_between(np.radians(np.append(az, 360)), 0, np.append(mask, mask[0]) - lo, color="#5a5a5a", alpha=0.6)
    pax.set_rlabel_position(135)
    ticks = np.arange(np.ceil(lo), 3)
    pax.set_rticks(ticks - lo); pax.set_yticklabels([f"{v:.0f}°" for v in ticks], fontsize=6)
    pax.set_title("polar view (radius = elevation)", fontsize=8)
    fig.savefig(path)
    plt.close(fig)


def main(argv=None) -> int:
    import argparse
    import json
    import sys
    import time
    from pathlib import Path

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="Máscaras de horizonte de los sitios (T1.2.d/e)")
    ap.add_argument("--site", help="solo este sitio (id de sites.json)")
    ap.add_argument("--no-plots", action="store_true")
    args = ap.parse_args(argv)
    root = Path(__file__).resolve().parents[1]
    sites = json.loads((root / "pipeline" / "sites.json").read_text(encoding="utf-8"))
    if args.site:
        sites = [s for s in sites if s["id"] == args.site]
    t_all = time.perf_counter()
    for site in sites:
        mask, t = site_mask(site)
        save_mask(site["id"], mask, t["z0_m"])
        if not args.no_plots:
            plot_mask(site, mask, root / "docs" / "figures" / f"horizon_{site['id']}.png")
        print(f"{site['id']:18s} lectura {t['read_s']:5.1f} s  cálculo {t['compute_s']:5.1f} s  "
              f"ventana {t['window_px'][0]}×{t['window_px'][1]} px  z0 {t['z0_m']:7.1f} m  "
              f"máscara [{mask.min():+6.2f}, {mask.max():+6.2f}]°  (máx en az {int(np.argmax(mask))}°)")
    print(f"Total {time.perf_counter() - t_all:.1f} s para {len(sites)} sitio(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
