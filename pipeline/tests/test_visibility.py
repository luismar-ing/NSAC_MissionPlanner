"""T1.3.a: visibilidad del Sol por su borde superior (spec 5.3) y casos límite."""

import numpy as np
import pytest

from pipeline.visibility import horizon_at, sun_visible

R_SUN = 0.265
EPS = 1e-6


def flat_mask(value=1.0):
    return np.full(360, value)


def test_upper_limb_just_above_and_below_mask():
    mask = flat_mask(1.0)
    el_edge = 1.0 - R_SUN  # el borde superior toca exactamente la máscara
    got = sun_visible(np.array([45.0, 45.0, 45.0]), np.array([el_edge + EPS, el_edge, el_edge - EPS]), mask)
    assert got.tolist() == [1, 0, 0]  # «>» estricto: tocar la máscara no es visible
    assert got.dtype == np.uint8


def test_centre_below_mask_but_limb_above_is_visible():
    # Centro 0.2° por debajo de la máscara: el borde superior (+0.265°) asoma
    assert sun_visible(np.array([10.0]), np.array([0.8]), flat_mask(1.0)).tolist() == [1]


def test_azimuth_wraps_between_359_and_0():
    mask = np.zeros(360)
    mask[359], mask[0] = 2.0, 4.0  # entre 359° y 360°=0° la máscara sube de 2 a 4
    assert horizon_at(np.array([359.5]), mask)[0] == pytest.approx(3.0)
    assert horizon_at(np.array([359.9]), mask)[0] == pytest.approx(3.8)
    assert horizon_at(np.array([0.1]), mask)[0] == pytest.approx(4.0 * 0.9)
    assert horizon_at(np.array([360.0, -1.0]), mask).tolist() == pytest.approx([4.0, 2.0])
    # Sol a 359.9° con el borde a 3.8° ± ε
    el = 3.8 - R_SUN
    assert sun_visible(np.array([359.9, 359.9]), np.array([el + EPS, el - EPS]), mask).tolist() == [1, 0]
    # y a 0.1° (máscara 3.6°)
    el = 3.6 - R_SUN
    assert sun_visible(np.array([0.1, 0.1]), np.array([el + EPS, el - EPS]), mask).tolist() == [1, 0]


def test_negative_mask():
    mask = flat_mask(-0.8)  # horizonte por debajo del plano local (p. ej. en una cima)
    el = -0.8 - R_SUN
    assert sun_visible(np.array([200.0, 200.0]), np.array([el + EPS, el - EPS]), mask).tolist() == [1, 0]


def test_linear_interpolation_between_bins():
    mask = np.arange(360, dtype=float) / 100  # 0.00, 0.01, ..., 3.59
    assert horizon_at(np.array([10.25]), mask)[0] == pytest.approx(0.1025)


def test_mask_must_cover_360_degrees():
    with pytest.raises(ValueError):
        horizon_at(np.array([0.0]), np.zeros(359))
