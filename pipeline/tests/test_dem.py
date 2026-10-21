"""T1.2.a: proyección del DEM, rayos sobre la esfera y muestreo bilineal."""

import json
from pathlib import Path

import numpy as np
import pytest
from rasterio.transform import from_origin

from pipeline.dem import DEM_PATH, GEOD, DemWindow, latlon_to_xy, ray_points_xy, xy_to_latlon

SITES = json.loads((Path(__file__).resolve().parents[1] / "sites.json").read_text(encoding="utf-8"))
needs_dem = pytest.mark.skipif(not DEM_PATH.exists(), reason="falta el DEM (python -m pipeline.fetch_data --dem)")


@pytest.mark.parametrize("lat,lon", [(-85.98827, 2.06255), (-89.43904, -137.09641), (-80.5, 179.9), (-84.0, -90.0)])
def test_round_trip_under_1_m(lat, lon):
    x, y = latlon_to_xy(lat, lon)
    lat2, lon2 = xy_to_latlon(x, y)
    _, _, dist = GEOD.inv(lon, lat, float(lon2), float(lat2))
    assert dist < 1.0


def test_projection_reference_points():
    # Centro de proyección del label (lat_0 = −90): el polo cae en (0, 0)
    assert np.allclose(latlon_to_xy(-90.0, 0.0), (0.0, 0.0), atol=1e-6)
    # Convención del mapa: meridiano 0° hacia +y, 90°E hacia +x (como en docs/figures/sites_map.png)
    x0, y0 = latlon_to_xy(-85.0, 0.0)
    x90, y90 = latlon_to_xy(-85.0, 90.0)
    assert abs(x0) < 1e-6 and y0 > 0 and x90 > 0 and abs(y90) < 1e-6
    # Escala real en el polo (lat_ts = −90): 1° de colatitud ≈ 30.32 km en el mapa cerca del polo
    _, y1 = latlon_to_xy(-89.0, 0.0)
    assert y1 == pytest.approx(np.radians(1) * 1_737_400, rel=1e-4)


@pytest.mark.parametrize("site", SITES, ids=[s["id"] for s in SITES])
def test_rays_have_exact_distance_and_local_azimuth(site):
    az = np.array([0.0, 90.0, 180.0, 270.0, 37.5])
    d = np.array([40.0, 5_000.0, 100_000.0])
    x, y = ray_points_xy(site["lat"], site["lon"], az, d)
    lat2, lon2 = xy_to_latlon(x, y)
    fwd, _, dist = GEOD.inv(np.full(x.shape, site["lon"]), np.full(x.shape, site["lat"]), lon2, lat2)
    assert np.max(np.abs(dist - d[None, :])) < 1.0
    assert np.max(np.abs(((fwd - az[:, None]) + 180) % 360 - 180)) < 1e-6
    # az = 0 (Norte local) aleja del polo sur: la latitud aumenta
    assert np.all(lat2[0] > site["lat"])
    # az = 90 (Este local) gira en el sentido en que crece la longitud
    assert ((lon2[1, 1] - site["lon"] + 180) % 360 - 180) > 0


def test_bilinear_reproduces_a_plane():
    tr = from_origin(-500.0, 500.0, 40.0, 40.0)
    rows, cols = np.mgrid[0:25, 0:25]
    xc, yc = tr.c + (cols + 0.5) * 40, tr.f - (rows + 0.5) * 40
    w = DemWindow(0.3 * xc - 0.7 * yc + 12.0, tr)
    px = np.array([-123.4, 0.0, 77.7, 300.0])
    py = np.array([45.6, 0.0, -310.2, 299.0])
    assert np.allclose(w.sample(px, py), 0.3 * px - 0.7 * py + 12.0, atol=1e-9)
    assert np.isnan(w.sample(np.array([10_000.0]), np.array([0.0])))[0]


@needs_dem
def test_sampling_real_dem_at_a_site():
    s = next(s for s in SITES if s["id"] == "malapert_massif")
    x, y = latlon_to_xy(s["lat"], s["lon"])
    w = DemWindow.read(x, y, 2_000.0)
    # make_sites tomó el centro del píxel más alto: el muestreo bilineal en ese punto da su valor
    assert float(w.sample(np.array([x]), np.array([y]))[0]) == pytest.approx(s["elevation_m"], abs=0.1)
    assert w.res == 40.0


@pytest.mark.parametrize("site", SITES, ids=[s["id"] for s in SITES])
@pytest.mark.parametrize("az", [0.0, 45.0, 90.0, 200.0, 315.0])
def test_ray_azimuth_matches_ephemeris_enu(site, az):
    """El azimut de los rayos (horizonte) y el de az_el_deg (Sol y Tierra) son la misma convención."""
    from pipeline.ephemeris import R_REF_KM, az_el_deg, enu_basis, observer_position_km

    x, y = ray_points_xy(site["lat"], site["lon"], np.array([az]), np.array([50.0]))  # paso corto
    lat2, lon2 = xy_to_latlon(x, y)
    p0 = observer_position_km(site["lat"], site["lon"], 0.0, 0.0)
    p1 = observer_position_km(float(lat2[0, 0]), float(lon2[0, 0]), 0.0, 0.0)
    got_az, got_el = az_el_deg(enu_basis(site["lat"], site["lon"]) @ (p1 - p0))
    assert ((float(got_az) - az + 180) % 360 - 180) == pytest.approx(0.0, abs=0.01)
    assert abs(float(got_el)) < 0.01  # el desplazamiento corto es casi horizontal (la curvatura lo baja un poco)
    assert R_REF_KM == 1737.4
