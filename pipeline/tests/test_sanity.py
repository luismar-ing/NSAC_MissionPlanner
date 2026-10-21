"""T1.5.b: sanity checks de 5.7 sobre las salidas reales del pipeline (se omiten si no existen).

Límites de elevación por latitud (docs/validation.md §2, que corrige el ±1.6° de 5.7, válido solo
en el polo). Un fallo aquí indica un error de marcos o signos (spec 5.7).
"""

import json
from pathlib import Path

import numpy as np
import pytest

from pipeline.ephemeris import elevation_bounds_deg

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "pipeline" / "out"
SITES = json.loads((ROOT / "pipeline" / "sites.json").read_text(encoding="utf-8"))
CONTROL = "control_shackleton_floor"
IDS = [s["id"] for s in SITES]

pytestmark = pytest.mark.skipif(not (OUT / f"flags_{CONTROL}.npz").exists(),
                                reason="faltan salidas del pipeline (python -m pipeline.ephemeris / horizon / visibility / windows)")


@pytest.mark.parametrize("site", SITES, ids=IDS)
def test_sun_and_earth_elevation_within_latitude_bounds(site):
    s = np.load(OUT / f"ephem_{site['id']}.npz")
    b = elevation_bounds_deg(site["lat"])
    assert np.max(np.abs(s["sun_el"])) <= b["sun"]
    assert np.max(np.abs(s["earth_el"])) <= b["earth"]
    # la Tierra no recorre el cielo: oscila en una franja estrecha de azimut (libración)
    az = np.radians(s["earth_az"])
    spread = np.degrees(np.ptp(np.unwrap(az - np.angle(np.mean(np.exp(1j * az))))))
    assert spread < 40


@pytest.mark.parametrize("site", SITES, ids=IDS)
def test_horizon_mask_is_plausible(site):
    m = np.load(OUT / f"horizon_{site['id']}.npz")["elev_deg"]
    assert m.shape == (360,) and np.all(np.isfinite(m))
    assert np.all(np.abs(m) < 10)  # en cumbres y bordes: pocos grados


def test_ridges_have_more_sun_than_the_crater_floor():
    ctrl = np.load(OUT / f"flags_{CONTROL}.npz")
    ctrl_sun = 100 * ctrl["sun_vis"].mean()
    assert ctrl_sun < 1.0  # fondo de cráter permanentemente sombreado: ~0 % (5.7)
    for sid in IDS:
        assert 100 * np.load(OUT / f"flags_{sid}.npz")["sun_vis"].mean() > ctrl_sun + 50


@pytest.mark.parametrize("sid", IDS)
def test_flags_and_percentages_in_range(sid):
    f = np.load(OUT / f"flags_{sid}.npz")
    for k in ("sun_vis", "earth_vis"):
        assert set(np.unique(f[k])) <= {0, 1}
    days = json.loads((OUT / "daily" / f"{sid}.json").read_text(encoding="utf-8"))["days"]
    assert all(0 <= d["sun_pct"] <= 100 and 0 <= d["earth_h"] <= 24 for d in days)
    for L in (3, 7, 14):
        rows = json.loads((OUT / "windows" / f"{sid}_{L}d.json").read_text(encoding="utf-8"))["rows"]
        assert len(rows) == 365
        assert all(0 <= r["sun_pct"] <= 100 and 0 <= r["score"] <= 1 and r["longest_dark_h"] <= 24 * L for r in rows)
