"""Efemérides del sitio: posición del Sol y la Tierra en el marco local ENU (spec 5.1).

Marco lunar: MOON_ME (Tierra media / eje polar). Es el marco del DEM LOLA (MOON_ME de DE421)
y el de los sitios de Horizons («MEAN_ME»); en nuestros kernels, MOON_ME = MOON_ME_DE440_ME421.
Ver docs/validation.md §1.
"""

from __future__ import annotations

import numpy as np

from pipeline import config

MOON_FRAME = "MOON_ME"
R_REF_KM = 1737.4  # esfera de referencia de las alturas del DEM LOLA y de Horizons


def observer_position_km(lat_deg: float, lon_deg: float, elevation_m: float, h_obs_m: float = config.H_OBS_M) -> np.ndarray:
    """Posición del observador en MOON_ME (km): radio = 1737.4 km + elevación del DEM + h_obs.

    Coordenadas planetocéntricas (latitud y longitud este), sobre la esfera de referencia.
    """
    r = R_REF_KM + (elevation_m + h_obs_m) / 1000.0
    lat, lon = np.radians(lat_deg), np.radians(lon_deg)
    return r * np.array([np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat)])


def enu_basis(lat_deg: float, lon_deg: float) -> np.ndarray:
    """Matriz 3 × 3 cuyas filas son E, N, U del sitio, expresadas en MOON_ME.

    U es radial (cenit de la esfera de referencia, como el «local zenith» de Horizons), N apunta
    hacia el polo norte a lo largo del meridiano y E = N × U, de modo que E × N = U (marco directo).
    Un vector v en MOON_ME pasa a ENU con enu_basis(...) @ v.
    """
    lat, lon = np.radians(lat_deg), np.radians(lon_deg)
    sl, cl, so, co = np.sin(lat), np.cos(lat), np.sin(lon), np.cos(lon)
    e = np.array([-so, co, 0.0])
    n = np.array([-sl * co, -sl * so, cl])
    u = np.array([cl * co, cl * so, sl])
    return np.vstack([e, n, u])


def az_el_deg(v_enu: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Azimut (desde el Norte hacia el Este, [0, 360)) y elevación (grados) de vectores ENU (..., 3)."""
    v = np.asarray(v_enu, dtype=float)
    az = np.degrees(np.arctan2(v[..., 0], v[..., 1])) % 360.0
    el = np.degrees(np.arctan2(v[..., 2], np.hypot(v[..., 0], v[..., 1])))
    return az, el
