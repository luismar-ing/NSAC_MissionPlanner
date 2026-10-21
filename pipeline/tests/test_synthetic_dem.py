"""T1.2.b: el DEM sintético tiene el borde donde debe y la solución analítica es coherente."""

import math

import numpy as np
import pytest
import rasterio

from pipeline.tests.synthetic_dem import (
    POLAR_CRS,
    R_MOON_M,
    Crater,
    elevation_angle_deg,
    expected_horizon_deg,
    make_crater_dem,
    write_geotiff,
)

PIXEL = 100.0
HALF = 30_000.0
H_OBS = 3.0


def profile_along_x(z, transform, row_y=0.0):
    """Perfil de alturas en la fila que pasa por y = row_y (hacia +x, azimut 90° del mapa)."""
    row = int((transform.f - row_y) // PIXEL)
    xs = transform.c + (np.arange(z.shape[1]) + 0.5) * PIXEL
    return xs, z[row]


def test_rim_height_and_radius_in_raster():
    crater = Crater(rim_radius_m=10_000, rim_width_m=400, rim_height=500.0)
    z, tr = make_crater_dem(crater, HALF, PIXEL)
    assert z.shape == (600, 600) and z.dtype == np.float32
    xs, prof = profile_along_x(z, tr, row_y=PIXEL / 2)  # fila de centros en y = +50 m
    rim = np.abs(xs[prof > 0])
    assert prof.max() == pytest.approx(500.0)
    assert rim.min() >= 10_000 - 200 - PIXEL and rim.max() <= 10_000 + 200 + PIXEL
    print(f"\nBorde en x ∈ [{rim.min():.0f}, {rim.max():.0f}] m (esperado 10 000 ± 200 m), altura {prof.max():.0f} m")


def test_rim_height_can_vary_with_azimuth():
    crater = Crater(rim_radius_m=8_000, rim_width_m=400, rim_height=lambda az: 300 + 200 * np.cos(np.radians(az)))
    z, tr = make_crater_dem(crater, HALF, PIXEL)
    north = z[: z.shape[0] // 2, z.shape[1] // 2 - 1].max()  # columna central hacia +y (az ≈ 0°)
    south = z[z.shape[0] // 2:, z.shape[1] // 2 - 1].max()   # hacia −y (az ≈ 180°)
    assert north == pytest.approx(500, abs=1) and south == pytest.approx(100, abs=1)


def test_geotiff_has_the_real_dem_format(tmp_path):
    crater = Crater(rim_radius_m=5_000, rim_width_m=300, rim_height=200.0)
    z, tr = make_crater_dem(crater, 10_000, PIXEL)
    path = write_geotiff(tmp_path / "crater.tif", z, tr)
    with rasterio.open(path) as ds:
        assert ds.crs.to_proj4().split() == rasterio.crs.CRS.from_string(POLAR_CRS).to_proj4().split()
        assert ds.res == (PIXEL, PIXEL) and ds.dtypes[0] == "float32"
        assert np.array_equal(ds.read(1), z)


def test_curvature_formula_matches_5_2():
    # A 100 km, la caída por curvatura es d²/(2R) = 1e10 / 3 474 800 ≈ 2 877.9 m
    d = 100_000.0
    assert d**2 / (2 * R_MOON_M) == pytest.approx(2877.86, abs=0.01)
    assert float(elevation_angle_deg(0.0, d, 0.0)) == pytest.approx(-math.degrees(math.atan(2877.86 / d)), abs=1e-4)


CASES = {
    "borde 500 m a 10 km": Crater(rim_radius_m=10_000, rim_width_m=400, rim_height=500.0),
    "borde 2 km a 40 km": Crater(rim_radius_m=40_000, rim_width_m=400, rim_height=2_000.0),
    "llano (sin borde)": Crater(rim_radius_m=10_000, rim_width_m=400, rim_height=0.0),
}


@pytest.mark.parametrize("name", list(CASES))
def test_print_analytical_horizon(name):
    crater = CASES[name]
    el_clip = expected_horizon_deg(crater, np.array([0.0]), H_OBS, 100_000.0)[0]
    el_raw = expected_horizon_deg(crater, np.array([0.0]), H_OBS, 100_000.0, clip_negative=False)[0]
    d_in = crater.rim_radius_m - crater.rim_width_m / 2
    simple = float(elevation_angle_deg(float(crater.height_at_az(np.array([0.0]))[0]), d_in, H_OBS))
    print(f"\n{name}: horizonte = {el_raw:+.4f}° (sin recortar), {el_clip:+.4f}° (recortado); "
          f"atan2(H − h_obs − d²/2R, d) en el borde interior = {simple:+.4f}°")
    if crater.height_at_az(np.array([0.0]))[0] > 0:
        assert el_raw == pytest.approx(simple, abs=1e-6)  # la cima sobresale: máximo en el borde interior
    else:
        assert el_raw == pytest.approx(-math.degrees(math.atan(math.sqrt(2 * H_OBS / R_MOON_M))), abs=1e-4)
        assert el_clip == 0.0
