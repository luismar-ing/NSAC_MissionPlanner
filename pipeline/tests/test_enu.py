"""T1.1.b: observador en MOON_ME y base ENU (spec 5.1)."""

import numpy as np
import pytest
import spiceypy as sp

from pipeline.ephemeris import R_REF_KM, az_el_deg, enu_basis, observer_position_km

MALAPERT = (-85.98827, 2.06255, 5173.2)  # pipeline/sites.json
POINTS = [(0.0, 0.0), (-85.98827, 2.06255), (-89.43904, -137.09641), (45.0, 120.0), (-10.0, -170.0)]


@pytest.mark.parametrize("lat,lon", POINTS)
def test_basis_is_orthonormal_and_right_handed(lat, lon):
    m = enu_basis(lat, lon)
    assert np.max(np.abs(m @ m.T - np.eye(3))) < 1e-12
    e, n, u = m
    assert np.max(np.abs(np.cross(e, n) - u)) < 1e-12  # E × N = U


@pytest.mark.parametrize("lat,lon", POINTS)
def test_up_is_radial_and_north_points_to_the_pole(lat, lon):
    e, n, u = enu_basis(lat, lon)
    pos = observer_position_km(lat, lon, 0.0, 0.0)
    assert np.max(np.abs(u - pos / np.linalg.norm(pos))) < 1e-12
    z = np.array([0.0, 0.0, 1.0])  # eje polar norte
    tangent = z - (z @ u) * u
    assert np.max(np.abs(n - tangent / np.linalg.norm(tangent))) < 1e-12
    assert abs(e @ z) < 1e-12  # el Este es horizontal y perpendicular al meridiano


def test_known_point_on_the_equator():
    e, n, u = enu_basis(0.0, 0.0)
    assert np.allclose([e, n, u], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], atol=1e-15)


def test_observer_radius_and_spice_agreement():
    lat, lon, elev = MALAPERT
    pos = observer_position_km(lat, lon, elev, h_obs_m=3.0)
    assert np.linalg.norm(pos) == pytest.approx(R_REF_KM + (elev + 3.0) / 1000, abs=1e-9)
    ref = np.array(sp.latrec(R_REF_KM + (elev + 3.0) / 1000, np.radians(lon), np.radians(lat)))
    assert np.max(np.abs(pos - ref)) < 1e-9


def test_az_el_conventions():
    az, el = az_el_deg(np.array([[0, 1, 0], [1, 0, 0], [0, -1, 0], [-1, 0, 0], [0, 1, 1]], dtype=float))
    assert az.tolist() == pytest.approx([0, 90, 180, 270, 0])  # N=0, E=90, S=180, O=270 (como Horizons)
    assert el.tolist() == pytest.approx([0, 0, 0, 0, 45])
