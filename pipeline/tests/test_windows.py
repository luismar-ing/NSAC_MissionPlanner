"""T1.4.a: agregados diarios (spec 5.5, contrato §8) con series construidas a mano."""

from datetime import datetime, timezone

import numpy as np
import pytest

from pipeline.windows import (
    add_scores,
    daily_aggregates,
    longest_run,
    longest_run_in_windows,
    meets_constraints,
    normalize,
    window_metrics,
)

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


# ---------------------------------------------------------------- ventanas (T1.4.b)



def naive_window(sun, earth, d, L, step=STEP):
    """Cálculo directo de una ventana, muestra a muestra (referencia de la prueba)."""
    spd, h = 1440 // step, step / 60
    s, e = sun[d * spd:(d + L) * spd].astype(bool), earth[d * spd:(d + L) * spd].astype(bool)
    daily = [e[k * spd:(k + 1) * spd].sum() * h for k in range(L)]
    return {
        "sun_pct": 100 * s.mean(),
        "longest_dark_h": longest_run(~s) * h,
        "earth_h_min": min(daily),
        "earth_h_mean": sum(daily) / L,
        "longest_comm_gap_h": longest_run(~e) * h,
    }


def random_series(rng, days, p_flip=0.03):
    """Serie 0/1 con rachas largas (cambia de estado con probabilidad p_flip por muestra)."""
    flips = rng.random(days * SPD) < p_flip
    return (np.cumsum(flips) % 2).astype(np.uint8)


def test_dark_streak_crosses_days_inside_a_window():
    sun = np.ones(3 * SPD, dtype=np.uint8)
    sun[22 * 2: 24 * 2 + 4 * 2] = 0  # 6 h seguidas entre el día 1 y el 2
    (row,) = window_metrics(T0, STEP, sun, np.ones(3 * SPD), n_arrivals=1, window_days=3)
    assert row["longest_dark_h"] == 6.0  # en la ventana la racha no se corta (a diferencia de daily)


def test_streak_is_clipped_to_the_window():
    sun = np.zeros(4 * SPD, dtype=np.uint8)  # todo oscuro
    rows = window_metrics(T0, STEP, sun, np.ones(4 * SPD), n_arrivals=2, window_days=2)
    assert [r["longest_dark_h"] for r in rows] == [48.0, 48.0]


def test_matches_naive_on_200_random_windows():
    rng = np.random.default_rng(20271)
    checked = 0
    for L in (3, 7, 14):
        days = 100
        sun, earth = random_series(rng, days), random_series(rng, days, 0.05)
        n_arr = days - L + 1
        rows = window_metrics(T0, STEP, sun, earth, n_arrivals=n_arr, window_days=L, ndigits=None)
        for d in rng.choice(n_arr, size=min(67, n_arr), replace=False):
            ref = naive_window(sun, earth, int(d), L)
            for k, v in ref.items():
                assert abs(rows[d][k] - v) < 1e-9, (L, d, k)
            checked += 1
    print(f"\n{checked} ventanas comparadas con el cálculo ingenuo")
    assert checked >= 200  # 67 × 3 = 201


def test_rows_are_daily_from_arrival_start():
    rows = window_metrics(T0, STEP, np.ones(10 * SPD), np.ones(10 * SPD), n_arrivals=4, window_days=7)
    assert [r["start"] for r in rows] == [f"2027-01-0{d}T00:00:00Z" for d in range(1, 5)]


def test_rejects_series_too_short():
    with pytest.raises(ValueError):
        window_metrics(T0, STEP, np.ones(5 * SPD), np.ones(5 * SPD), n_arrivals=2, window_days=7)


def test_longest_run_in_windows_without_gaps():
    assert longest_run_in_windows(np.ones(100), np.array([0, 10]), 20).tolist() == [0, 0]


# ---------------------------------------------------------------- score y restricciones (T1.4.c)


W = {"w1": 0.4, "w2": 0.3, "w3": 0.3}


def row(sun, dark, earth_mean, earth_min=None):
    return {"sun_pct": sun, "longest_dark_h": dark, "earth_h_mean": earth_mean,
            "earth_h_min": earth_mean if earth_min is None else earth_min}


def test_normalize():
    assert normalize([10, 20, 30]).tolist() == [0.0, 0.5, 1.0]
    assert normalize([7, 7]).tolist() == [0.5, 0.5]


def test_best_and_worst_scores():
    rows = {"a": [row(100, 0, 24)], "b": [row(0, 100, 0)], "c": [row(50, 50, 12)]}
    add_scores(rows, W, ndigits=None)
    assert rows["a"][0]["score"] == pytest.approx(1.0)
    assert rows["b"][0]["score"] == pytest.approx(0.0)
    assert rows["c"][0]["score"] == pytest.approx(0.5)


def test_score_in_unit_interval_and_normalized_across_sites():
    rng = np.random.default_rng(7)
    rows = {s: [row(*rng.uniform([0, 0, 0], [100, 336, 24])) for _ in range(50)] for s in "abcde"}
    add_scores(rows, W)
    scores = [r["score"] for rs in rows.values() for r in rs]
    assert min(scores) >= 0 and max(scores) <= 1


def test_more_sun_never_lowers_the_score():
    base = {"a": [row(40, 30, 10)], "b": [row(10, 80, 2)], "c": [row(90, 5, 20)]}
    better = {"a": [row(60, 30, 10)], "b": [row(10, 80, 2)], "c": [row(90, 5, 20)]}
    add_scores(base, W, ndigits=None)
    add_scores(better, W, ndigits=None)
    assert better["a"][0]["score"] >= base["a"][0]["score"]


def test_weights_need_not_sum_to_one():
    a = {"x": [row(100, 0, 24)], "y": [row(0, 100, 0)]}
    add_scores(a, {"w1": 2, "w2": 0, "w3": 0})
    assert [a["x"][0]["score"], a["y"][0]["score"]] == [1.0, 0.0]


def test_constraints_optional_and_inclusive():
    r = row(80, 12, 15, earth_min=6)
    assert meets_constraints(r)  # todos los controles desactivados
    assert meets_constraints(r, min_sun_pct=80, max_dark_h=12, min_earth_h=6)  # límites incluidos
    assert not meets_constraints(r, min_sun_pct=80.01)
    assert not meets_constraints(r, max_dark_h=11.99)
    assert not meets_constraints(r, min_earth_h=6.01)
    assert meets_constraints(r, min_sun_pct=None, max_dark_h=None, min_earth_h=5)
