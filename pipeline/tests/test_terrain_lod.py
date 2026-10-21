"""T2.3.d: el terreno en LOD reproduce el DEM (alturas decodificadas frente a muestras independientes)."""

import json
from pathlib import Path

import numpy as np
import pytest

from pipeline.dem import DEM_PATH, GEOD, R_MOON_M, DemWindow, latlon_to_xy
from pipeline.terrain_lod import OUT, SITE_LODS, decode, encode, enu_grid

SITES = json.loads((Path(__file__).resolve().parents[1] / "sites.json").read_text(encoding="utf-8"))
pytestmark = pytest.mark.skipif(not DEM_PATH.exists() or not (OUT / SITES[0]["id"] / "lod0.json").exists(),
                                reason="faltan el DEM o el terreno (python -m pipeline.terrain_lod)")


def test_encode_decode_roundtrip():
    z = np.array([[-8000.0, -0.13], [0.12, 8000.0]])
    header = {"grid": {"nx": 2, "ny": 2}, "height_scale_m": 0.25, "height_offset_m": 0.0}
    assert np.max(np.abs(decode(encode(z), header) - z)) <= 0.125


@pytest.mark.parametrize("site", SITES, ids=[s["id"] for s in SITES])
@pytest.mark.parametrize("lod", SITE_LODS, ids=[f"lod{l.lod}" for l in SITE_LODS])
def test_heights_match_dem_at_control_points(site, lod):
    folder = OUT / site["id"]
    header = json.loads((folder / f"lod{lod.lod}.json").read_text(encoding="utf-8"))
    blob = (folder / header["bin_file"]).read_bytes()
    assert len(blob) == header["byte_length"]
    z = decode(blob, header)
    x, y = enu_grid(lod.half_m, lod.spacing_m)
    assert z.shape == x.shape
    # nodo central = el sitio: altura relativa 0
    c = z.shape[0] // 2
    assert x[c, c] == 0 and y[c, c] == 0 and abs(z[c, c]) < 0.2
    # 50 nodos al azar: altura del DEM − altura del sitio − caída por curvatura (fórmula aproximada independiente)
    rng = np.random.default_rng(lod.lod)
    i, j = rng.integers(0, z.shape[0], 50), rng.integers(0, z.shape[1], 50)
    d = np.hypot(x[i, j], y[i, j])
    lon2, lat2, _ = GEOD.fwd(np.full(50, site["lon"]), np.full(50, site["lat"]), np.degrees(np.arctan2(x[i, j], y[i, j])), d)
    px, py = latlon_to_xy(lat2, lon2)
    sx, sy = latlon_to_xy(site["lat"], site["lon"])
    h = DemWindow.read(sx, sy, lod.half_m * 1.45 + 1000).sample(np.asarray(px), np.asarray(py))
    approx = h - site["elevation_m"] - d**2 / (2 * R_MOON_M)
    assert np.max(np.abs(z[i, j] - approx)) < 1.0  # < 1 m (la fórmula aproximada difiere < 0.3 m a 28 km)
