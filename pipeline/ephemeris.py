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


TARGET_NAMES = {"sun": "SUN", "earth": "EARTH"}
ABCORR = "LT+S"  # spec 5.1: corrección de tiempo de luz y aberración estelar


def et_grid(start_utc, end_utc, step_min: int) -> np.ndarray:
    """Instantes ET de [start, end) cada step_min minutos de UTC.

    Se construye sumando segundos a ET(start); es exacto mientras no haya un segundo
    intercalar dentro del rango, lo que se comprueba (no hay ninguno conocido después de 2017).
    """
    from pipeline.spice_utils import load_kernels, utc_to_et

    load_kernels()
    et0, et1 = utc_to_et(start_utc), utc_to_et(end_utc)
    duration = (end_utc - start_utc).total_seconds()
    if abs((et1 - et0) - duration) > 1e-3:
        raise ValueError("hay un segundo intercalar dentro del rango: la rejilla UTC no es uniforme en ET")
    n = int(round(duration / (step_min * 60)))
    return et0 + np.arange(n) * step_min * 60.0


def target_enu_km(site: dict, target: str, ets: np.ndarray, h_obs_m: float = config.H_OBS_M) -> np.ndarray:
    """Vector observador → objetivo en ENU (km), con LT+S, para cada instante ET.

    Observador fijo en la superficie: spiceypy.spkcpo con la posición constante del sitio en
    MOON_ME, centro MOON. Es la forma de SPICE de aplicar spkpos (spec 5.1) a un punto de la superficie:
    el tiempo de luz y la aberración se calculan desde el sitio, no desde el centro de la Luna.
    """
    import spiceypy as sp

    from pipeline.spice_utils import load_kernels

    load_kernels()
    obs = observer_position_km(site["lat"], site["lon"], site["elevation_m"], h_obs_m)
    rot = enu_basis(site["lat"], site["lon"])
    name = TARGET_NAMES[target]
    out = np.empty((len(ets), 3))
    for i, et in enumerate(ets):
        state, _ = sp.spkcpo(name, float(et), MOON_FRAME, "OBSERVER", ABCORR, obs, "MOON", MOON_FRAME)
        out[i] = state[:3]
    return out @ rot.T


def target_az_el(site: dict, target: str, ets: np.ndarray, h_obs_m: float = config.H_OBS_M):
    """Azimut y elevación (grados) del Sol o la Tierra vistos desde el sitio."""
    return az_el_deg(target_enu_km(site, target, ets, h_obs_m))


def elevation_bounds_deg(lat_deg: float) -> dict[str, float]:
    """Límites físicos de |elevación| por latitud (docs/validation.md §2; corrige el ±1.6° de 5.7)."""
    colat = 90.0 - abs(lat_deg)
    # Tierra: libración en latitud (~6.7°) + paralaje topocéntrica (≤ ~0.26°) + holgura
    return {"sun": colat + 1.6, "earth": colat + 7.5}
