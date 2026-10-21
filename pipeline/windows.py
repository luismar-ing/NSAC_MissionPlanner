"""Métricas diarias y por ventana (spec 5.5, 5.6; contrato §8 y §9).

Convención (contrato §7): la muestra k representa el intervalo [t_k, t_k + step_min).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import numpy as np

MIN_PER_DAY = 1440


def longest_run(flags: np.ndarray) -> int:
    """Longitud (en muestras) de la racha más larga de valores verdaderos consecutivos."""
    f = np.asarray(flags, dtype=bool)
    if not f.any():
        return 0
    padded = np.concatenate([[False], f, [False]])
    edges = np.flatnonzero(np.diff(padded.astype(np.int8)))
    return int((edges[1::2] - edges[::2]).max())


def samples_per_day(step_min: int) -> int:
    if MIN_PER_DAY % step_min:
        raise ValueError(f"step_min = {step_min} no divide un día")
    return MIN_PER_DAY // step_min


def daily_aggregates(start_utc: datetime, step_min: int, sun_vis: np.ndarray, earth_vis: np.ndarray) -> list[dict]:
    """Agregados por día UTC (contrato §8). Las rachas se cortan en la medianoche UTC.

    Requiere que la serie empiece a las 00:00Z y cubra un número entero de días.
    """
    start_utc = start_utc.astimezone(timezone.utc)
    if (start_utc.hour, start_utc.minute, start_utc.second) != (0, 0, 0):
        raise ValueError("la serie debe empezar a las 00:00:00Z")
    spd = samples_per_day(step_min)
    sun = np.asarray(sun_vis, dtype=bool)
    earth = np.asarray(earth_vis, dtype=bool)
    if sun.shape != earth.shape or sun.size % spd:
        raise ValueError(f"las series deben medir lo mismo y un múltiplo de {spd} muestras (días completos)")
    h = step_min / 60.0
    rows = []
    for d, (s, e) in enumerate(zip(sun.reshape(-1, spd), earth.reshape(-1, spd))):
        rows.append({
            "date": (start_utc + timedelta(days=d)).strftime("%Y-%m-%d"),
            "sun_pct": round(100.0 * s.mean(), 2),
            "earth_h": round(e.sum() * h, 2),
            "longest_dark_h": round(longest_run(~s) * h, 2),
            "longest_comm_gap_h": round(longest_run(~e) * h, 2),
        })
    return rows


def zero_runs(flags: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Rachas de valores falsos: arrays (inicio, fin) en muestras, intervalo [inicio, fin)."""
    f = np.asarray(flags, dtype=bool)
    padded = np.concatenate([[True], f, [True]])
    edges = np.flatnonzero(np.diff(padded.astype(np.int8)))
    return edges[::2], edges[1::2]


def longest_run_in_windows(flags: np.ndarray, starts: np.ndarray, length: int) -> np.ndarray:
    """Racha más larga de falsos dentro de cada ventana [s, s + length), en muestras.

    Cada racha global se recorta a la ventana: min(fin, e) − max(inicio, s). Vectorizado:
    ventanas × rachas (365 × unos miles), sin recorrer muestra a muestra.
    """
    a, b = zero_runs(flags)
    if a.size == 0:
        return np.zeros(len(starts), dtype=int)
    s = np.asarray(starts)[:, None]
    clipped = np.minimum(b[None, :], s + length) - np.maximum(a[None, :], s)
    return np.clip(clipped, 0, None).max(axis=1)


def window_metrics(start_utc: datetime, step_min: int, sun_vis: np.ndarray, earth_vis: np.ndarray,
                   n_arrivals: int, window_days: int, ndigits: int | None = 2) -> list[dict]:
    """Métricas de 5.5 para cada día de llegada (contrato §9), sin el score (T1.4.c).

    La llegada d empieza en la muestra d · muestras_por_día (00:00Z) y la ventana dura
    window_days días: [t0, t0 + L días). `ndigits=None` desactiva el redondeo (pruebas).
    """
    rnd = (lambda x: round(float(x), ndigits)) if ndigits is not None else float
    start_utc = start_utc.astimezone(timezone.utc)
    spd = samples_per_day(step_min)
    sun = np.asarray(sun_vis, dtype=bool)
    earth = np.asarray(earth_vis, dtype=bool)
    need = (n_arrivals - 1 + window_days) * spd
    if sun.size < need or earth.size != sun.size:
        raise ValueError(f"la serie tiene {sun.size} muestras; {n_arrivals} llegadas con L = {window_days} necesitan {need}")
    h = step_min / 60.0
    length = window_days * spd
    starts = np.arange(n_arrivals) * spd

    csum = np.concatenate([[0], np.cumsum(sun, dtype=np.int64)])
    sun_pct = 100.0 * (csum[starts + length] - csum[starts]) / length

    n_days = sun.size // spd
    earth_daily_h = earth[: n_days * spd].reshape(n_days, spd).sum(axis=1) * h
    per_window = np.lib.stride_tricks.sliding_window_view(earth_daily_h, window_days)[:n_arrivals]
    earth_min, earth_mean = per_window.min(axis=1), per_window.mean(axis=1)

    dark = longest_run_in_windows(sun, starts, length) * h
    gap = longest_run_in_windows(earth, starts, length) * h

    return [
        {
            "start": (start_utc + timedelta(days=int(d))).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "sun_pct": rnd(sun_pct[d]),
            "longest_dark_h": rnd(dark[d]),
            "earth_h_min": rnd(earth_min[d]),
            "earth_h_mean": rnd(earth_mean[d]),
            "longest_comm_gap_h": rnd(gap[d]),
        }
        for d in range(n_arrivals)
    ]
