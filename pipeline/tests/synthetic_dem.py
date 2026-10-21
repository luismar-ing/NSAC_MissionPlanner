"""DEM SYNTHETIC de prueba para la máscara de horizonte (spec 5.2, notas; T1.2.b).

Un llano a altura 0 con un borde de cráter anular: una pared de cima plana entre los radios
D − w/2 y D + w/2 alrededor del observador, con altura H(az) que puede variar con el azimut.
Mismo formato que el DEM real (T0.2.d): GeoTIFF float32 en estereográfica polar sur sobre
la esfera de 1 737 400 m, alturas en m sobre esa esfera y nodata NaN.

No es un dato científico: solo sirve para comprobar el algoritmo contra una solución analítica.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import numpy as np
import rasterio
from rasterio.transform import from_origin

R_MOON_M = 1_737_400.0
POLAR_CRS = "+proj=stere +lat_0=-90 +lat_ts=-90 +lon_0=0 +x_0=0 +y_0=0 +R=1737400 +units=m +no_defs"


@dataclass(frozen=True)
class Crater:
    """Borde anular centrado en el observador (x0, y0) del mapa."""

    rim_radius_m: float  # D: radio del centro de la pared
    rim_width_m: float  # w: anchura de la cima plana
    rim_height: Callable[[np.ndarray], np.ndarray] | float  # H en m (o función del azimut en grados)
    floor_m: float = 0.0  # altura del llano, incluido el punto del observador
    x0_m: float = 0.0
    y0_m: float = 0.0

    def height_at_az(self, az_deg: np.ndarray) -> np.ndarray:
        h = self.rim_height
        return np.asarray(h(az_deg) if callable(h) else np.full_like(np.asarray(az_deg, dtype=float), h), dtype=float)


def grid_azimuth_deg(dx: np.ndarray, dy: np.ndarray) -> np.ndarray:
    """Azimut del mapa desde el observador: 0° = +y del mapa, creciendo hacia +x.

    Es una convención del DEM sintético (el «norte» local real en el polo depende de la
    longitud y lo resuelve T1.2.a). Para estas pruebas solo importa que generador y
    solución analítica usen la misma.
    """
    return np.degrees(np.arctan2(dx, dy)) % 360.0


def make_crater_dem(crater: Crater, half_extent_m: float, pixel_m: float) -> tuple[np.ndarray, rasterio.Affine]:
    """Raster (filas de norte a sur) y transform afín, como el DEM real."""
    n = int(round(2 * half_extent_m / pixel_m))
    left, top = crater.x0_m - half_extent_m, crater.y0_m + half_extent_m
    transform = from_origin(left, top, pixel_m, pixel_m)
    cols = left + (np.arange(n) + 0.5) * pixel_m  # centros de píxel
    rows = top - (np.arange(n) + 0.5) * pixel_m
    x, y = np.meshgrid(cols, rows)
    dx, dy = x - crater.x0_m, y - crater.y0_m
    r = np.hypot(dx, dy)
    z = np.full(r.shape, crater.floor_m, dtype=np.float32)
    on_rim = np.abs(r - crater.rim_radius_m) <= crater.rim_width_m / 2
    z[on_rim] = crater.height_at_az(grid_azimuth_deg(dx[on_rim], dy[on_rim])).astype(np.float32)
    return z, transform


def write_geotiff(path: Path, z: np.ndarray, transform: rasterio.Affine) -> Path:
    profile = dict(driver="GTiff", width=z.shape[1], height=z.shape[0], count=1, dtype="float32",
                   crs=POLAR_CRS, transform=transform, nodata=float("nan"))
    with rasterio.open(path, "w", **profile) as ds:
        ds.write(z.astype(np.float32), 1)
    return path


def elevation_angle_deg(dz_m: float | np.ndarray, d_m: float | np.ndarray, h_obs_m: float) -> np.ndarray:
    """Fórmula de 5.2: atan2(z(d) − z0 − h_obs − d²/(2·R_luna), d), en grados."""
    d = np.asarray(d_m, dtype=float)
    return np.degrees(np.arctan2(np.asarray(dz_m, dtype=float) - h_obs_m - d**2 / (2 * R_MOON_M), d))


def expected_horizon_deg(crater: Crater, az_deg: np.ndarray, h_obs_m: float, r_max_m: float,
                         clip_negative: bool = True) -> np.ndarray:
    """Solución analítica de la máscara para el cráter sintético.

    Candidatos por azimut: la cima de la pared (su borde interior da el máximo cuando la
    pared sobresale, pero se toma el máximo exacto sobre el intervalo) y el llano más allá
    de la pared hasta r_max (valores negativos por la curvatura y h_obs).
    """
    az = np.atleast_1d(np.asarray(az_deg, dtype=float))
    H = crater.height_at_az(az) - crater.floor_m
    d_in = crater.rim_radius_m - crater.rim_width_m / 2
    d_out = min(crater.rim_radius_m + crater.rim_width_m / 2, r_max_m)
    best = np.full(az.shape, -90.0)
    if d_in <= r_max_m:
        # En la cima (dz = H constante) el ángulo es unimodal en d: basta un muestreo fino del intervalo.
        d = np.linspace(d_in, d_out, 2001)[None, :]
        best = np.maximum(best, elevation_angle_deg(H[:, None], d, h_obs_m).max(axis=1))
    # Llano (dz = 0) entre el observador y r_max, fuera de la pared. Sin pared, el máximo
    # está en d* = sqrt(2·R·h_obs); se incluye d* explícitamente en un muestreo fino.
    d_star = math.sqrt(2 * R_MOON_M * h_obs_m)
    d_flat = np.unique(np.concatenate([np.geomspace(1.0, r_max_m, 20001), [min(d_star, r_max_m)]]))
    d_flat = d_flat[(d_flat < d_in) | (d_flat > crater.rim_radius_m + crater.rim_width_m / 2)]
    if d_flat.size:
        best = np.maximum(best, float(elevation_angle_deg(0.0, d_flat, h_obs_m).max()))
    return np.maximum(best, 0.0) if clip_negative else best
