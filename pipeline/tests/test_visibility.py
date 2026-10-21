"""T1.3.a: visibilidad del Sol por su borde superior (spec 5.3) y casos límite."""

import numpy as np
import pytest

from pipeline.visibility import (
    earth_partial,
    earth_visible,
    horizon_at,
    sun_day_from_fraction,
    sun_disk_fraction,
    sun_visible,
)

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


# ---------------------------------------------------------------- Tierra (T1.3.b, spec 5.4)


MARGIN = 0.5
R_EARTH = 0.95


def test_earth_needs_mask_plus_antenna_margin():
    mask = flat_mask(1.0)
    el = 1.0 + MARGIN
    got = earth_visible(np.full(3, 90.0), np.array([el + EPS, el, el - EPS]), mask)
    assert got.tolist() == [1, 0, 0]
    # Centro sobre la máscara pero dentro del margen: sin enlace
    assert earth_visible(np.array([90.0]), np.array([1.3]), mask).tolist() == [0]


@pytest.mark.parametrize("margin", [0.0, 0.5, 1.0, 2.0])
def test_antenna_margin_is_a_parameter(margin):
    mask = flat_mask(0.0)
    got = earth_visible(np.array([0.0, 0.0]), np.array([margin + EPS, margin - EPS]), mask, antenna_margin_deg=margin)
    assert got.tolist() == [1, 0]


def test_earth_uses_interpolated_mask_across_north():
    mask = np.zeros(360)
    mask[359], mask[0] = 2.0, 4.0
    el = 3.8 + MARGIN  # máscara interpolada en 359.9° = 3.8°
    assert earth_visible(np.array([359.9, 359.9]), np.array([el + EPS, el - EPS]), mask).tolist() == [1, 0]


def test_partial_visibility_when_only_the_limb_clears_the_mask():
    mask = flat_mask(1.0)
    els = np.array([1.6, 1.2, 1.0 - R_EARTH + EPS, 1.0 - R_EARTH - EPS])
    vis = earth_visible(np.full(4, 0.0), els, mask)
    part = earth_partial(np.full(4, 0.0), els, mask)
    assert vis.tolist() == [1, 0, 0, 0]
    assert part.tolist() == [0, 1, 1, 0]  # nunca parcial y visible a la vez
    assert not np.any(vis & part)


# ---------------------------------------------------------------- fracción del disco (T1.3.c)



def segment_fraction(h, r=R_SUN):
    """Fracción exacta del disco por encima de una recta horizontal a distancia h bajo el centro."""
    c = -np.clip(h, -r, r)  # recta en y = c respecto al centro
    return (r**2 * np.arccos(c / r) - c * np.sqrt(r**2 - c**2)) / (np.pi * r**2)


@pytest.mark.parametrize("offset,expected", [(+R_SUN + 0.01, 1.0), (0.0, 0.5), (-R_SUN - 0.01, 0.0)])
def test_fraction_0_half_1_on_flat_mask(offset, expected):
    mask = flat_mask(1.0)
    f = sun_disk_fraction(np.array([120.0]), np.array([1.0 + offset]), mask)[0]
    assert f == pytest.approx(expected, abs=1e-3)


def test_fraction_matches_circular_segment_formula():
    mask = flat_mask(0.5)
    h = np.linspace(-R_SUN, R_SUN, 21)
    f = sun_disk_fraction(np.full(h.size, 33.0), 0.5 + h, mask)
    assert np.max(np.abs(f - segment_fraction(h))) < 2e-3
    print(f"\nError máximo frente al segmento circular: {np.max(np.abs(f - segment_fraction(h))):.2e}")


def test_fraction_sees_a_sloped_mask_within_the_disk():
    # Máscara con pendiente de 10° por grado de azimut que vale +0.1° en el centro del disco:
    # recta y = 0.1 + 10·x. Su distancia al centro es 0.1/√101 y el centro queda por debajo.
    mask = np.zeros(360)
    mask[100], mask[101] = -4.9, 5.1
    f = sun_disk_fraction(np.array([100.5]), np.array([0.0]), mask)[0]
    exact = segment_fraction(-0.1 / np.sqrt(101))
    flat_model = segment_fraction(-0.1)  # lo que daría suponer la máscara horizontal en el centro
    print(f"\nPendiente: fracción {f:.4f}, exacta {exact:.4f}, modelo plano {flat_model:.4f}")
    assert f == pytest.approx(exact, abs=1e-2)
    assert abs(f - flat_model) > 0.1


def test_day_threshold_is_a_parameter():
    f = np.array([0.49, 0.5, 0.51])
    assert sun_day_from_fraction(f).tolist() == [0, 0, 1]
    assert sun_day_from_fraction(f, threshold=0.3).tolist() == [1, 1, 1]
