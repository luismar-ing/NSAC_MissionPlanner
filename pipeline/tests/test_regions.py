"""T0.3.a: las regiones USGS se leen y reproyectan bien (área calculada = atributo Area_km2 de USGS)."""

import json
import zipfile

import pytest

from pipeline.regions import NINE_REGIONS_ZIP, REGIONS_DIR, load_lgrs_footprint, load_nine_regions

pytestmark = pytest.mark.skipif(not (REGIONS_DIR / NINE_REGIONS_ZIP).exists(),
                                reason="faltan los zips de regiones (descarga manual, ver data/README.md)")


def test_nine_regions_area_matches_usgs_attribute():
    regions = load_nine_regions()
    gj = json.loads(zipfile.ZipFile(REGIONS_DIR / NINE_REGIONS_ZIP).read("A3_9regions-lonlat-simplified.geojson"))
    usgs = {f["properties"]["Region"]: f["properties"]["Area_km2"] for f in gj["features"]}
    assert set(regions) == set(usgs) and len(regions) == 9
    for name, region in regions.items():
        assert region.area_km2() == pytest.approx(usgs[name], rel=1e-3), name


def test_connecting_ridge_footprint():
    cr = load_lgrs_footprint("Connecting_Ridge.zip", "Connecting Ridge")
    lat_min, lat_max, _, _ = cr.lonlat_extent()
    assert len(cr.polygons_xy) == 289
    # celdas de 1 km en una proyección con factor de escala 0.994 → ~1/0.994² km² sobre el terreno
    assert cr.area_km2() == pytest.approx(289 / 0.994**2, rel=0.01)
    assert -90 < lat_min < lat_max < -89
