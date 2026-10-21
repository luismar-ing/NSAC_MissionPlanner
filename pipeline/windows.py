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
