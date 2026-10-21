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


# ---------------------------------------------------------------- rasgos cercanos (T2.3.b)

import json  # noqa: E402
from pathlib import Path  # noqa: E402

from pipeline.site_features import great_circle_km, nearby_features, parse_gazetteer  # noqa: E402,I001


def test_great_circle_known_cases():
    r = 1737.4
    assert great_circle_km(0, 0, 0, 90) == pytest.approx(np.pi * r / 2, rel=1e-12)
    assert great_circle_km(-90, 0, -89, 123) == pytest.approx(np.radians(1) * r, rel=1e-9)  # desde el polo, la longitud no importa
    assert great_circle_km(-85, 10, -85, 10) == pytest.approx(0.0, abs=1e-9)


def test_parse_and_filter():
    html = """<table><tr><th>Feature ID</th><th>Feature Name</th><th>Clean Feature Name</th><th>Target</th><th>Diameter</th>
    <th>Center Latitude</th><th>Center Longitude</th><th>Coordinate System</th><th>Feature Type</th><th>Approval Status</th></tr>
    <tr><td>1</td><td>Near</td><td>Near</td><td>Moon</td><td>5</td><td>-85.1</td><td>0</td><td>P</td><td>Crater, craters</td><td>Approved</td></tr>
    <tr><td>2</td><td>Far</td><td>Far</td><td>Moon</td><td>5</td><td>-80</td><td>0</td><td>P</td><td>Crater, craters</td><td>Approved</td></tr>
    <tr><td>3</td><td>Hill</td><td>Hill</td><td>Moon</td><td>9</td><td>-85.2</td><td>0</td><td>P</td><td>Mons, montes</td><td>Approved</td></tr>
    <tr><td>4</td><td>Draft</td><td>Draft</td><td>Moon</td><td>9</td><td>-85.0</td><td>0</td><td>P</td><td>Crater, craters</td><td>Dropped</td></tr></table>"""
    feats = parse_gazetteer(html)
    assert [f["feature_id"] for f in feats] == [1, 2, 3, 4]
    near = nearby_features({"lat": -85.0, "lon": 0.0}, feats, radius_km=50, max_n=8)
    assert [n["name"] for n in near] == ["Near", "Hill"]  # ordenados, dentro de 50 km, solo aprobados
    assert near[1]["type"] == "massif" and near[0]["distance_km"] == pytest.approx(np.radians(0.1) * 1737.4, abs=0.01)


def test_feature_sources_file():
    d = json.loads((Path(__file__).resolve().parents[1] / "feature_sources.json").read_text(encoding="utf-8"))
    assert d["coordinate_systems"] == ["Planetographic, +East, -180 - 180"]
    for feats in d["features_by_site"].values():
        assert all(f["source"].startswith("IAU/USGS Gazetteer") and "Feature ID" in f["source"] for f in feats)
        assert all(f["distance_km"] <= d["radius_km"] for f in feats)
        assert [f["distance_km"] for f in feats] == sorted(f["distance_km"] for f in feats)
