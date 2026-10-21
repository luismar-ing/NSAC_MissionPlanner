"""T1.2.c: la máscara de horizonte reproduce la solución analítica en el DEM sintético (T1.2.b)."""

import numpy as np
import pytest

from pipeline.dem import DemWindow, xy_to_latlon
from pipeline.horizon import compute_mask
from pipeline.tests.synthetic_dem import Crater, expected_horizon_deg, make_crater_dem

H_OBS = 3.0
R_MAX = 50_000.0
PIXEL = 50.0
STEP = 10.0
TOL_DEG = 0.05  # tolerancia justificada abajo
# Sitio sintético a 150 km del polo sobre el meridiano 0 (lat ≈ −85.05°): ahí el Norte local es +y del mapa
# y el Este +x, igual que el azimut de cuadrícula del generador. En el polo exacto el azimut no está definido.
X0, Y0 = 0.0, 150_000.0


def synthetic_mask(crater, clip):
    z, tr = make_crater_dem(crater, R_MAX + 2_000.0, PIXEL)
    lat, lon = xy_to_latlon(X0, Y0)
    w = DemWindow(z, tr)
    z0 = float(w.sample(np.array([X0]), np.array([Y0]))[0])
    return compute_mask(w, float(lat), float(lon), z0, H_OBS, 1.0, R_MAX, STEP, clip_negative=clip)


CASES = {
    "borde 500 m a 10 km": Crater(10_000, 400, 500.0, x0_m=X0, y0_m=Y0),
    "borde 2 km a 40 km": Crater(40_000, 400, 2_000.0, x0_m=X0, y0_m=Y0),
    "llano": Crater(10_000, 400, 0.0, x0_m=X0, y0_m=Y0),
}


@pytest.mark.parametrize("name", list(CASES))
@pytest.mark.parametrize("clip", [False, True])
def test_matches_analytical_solution_in_all_360_bins(name, clip):
    crater = CASES[name]
    got = synthetic_mask(crater, clip)
    want = expected_horizon_deg(crater, np.arange(360.0), H_OBS, R_MAX, clip_negative=clip)
    err = np.abs(got - want)
    print(f"\n{name} (clip={clip}): esperado {want.mean():+.4f}°, error máx {err.max():.4f}°, medio {err.mean():.4f}°")
    assert len(got) == 360
    assert err.max() < TOL_DEG


def test_azimuth_dependent_rim():
    # Pared de 300 + 200·cos(az) m a 8 km: la máscara debe seguir el coseno (más alta al Norte)
    crater = Crater(8_000, 400, lambda az: 300 + 200 * np.cos(np.radians(az)), x0_m=X0, y0_m=Y0)
    got = synthetic_mask(crater, clip=False)
    want = expected_horizon_deg(crater, np.arange(360.0), H_OBS, R_MAX, clip_negative=False)
    # Forma: Norte > Este ≈ Oeste > Sur (el pico del coseno es plano: no se exige el argmax exacto)
    assert got[0] > got[90] > got[180] and abs(got[90] - got[270]) < 0.01
    assert np.max(np.abs(got - want)) < 2 * TOL_DEG  # la convergencia de meridianos curva un poco los rayos


def test_window_too_small_is_an_error():
    crater = CASES["llano"]
    z, tr = make_crater_dem(crater, 5_000.0, PIXEL)
    lat, lon = xy_to_latlon(X0, Y0)
    with pytest.raises(ValueError, match="no cubre"):
        compute_mask(DemWindow(z, tr), float(lat), float(lon), 0.0, H_OBS, 1.0, R_MAX, STEP)
