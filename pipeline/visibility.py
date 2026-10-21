"""Banderas de visibilidad del Sol y la Tierra (spec 5.3 y 5.4)."""

from __future__ import annotations

import numpy as np

from pipeline import config


def horizon_at(az_deg: np.ndarray, elev_deg: np.ndarray, az_step_deg: float = config.HORIZON_AZ_STEP_DEG) -> np.ndarray:
    """Elevación de la máscara en azimuts arbitrarios.

    `elev_deg[i]` es la elevación en el azimut `i · az_step_deg` (contrato §6). Entre bins se
    interpola linealmente, con paso de 359° a 0° (envolvente circular).
    """
    elev = np.asarray(elev_deg, dtype=float)
    n = elev.size
    if abs(n * az_step_deg - 360.0) > 1e-9:
        raise ValueError(f"la máscara tiene {n} bins de {az_step_deg}°, no cubre 360°")
    pos = (np.asarray(az_deg, dtype=float) % 360.0) / az_step_deg
    i0 = np.floor(pos).astype(int) % n
    frac = pos - np.floor(pos)
    return elev[i0] * (1.0 - frac) + elev[(i0 + 1) % n] * frac


def sun_visible(sun_az_deg: np.ndarray, sun_el_deg: np.ndarray, elev_deg: np.ndarray,
                az_step_deg: float = config.HORIZON_AZ_STEP_DEG,
                sun_radius_deg: float = config.SUN_RADIUS_DEG) -> np.ndarray:
    """Spec 5.3, criterio por defecto: el borde superior del Sol está sobre la máscara.

    sun_visible = (sun_el + 0.265°) > horizon_el[sun_az]   → array de 0/1 (uint8)
    """
    mask = horizon_at(sun_az_deg, elev_deg, az_step_deg)
    return ((np.asarray(sun_el_deg, dtype=float) + sun_radius_deg) > mask).astype(np.uint8)
