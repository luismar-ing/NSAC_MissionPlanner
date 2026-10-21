"""Acceso al DEM LOLA: proyección, rayos sobre la esfera y muestreo bilineal (T1.2.a; spec 5.2).

Convención del mapa (estereográfica polar sur, vista desde fuera): +y apunta al meridiano 0° y +x al
90°E. En el polo el «norte del mapa» no es el norte local, así que los rayos del horizonte no se trazan
en el plano del mapa: se trazan como círculos máximos sobre la esfera de 1 737 400 m con azimut local
(desde el Norte hacia el Este) y luego se proyectan. Dirección y distancia son exactas, sin depender
del factor de escala de la proyección.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import rasterio
from pyproj import Geod, Transformer
from rasterio.windows import Window, from_bounds

from pipeline.regions import DEM_CRS, MOON_GEO, is_dem_crs

ROOT = Path(__file__).resolve().parents[1]
DEM_PATH = ROOT / "data" / "dem" / "LDEM_80S_40MPP_ADJ.TIF"
R_MOON_M = 1_737_400.0
GEOD = Geod(a=R_MOON_M, b=R_MOON_M)
_TO_XY = Transformer.from_crs(MOON_GEO, DEM_CRS, always_xy=True)
_TO_LL = Transformer.from_crs(DEM_CRS, MOON_GEO, always_xy=True)


def latlon_to_xy(lat_deg, lon_deg):
    """Latitud y longitud (grados) → x, y del DEM (m)."""
    return _TO_XY.transform(lon_deg, lat_deg)


def xy_to_latlon(x, y):
    """x, y del DEM (m) → latitud y longitud este en [-180, 180) (grados)."""
    lon, lat = _TO_LL.transform(x, y)
    return lat, ((np.asarray(lon) + 180.0) % 360.0) - 180.0


def ray_points_xy(lat_deg: float, lon_deg: float, az_deg: np.ndarray, dist_m: np.ndarray):
    """Puntos de los rayos: círculos máximos desde el sitio con azimut local az (N→E) a distancias dist_m.

    Devuelve x, y del DEM con forma (len(az), len(dist)).
    """
    az = np.asarray(az_deg, dtype=float)
    d = np.asarray(dist_m, dtype=float)
    A, D = np.meshgrid(az, d, indexing="ij")
    lon2, lat2, _ = GEOD.fwd(np.full(A.shape, lon_deg), np.full(A.shape, lat_deg), A, D)
    x, y = _TO_XY.transform(lon2, lat2)
    return np.asarray(x), np.asarray(y)


class DemWindow:
    """Ventana del DEM en memoria con muestreo bilineal en coordenadas del mapa."""

    def __init__(self, z: np.ndarray, transform):
        self.z = np.asarray(z, dtype=np.float64)
        self.transform = transform
        self.res = transform.a
        if abs(transform.e + transform.a) > 1e-9 or transform.b or transform.d:
            raise ValueError("se esperan píxeles cuadrados, sin rotación y con filas de norte a sur")

    @classmethod
    def read(cls, x_center: float, y_center: float, half_m: float, path: Path = DEM_PATH) -> "DemWindow":
        """Lee el cuadrado [x ± half, y ± half] (más un margen de 2 píxeles)."""
        with rasterio.open(path) as ds:
            if not is_dem_crs(ds.crs):
                raise ValueError(f"CRS del DEM inesperado: {ds.crs}")
            pad = 2 * ds.res[0]
            win = from_bounds(x_center - half_m - pad, y_center - half_m - pad, x_center + half_m + pad,
                              y_center + half_m + pad, ds.transform).round_offsets().round_lengths()
            win = win.intersection(Window(0, 0, ds.width, ds.height))
            z = ds.read(1, window=win)
            return cls(z, ds.window_transform(win))

    def sample(self, x, y) -> np.ndarray:
        """Altura bilineal (m) en x, y; NaN fuera de la ventana o si algún vecino es NaN."""
        x = np.asarray(x, dtype=float)
        y = np.asarray(y, dtype=float)
        col = (x - self.transform.c) / self.res - 0.5  # coordenada continua respecto a centros de píxel
        row = (self.transform.f - y) / self.res - 0.5
        c0, r0 = np.floor(col).astype(np.int64), np.floor(row).astype(np.int64)
        fc, fr = col - c0, row - r0
        ny, nx = self.z.shape
        ok = (c0 >= 0) & (r0 >= 0) & (c0 + 1 < nx) & (r0 + 1 < ny)
        c0c, r0c = np.clip(c0, 0, nx - 2), np.clip(r0, 0, ny - 2)
        z00 = self.z[r0c, c0c]
        z01 = self.z[r0c, c0c + 1]
        z10 = self.z[r0c + 1, c0c]
        z11 = self.z[r0c + 1, c0c + 1]
        out = (z00 * (1 - fc) * (1 - fr) + z01 * fc * (1 - fr) + z10 * (1 - fc) * fr + z11 * fc * fr)
        return np.where(ok, out, np.nan)
