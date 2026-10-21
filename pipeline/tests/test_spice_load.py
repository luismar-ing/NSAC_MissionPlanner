"""T0.2.c: los kernels SPICE cargan, dan posiciones plausibles y cubren el rango de D4."""

import numpy as np
import pytest
import spiceypy as sp

from pipeline import config
from pipeline.spice_utils import covers, load_kernels, pck_coverage, spk_coverage, utc_to_et



@pytest.fixture(scope="module", autouse=True)
def kernels():
    load_kernels()


def test_earth_moon_distance_is_plausible():
    et = utc_to_et(config.ARRIVAL_START)
    pos, _ = sp.spkpos("MOON", et, "J2000", "NONE", "EARTH")
    d = float(np.linalg.norm(pos))
    print(f"\nDistancia Tierra-Luna en {config.ARRIVAL_START:%Y-%m-%d}: {d:,.1f} km")
    assert 356_000 < d < 407_000


@pytest.mark.parametrize("frame", ["MOON_ME", "MOON_PA"])
def test_lunar_frame_rotation_is_proper(frame):
    et = utc_to_et(config.ARRIVAL_START)
    m = np.array(sp.pxform(frame, "J2000", et))
    assert np.allclose(m @ m.T, np.eye(3), atol=1e-12)
    assert abs(np.linalg.det(m) - 1) < 1e-12


def test_kernels_cover_the_whole_mission_range():
    start, _ = config.scene_range()
    _, end = config.timeseries_range()
    et0, et1 = utc_to_et(start), utc_to_et(end)
    spk = "data/kernels/de440s.bsp"
    for body in (10, 3, 301, 399):  # Sol, baricentro Tierra-Luna, Luna, Tierra
        assert covers(spk_coverage(spk, body), et0, et1), f"de440s no cubre el cuerpo {body}"
    moon_pa_class = 31008  # MOON_PA_DE440, según moon_de440_250416.tf
    assert covers(pck_coverage("data/kernels/moon_pa_de440_200625.bpc", moon_pa_class), et0, et1)
    print(f"\nRango comprobado: {start:%Y-%m-%d} a {end:%Y-%m-%d} (ET {et0:.0f} a {et1:.0f})")
