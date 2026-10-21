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


def earth_visible(earth_az_deg: np.ndarray, earth_el_deg: np.ndarray, elev_deg: np.ndarray,
                  az_step_deg: float = config.HORIZON_AZ_STEP_DEG,
                  antenna_margin_deg: float = config.ANTENNA_MARGIN_DEG) -> np.ndarray:
    """Spec 5.4: enlace directo si el centro de la Tierra supera la máscara más el margen de antena.

    earth_visible = earth_el > horizon_el[earth_az] + margen_antena   → array de 0/1 (uint8)
    """
    mask = horizon_at(earth_az_deg, elev_deg, az_step_deg)
    return (np.asarray(earth_el_deg, dtype=float) > mask + antenna_margin_deg).astype(np.uint8)


def earth_partial(earth_az_deg: np.ndarray, earth_el_deg: np.ndarray, elev_deg: np.ndarray,
                  az_step_deg: float = config.HORIZON_AZ_STEP_DEG,
                  antenna_margin_deg: float = config.ANTENNA_MARGIN_DEG,
                  earth_radius_deg: float = config.EARTH_RADIUS_DEG) -> np.ndarray:
    """Spec 5.4 (opcional): visibilidad parcial = sin enlace por el criterio del centro, pero con el
    borde superior de la Tierra sobre la máscara (sin margen). Solo informativo: no cuenta como enlace.
    """
    el = np.asarray(earth_el_deg, dtype=float)
    mask = horizon_at(earth_az_deg, elev_deg, az_step_deg)
    no_link = el <= mask + antenna_margin_deg
    return (no_link & (el + earth_radius_deg > mask)).astype(np.uint8)


def sun_disk_fraction(sun_az_deg: np.ndarray, sun_el_deg: np.ndarray, elev_deg: np.ndarray,
                      az_step_deg: float = config.HORIZON_AZ_STEP_DEG,
                      sun_radius_deg: float = config.SUN_RADIUS_DEG, columns: int = 41) -> np.ndarray:
    """Spec 5.3 (rigor extra): fracción del disco solar por encima de la máscara, en [0, 1].

    El disco se integra por columnas verticales: en cada desplazamiento horizontal x ∈ [−r, r]
    la cuerda va de el − √(r² − x²) a el + √(r² − x²), y se cuenta la parte por encima de la
    máscara en el azimut az + x / cos(el). Así una máscara inclinada dentro del disco cuenta.
    Con una máscara plana coincide con la fórmula del segmento circular (prueba).
    """
    az = np.asarray(sun_az_deg, dtype=float)[..., None]
    el = np.asarray(sun_el_deg, dtype=float)[..., None]
    r = sun_radius_deg
    # Regla del punto medio en x (evita las columnas de cuerda nula en ±r)
    x = (np.arange(columns) + 0.5) / columns * 2 * r - r
    half = np.sqrt(r**2 - x**2)
    mask = horizon_at(az + x / np.cos(np.radians(el)), elev_deg, az_step_deg)
    visible = np.clip(el + half - np.maximum(el - half, mask), 0.0, None)
    return (visible * (2 * r / columns)).sum(axis=-1) / (np.pi * r**2) * _area_correction(columns)


def _area_correction(columns: int) -> float:
    """Normaliza el error de la regla del punto medio para que un disco libre dé exactamente 1."""
    x = (np.arange(columns) + 0.5) / columns * 2 - 1
    return np.pi / (2 * np.sqrt(1 - x**2) * (2 / columns)).sum()


def sun_day_from_fraction(fraction: np.ndarray, threshold: float = config.SUN_FRACTION_THRESHOLD) -> np.ndarray:
    """Spec 5.3: «día» si la fracción visible supera el umbral (0.5 por defecto)  → 0/1 (uint8)."""
    return (np.asarray(fraction) > threshold).astype(np.uint8)
