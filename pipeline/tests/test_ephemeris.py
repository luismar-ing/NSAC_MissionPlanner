"""T1.1.c: az/el del Sol y la Tierra desde un sitio, 30 días a 30 min (límites de docs/validation.md §2)."""

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pytest

from pipeline.ephemeris import elevation_bounds_deg, et_grid, target_az_el

SITES = {s["id"]: s for s in json.loads((Path(__file__).resolve().parents[1] / "sites.json").read_text(encoding="utf-8"))}
T0 = datetime(2027, 1, 1, tzinfo=timezone.utc)


@pytest.fixture(scope="module")
def ets():
    return et_grid(T0, T0 + timedelta(days=30), 30)


def test_grid_has_30_days_at_30_min(ets):
    assert len(ets) == 30 * 48
    assert np.allclose(np.diff(ets), 1800.0)


@pytest.mark.parametrize("site_id", ["malapert_massif", "connecting_ridge"])
def test_sun_and_earth_within_latitude_bounds(site_id, ets):
    site = SITES[site_id]
    bounds = elevation_bounds_deg(site["lat"])
    for target in ("sun", "earth"):
        az, el = target_az_el(site, target, ets)
        assert np.all((az >= 0) & (az < 360))
        assert np.max(np.abs(el)) <= bounds[target], (target, np.max(np.abs(el)), bounds[target])
        print(f"\n{site_id} {target}: el [{el.min():+.3f}, {el.max():+.3f}]°, límite ±{bounds[target]:.2f}°; "
              f"az recorre {np.ptp(np.unwrap(np.radians(az))) / (2 * np.pi):.2f} vueltas")


def test_sun_goes_around_the_sky_once_per_lunar_day(ets):
    # En 30 días (> 1 día sinódico de ~29.5 d) el Sol da algo más de una vuelta completa en azimut
    az, _ = target_az_el(SITES["malapert_massif"], "sun", ets)
    turns = np.ptp(np.unwrap(np.radians(az))) / (2 * np.pi)
    assert 0.95 < turns < 1.1


def test_earth_stays_in_a_small_patch_of_sky(ets):
    # La Tierra no recorre el cielo: oscila por la libración (spec 1, 5.7)
    az, el = target_az_el(SITES["malapert_massif"], "earth", ets)
    span = np.degrees(np.ptp(np.unwrap(np.radians(az))))
    assert span < 30, span
