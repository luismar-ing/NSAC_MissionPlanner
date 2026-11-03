"""T6.2.a: the published average illumination map, read and reduced for the web (needs data/illumination/)."""

import json

import numpy as np
import pytest

from pipeline import illumination_map as im

needs_map = pytest.mark.skipif(not im.SRC.exists(), reason="falta el mapa (python -m pipeline.fetch_data --illumination)")


@needs_map
def test_values_are_fractions_and_the_grid_is_the_documented_one():
    frac, bounds, crs = im.read(256)
    v = frac[np.isfinite(frac)]
    assert v.min() >= 0 and v.max() <= 1
    assert (bounds.left, bounds.top) == (-151740.0, 151740.0)
    assert "+proj=stere" in crs and "+R=1737400" in crs


@needs_map
def test_shackleton_floor_is_dark_and_the_sites_are_lit():
    """Shackleton's floor is permanently shadowed; the five sites sit on lit rims (sanity of position and scale)."""
    frac, bounds, crs = im.read()
    sites = im.site_values(frac, bounds, crs)
    assert all(s["map"] > 0.4 for s in sites), sites
    # Shackleton crater centre (IAU: 89.67°S, 129.78°E): a few pixels around it
    from pyproj import Transformer

    x, y = Transformer.from_crs("+proj=longlat +R=1737400 +no_defs", crs, always_xy=True).transform(129.78, -89.67)
    n = frac.shape[0]
    i, j = int((x - bounds.left) / ((bounds.right - bounds.left) / n)), int((bounds.top - y) / ((bounds.top - bounds.bottom) / n))
    assert np.nanmean(frac[j - 2 : j + 3, i - 2 : i + 3]) < 0.02


def test_web_header_matches_the_png():
    """The versioned copy the front end loads (web/public/data/illumination/)."""
    head = json.loads((im.WEB / "south_avg.json").read_text(encoding="utf-8"))
    import hashlib

    assert hashlib.sha256((im.WEB / "south_avg.png").read_bytes()).hexdigest() == head["png_sha256"]
    assert head["size_px"] == im.WEB_PX
    assert "Mazarico" in head["citation"]
