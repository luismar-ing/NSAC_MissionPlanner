"""Parámetros del pipeline: decisiones confirmadas (docs/DECISIONS.md) y rangos derivados.

Única fuente de estos valores para todo el pipeline. Si cambia una decisión, se cambia aquí.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

# D4: llegadas durante un año (2027-01-01 a 2027-12-31, ambos incluidos)
ARRIVAL_START = datetime(2027, 1, 1, tzinfo=timezone.utc)
ARRIVAL_END = datetime(2027, 12, 31, tzinfo=timezone.utc)

# D5: trayectoria ILLUSTRATIVE con 3 días de tránsito
TRAJECTORY_MODE = "ILLUSTRATIVE"
TRANSIT_DAYS = 3

# D12: observador y antena
H_OBS_M = 3.0
ANTENNA_MARGIN_DEG = 0.5

# Spec 5.1, 5.2, 5.3, 5.6, 5.8
STEP_MIN = 30
SCENE_STEP_MIN = 60
WINDOW_DAYS = (3, 7, 14)
SUN_RADIUS_DEG = 0.265
EARTH_RADIUS_DEG = 0.95  # spec 5.4: radio angular aproximado de la Tierra vista desde la Luna
HORIZON_AZ_STEP_DEG = 1.0
HORIZON_R_MAX_KM = 100.0
SCORE_WEIGHTS = {"w1": 0.4, "w2": 0.3, "w3": 0.3}


def timeseries_range() -> tuple[datetime, datetime]:
    """[inicio, fin) de las series del sitio (contrato §2)."""
    return ARRIVAL_START, ARRIVAL_END + timedelta(days=1 + max(WINDOW_DAYS))


def scene_range() -> tuple[datetime, datetime]:
    """[inicio, fin) de la escena (contrato §2): desde el primer despegue − 1 día hasta el fin de las series."""
    return ARRIVAL_START - timedelta(days=TRANSIT_DAYS + 1), timeseries_range()[1]
