"""Máscara de horizonte por sitio (spec 5.2; contrato §6).

Por cada bin de azimut i (az = i · az_step, desde el Norte local hacia el Este) se traza un rayo sobre
la esfera hasta R_max y, en cada paso a distancia d con altura z(d):

    elev = atan2(z(d) − z0 − h_obs − d² / (2·R_luna), d)        horizon_el[i] = max_d elev

Recorte (5.2, paso 3): por defecto NO se recorta a 0 (`clip_negative = False`). En cumbres altas
(Malapert, Nobile) el horizonte real queda por debajo de 0°; recortarlo marcaría como oscuro un Sol
que sí se ve. La elección se escribe en manifest.params.horizon.clip_negative.
"""

from __future__ import annotations

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
    args = ap.parse_args(argv)
    root = Path(__file__).resolve().parents[1]
    sites = json.loads((root / "pipeline" / "sites.json").read_text(encoding="utf-8"))
    if args.site:
        sites = [s for s in sites if s["id"] == args.site]
    t_all = time.perf_counter()
    for site in sites:
        mask, t = site_mask(site)
        print(f"{site['id']:18s} lectura {t['read_s']:5.1f} s  cálculo {t['compute_s']:5.1f} s  "
              f"ventana {t['window_px'][0]}×{t['window_px'][1]} px  z0 {t['z0_m']:7.1f} m  "
              f"máscara [{mask.min():+6.2f}, {mask.max():+6.2f}]°  (máx en az {int(np.argmax(mask))}°)")
    print(f"Total {time.perf_counter() - t_all:.1f} s para {len(sites)} sitio(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
