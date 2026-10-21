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
