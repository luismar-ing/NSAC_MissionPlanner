"""T0.3.b: pipeline/sites.json cumple el contrato y cada sitio cae dentro de su región oficial USGS."""

import json
from pathlib import Path

import pytest
from matplotlib.path import Path as MplPath
from pyproj import Transformer

from pipeline.regions import DEM_CRS, MOON_GEO, NINE_REGIONS_ZIP, REGIONS_DIR, load_lgrs_footprint, load_nine_regions
from pipeline.validate import validate_file

SITES = Path(__file__).resolve().parents[1] / "sites.json"
SOURCE = Path(__file__).resolve().parents[1] / "sites_source.json"


def test_sites_json_is_valid():
    model, errors = validate_file(SITES, "sites")
    assert errors == []
    sites = json.loads(SITES.read_text(encoding="utf-8"))
    assert 4 <= len(sites) <= 5
    for s in sites:
        assert s["lat"] <= -80, s["id"]  # dentro de la cobertura del DEM (80°S–90°S)
        assert all(str(s[k]).strip() for k in ("id", "name", "lat", "lon", "elevation_m", "source"))
        assert "doi:" in s["source"] and "LOLA" in s["source"]


@pytest.mark.skipif(not (REGIONS_DIR / NINE_REGIONS_ZIP).exists(), reason="faltan los zips de regiones (descarga manual)")
def test_each_site_lies_inside_its_official_region():
    cfg = json.loads(SOURCE.read_text(encoding="utf-8"))
    sites = {s["id"]: s for s in json.loads(SITES.read_text(encoding="utf-8"))}
    nine = load_nine_regions()
    to_dem = Transformer.from_crs(MOON_GEO, DEM_CRS, always_xy=True)
    for s in cfg["sites"]:
        region = nine[s["region"]] if s["loader"] == "nine" else load_lgrs_footprint(s["zip"], s["region"])
        x, y = to_dem.transform(sites[s["id"]]["lon"], sites[s["id"]]["lat"])
        assert any(MplPath(p).contains_point((x, y)) for p in region.polygons_xy), s["id"]
