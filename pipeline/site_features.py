"""Características del sitio (spec 5.10; contrato §12; D10).

Pendiente: gradiente central del DEM sobre la malla proyectada, corregido por el factor de escala de la
estereográfica polar (k = 2 / (1 + sen|φ|) con lat_ts = −90°): distancias del mapa = k · distancias reales,
así que pendiente real = atan(k · |∇z|) y el radio de referencia en el mapa es k · radio.
"""

from __future__ import annotations

import numpy as np

from pipeline import config
from pipeline.dem import DemWindow


def polar_scale_factor(lat_deg: float) -> float:
    """Factor de escala de la estereográfica polar sur con escala real en el polo."""
    return 2.0 / (1.0 + np.sin(np.radians(abs(lat_deg))))


def slope_deg_grid(window: DemWindow, k: float) -> np.ndarray:
    """Pendiente real (grados) en cada píxel de la ventana (bordes NaN)."""
    z = window.z.astype(np.float64)
    dz_dy, dz_dx = np.gradient(z, window.res)  # por metro de mapa (filas de norte a sur: signo irrelevante en |∇z|)
    s = np.degrees(np.arctan(k * np.hypot(dz_dx, dz_dy)))
    s[0, :] = s[-1, :] = s[:, 0] = s[:, -1] = np.nan
    return s


def slope_stats(window: DemWindow, x: float, y: float, lat_deg: float,
                radius_m: float = config.SLOPE_RADIUS_M) -> dict:
    """Pendiente media y máxima (grados) en un círculo de radio real `radius_m` alrededor de (x, y)."""
    k = polar_scale_factor(lat_deg)
    s = slope_deg_grid(window, k)
    rows, cols = np.mgrid[0:s.shape[0], 0:s.shape[1]]
    px = window.transform.c + (cols + 0.5) * window.res
    py = window.transform.f - (rows + 0.5) * window.res
    inside = (np.hypot(px - x, py - y) <= k * radius_m) & np.isfinite(s)
    if inside.sum() < 9:
        raise ValueError("muy pocos píxeles dentro del radio de referencia")
    return {"slope_mean_deg": float(np.mean(s[inside])), "slope_max_deg": float(np.max(s[inside])),
            "n_pixels": int(inside.sum()), "scale_factor": k}
