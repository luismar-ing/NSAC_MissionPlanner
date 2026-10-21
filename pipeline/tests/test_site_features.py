"""T2.3.a: pendiente media y máxima desde el DEM (spec 5.10), con la corrección de escala de la proyección."""

import numpy as np
import pytest
from rasterio.transform import from_origin

from pipeline.dem import DemWindow
from pipeline.site_features import polar_scale_factor, slope_stats

RES = 40.0
HALF = 3_000.0


def grid():
    tr = from_origin(-HALF, HALF, RES, RES)
    n = int(2 * HALF / RES)
    rows, cols = np.mgrid[0:n, 0:n]
    return tr, tr.c + (cols + 0.5) * RES, tr.f - (rows + 0.5) * RES


def test_scale_factor():
    assert polar_scale_factor(-90) == pytest.approx(1.0)
    assert polar_scale_factor(-86) == pytest.approx(2 / (1 + np.sin(np.radians(86))))
    assert 1.0 < polar_scale_factor(-85) < 1.002


@pytest.mark.parametrize("slope", [2.0, 5.0, 15.0, 30.0])
@pytest.mark.parametrize("lat", [-90.0, -85.0])
def test_tilted_plane_known_slope(slope, lat):
    tr, x, y = grid()
    k = polar_scale_factor(lat)
    g_map = np.tan(np.radians(slope)) / k  # pendiente real = slope ⇒ gradiente por metro de mapa = tan(slope)/k
    az = np.radians(37.0)
    z = g_map * (np.sin(az) * x + np.cos(az) * y)
    st = slope_stats(DemWindow(z, tr), 0.0, 0.0, lat, radius_m=1000.0)
    assert st["slope_mean_deg"] == pytest.approx(slope, abs=0.1)
    assert st["slope_max_deg"] == pytest.approx(slope, abs=0.1)


def test_cone():
    tr, x, y = grid()
    z = -np.tan(np.radians(20.0)) * np.hypot(x, y)  # cono de 20° (pozo), lat −90 ⇒ k = 1
    st = slope_stats(DemWindow(z, tr), 0.0, 0.0, -90.0, radius_m=1000.0)
    assert st["slope_max_deg"] == pytest.approx(20.0, abs=0.1)
    assert 19.0 < st["slope_mean_deg"] <= 20.05  # el vértice (pocos píxeles) baja algo la media
    assert st["n_pixels"] == pytest.approx(np.pi * 1000**2 / RES**2, rel=0.05)


def test_radius_scales_with_projection():
    tr, x, y = grid()
    z = np.zeros_like(x)
    a = slope_stats(DemWindow(z, tr), 0.0, 0.0, -90.0, radius_m=1000.0)["n_pixels"]
    b = slope_stats(DemWindow(z, tr), 0.0, 0.0, -80.0, radius_m=1000.0)["n_pixels"]
    assert b > a  # en el mapa el círculo real de 1 km ocupa k² veces más píxeles
