"""T2.2.b: la trayectoria ILLUSTRATIVE es continua, no atraviesa cuerpos y aterriza en el sitio a la hora."""

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pytest

from pipeline.contract import Trajectory, parse_instant
from pipeline.trajectory import R_EARTH_KM, Geometry, build

SITES = json.loads((Path(__file__).resolve().parents[1] / "sites.json").read_text(encoding="utf-8"))
ARRIVALS = [datetime(2027, 1, 1, tzinfo=timezone.utc), datetime(2027, 3, 10, tzinfo=timezone.utc),
            datetime(2027, 8, 21, tzinfo=timezone.utc), datetime(2027, 12, 31, tzinfo=timezone.utc)]
MAX_SPEED_KM_S = 12.0  # umbral de «sin saltos»: ninguna muestra implica más de 12 km/s (escape ~11 km/s)


@pytest.fixture(scope="module")
def geo():
    return Geometry()


@pytest.mark.parametrize("site", SITES, ids=[s["id"] for s in SITES])
@pytest.mark.parametrize("arrival", ARRIVALS, ids=[a.strftime("%Y%m%d") for a in ARRIVALS])
def test_trajectory(site, arrival, geo):
    tr = build(site, arrival, geo)
    Trajectory.model_validate(tr)  # contrato §11: t_s creciente, fases en orden, id, landing = último instante
    assert tr["mode"] == "ILLUSTRATIVE"
    t = np.array(tr["t_s"])
    p = np.array(tr["pos_km"])
    # tiempos monótonos y duración = transit_days
    assert np.all(np.diff(t) > 0) and t[-1] == pytest.approx(3 * 86400)
    # sin saltos: velocidad implícita entre muestras acotada
    speed = np.linalg.norm(np.diff(p, axis=0), axis=1) / np.diff(t)
    assert speed.max() < MAX_SPEED_KM_S, speed.max()
    # nunca por dentro de la Tierra (sale de la superficie y sube)
    assert np.linalg.norm(p, axis=1).min() >= R_EARTH_KM - 0.1
    # aterrizaje: último punto = posición SPICE del sitio en arrival_utc (< 1 km)
    landing = parse_instant(tr["phases"]["landing_utc"])
    assert landing == arrival
    truth = geo.site_pos(site, geo.et(arrival))
    assert np.linalg.norm(p[-1] - truth) < 1.0
    # durante la aproximación nunca por dentro de la Luna
    t_la = (parse_instant(tr["phases"]["lunar_arrival_utc"]) - parse_instant(tr["t0_utc"])).total_seconds()
    for ti, pi in zip(t, p):
        if ti >= t_la:
            et = geo.et(parse_instant(tr["t0_utc"]) + timedelta(seconds=float(ti)))
            assert np.linalg.norm(pi - geo.moon_pos(et)) >= 1737.4 - 7.5  # radio lunar menos la depresión máxima del DEM
