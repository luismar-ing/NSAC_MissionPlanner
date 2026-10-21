"""T1.4.a: agregados diarios (spec 5.5, contrato §8) con series construidas a mano."""

from datetime import datetime, timezone

import numpy as np
import pytest

from pipeline.windows import daily_aggregates, longest_run

T0 = datetime(2027, 1, 1, tzinfo=timezone.utc)
STEP = 30
SPD = 48  # muestras por día con paso de 30 min


def hours(h0, h1, days=1, value=1):
    """Serie de `days` días con `value` en [h0, h1) horas desde el inicio y lo contrario fuera."""
    a = np.full(days * SPD, 1 - value, dtype=np.uint8)
    a[int(h0 * 2): int(h1 * 2)] = value
    return a


def test_longest_run():
    assert longest_run(np.array([0, 1, 1, 0, 1, 1, 1, 0])) == 3
    assert longest_run(np.zeros(5)) == 0
    assert longest_run(np.ones(5)) == 5


def test_full_sun_and_link():
    (row,) = daily_aggregates(T0, STEP, np.ones(SPD), np.ones(SPD))
    assert row == {"date": "2027-01-01", "sun_pct": 100.0, "earth_h": 24.0, "longest_dark_h": 0.0, "longest_comm_gap_h": 0.0}


def test_known_day():
    sun = hours(6, 18)  # Sol de 06:00 a 18:00 → 50 %, oscuridad más larga 6 h (00-06 y 18-24 por separado)
    earth = hours(2, 5.5, value=0)  # sin Tierra de 02:00 a 05:30 → 20.5 h con enlace, hueco 3.5 h
    (row,) = daily_aggregates(T0, STEP, sun, earth)
    assert row == {"date": "2027-01-01", "sun_pct": 50.0, "earth_h": 20.5, "longest_dark_h": 6.0, "longest_comm_gap_h": 3.5}


def test_dark_streak_crossing_midnight_is_cut_per_day():
    sun = np.ones(2 * SPD, dtype=np.uint8)
    sun[22 * 2: 24 * 2 + 4 * 2] = 0  # oscuridad de 22:00 del día 1 a 04:00 del día 2 (6 h seguidas)
    rows = daily_aggregates(T0, STEP, sun, np.ones(2 * SPD))
    assert [r["date"] for r in rows] == ["2027-01-01", "2027-01-02"]
    assert [r["longest_dark_h"] for r in rows] == [2.0, 4.0]  # dentro de cada día (contrato §8)
    assert rows[0]["sun_pct"] == pytest.approx(100 * 22 / 24, abs=0.01)


def test_step_10_min():
    sun = np.ones(144, dtype=np.uint8)
    sun[:7] = 0  # 70 min sin Sol
    (row,) = daily_aggregates(T0, 10, sun, np.ones(144))
    assert row["longest_dark_h"] == pytest.approx(70 / 60, abs=0.01)


@pytest.mark.parametrize("bad", ["start", "partial", "step"])
def test_rejects_bad_series(bad):
    with pytest.raises(ValueError):
        if bad == "start":
            daily_aggregates(T0.replace(hour=1), STEP, np.ones(SPD), np.ones(SPD))
        elif bad == "partial":
            daily_aggregates(T0, STEP, np.ones(SPD + 1), np.ones(SPD + 1))
        else:
            daily_aggregates(T0, 7, np.ones(SPD), np.ones(SPD))
