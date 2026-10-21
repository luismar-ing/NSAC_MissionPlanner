"""Trayectoria ILLUSTRATIVE por plan (spec 5.8; contrato §11; D5).

No es la trayectoria de ninguna misión real. Es una curva continua, por tramos, con la posición y la
orientación de la Luna reales (SPICE) para que el cohete llegue al sitio a la hora de llegada:

  1. Despegue (0 → ASCENT_MIN): ascenso radial desde una plataforma genérica que gira con la Tierra
     (IAU_EARTH) hasta PARKING_ALT_KM.
  2. Órbita de espera circular hasta la inyección translunar (t = INJECTION_H).
  3. Transferencia: curva de Hermite tangente a la órbita de espera, hasta un punto a APPROACH_START_KM
     del centro de la Luna (del lado de la Tierra) en lunar_arrival_utc = llegada − APPROACH_H.
  4. Aproximación y descenso en el marco de la Luna: el radio baja y la dirección gira hasta el sitio,
     que se alcanza exactamente en arrival_utc (= landing_utc).

Marco: J2000 con centro en la Tierra (el de la escena). Todos los parámetros son de diseño, no datos.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import numpy as np

from pipeline import config
from pipeline.ephemeris import MOON_FRAME, SCENE_FRAME, observer_position_km

MODE = "ILLUSTRATIVE"
R_EARTH_KM = 6378.137  # radio ecuatorial (solo para dibujar el despegue)
PAD_LAT_DEG, PAD_LON_DEG = 0.0, 0.0  # plataforma genérica ILLUSTRATIVE (no es un puerto espacial real)
ASCENT_MIN = 10.0
PARKING_ALT_KM = 200.0
INJECTION_H = 2.0
APPROACH_H = 12.0
APPROACH_START_KM = 8000.0


@dataclass(frozen=True)
class Phases:
    launch: datetime
    injection: datetime
    lunar_arrival: datetime
    landing: datetime


def phases_for(arrival: datetime, transit_days: float = config.TRANSIT_DAYS) -> Phases:
    launch = arrival - timedelta(days=transit_days)
    return Phases(launch, launch + timedelta(hours=INJECTION_H), arrival - timedelta(hours=APPROACH_H), arrival)


def sample_times_s(ph: Phases) -> np.ndarray:
    """Instantes (s desde el despegue): más densos donde la curva cambia rápido."""
    total = (ph.landing - ph.launch).total_seconds()
    t_inj = (ph.injection - ph.launch).total_seconds()
    t_la = (ph.lunar_arrival - ph.launch).total_seconds()
    parts = [
        np.linspace(0, ASCENT_MIN * 60, 6, endpoint=False),
        np.linspace(ASCENT_MIN * 60, t_inj, 16, endpoint=False),
        t_inj + (t_la - t_inj) * (1 - np.cos(np.linspace(0, np.pi / 2, 50, endpoint=False))),  # denso al salir
        np.linspace(t_la, total - 3600, 30, endpoint=False),
        np.linspace(total - 3600, total, 21),  # última hora: descenso
    ]
    return np.concatenate(parts)


class Geometry:
    """Posiciones SPICE (geométricas, J2000) que necesita la curva."""

    def __init__(self):
        from pipeline.spice_utils import load_kernels

        load_kernels()

    @staticmethod
    def et(dt: datetime) -> float:
        from pipeline.spice_utils import utc_to_et

        return utc_to_et(dt)

    def moon_pos(self, et: float) -> np.ndarray:
        import spiceypy as sp

        return np.asarray(sp.spkpos("MOON", et, SCENE_FRAME, "NONE", "EARTH")[0])

    def moon_rot(self, et: float) -> np.ndarray:
        import spiceypy as sp

        return np.asarray(sp.pxform(MOON_FRAME, SCENE_FRAME, et))

    def earth_rot(self, et: float) -> np.ndarray:
        import spiceypy as sp

        return np.asarray(sp.pxform("IAU_EARTH", SCENE_FRAME, et))

    def site_pos(self, site: dict, et: float) -> np.ndarray:
        """Posición del sitio (superficie, sin h_obs) respecto a la Tierra en J2000."""
        return self.moon_pos(et) + self.moon_rot(et) @ observer_position_km(site["lat"], site["lon"], site["elevation_m"], 0.0)


def _unit(v):
    v = np.asarray(v, dtype=float)
    return v / np.linalg.norm(v)


def _slerp_dir(a, b, s):
    a, b = _unit(a), _unit(b)
    th = np.arccos(np.clip(np.dot(a, b), -1, 1))
    if th < 1e-12:
        return a
    return (np.sin((1 - s) * th) * a + np.sin(s * th) * b) / np.sin(th)


def _hermite(p0, t0, p1, t1, s):
    h00, h10 = 2 * s**3 - 3 * s**2 + 1, s**3 - 2 * s**2 + s
    h01, h11 = -2 * s**3 + 3 * s**2, s**3 - s**2
    return h00 * p0 + h10 * t0 + h01 * p1 + h11 * t1


def _smoothstep(s):
    return s * s * (3 - 2 * s)


def build(site: dict, arrival: datetime, geo: Geometry | None = None) -> dict:
    """trajectory/{id}.json (contrato §11) para un sitio y un día de llegada."""
    geo = geo or Geometry()
    ph = phases_for(arrival)
    t0 = ph.launch
    et_launch = geo.et(ph.launch)
    t_s = sample_times_s(ph)
    t_inj = (ph.injection - t0).total_seconds()
    t_la = (ph.lunar_arrival - t0).total_seconds()
    total = (ph.landing - t0).total_seconds()

    pad_ecef = observer_position_km(PAD_LAT_DEG, PAD_LON_DEG, 0.0, 0.0) / 1737.4 * R_EARTH_KM
    up_launch = _unit(geo.earth_rot(et_launch) @ pad_ecef)
    r_park = R_EARTH_KM + PARKING_ALT_KM
    et_la = geo.et(ph.lunar_arrival)
    moon_la = geo.moon_pos(et_la)
    # Plano de la órbita de espera: contiene la vertical del despegue y la dirección a la Luna a la llegada
    normal = _unit(np.cross(up_launch, _unit(moon_la)))
    t_asc = ASCENT_MIN * 60.0
    omega = np.sqrt(398600.4418 / r_park**3)  # rad/s (movimiento medio circular, μ de la Tierra)

    def parking(t):
        ang = omega * (t - t_asc)
        return r_park * (np.cos(ang) * up_launch + np.sin(ang) * np.cross(normal, up_launch))

    def parking_vel_dir(t):
        ang = omega * (t - t_asc)
        return _unit(-np.sin(ang) * up_launch + np.cos(ang) * np.cross(normal, up_launch))

    p_inj = parking(t_inj)
    p_la = moon_la - _unit(moon_la) * APPROACH_START_KM  # del lado de la Tierra, a 8 000 km del centro lunar
    chord = np.linalg.norm(p_la - p_inj)
    tan0 = parking_vel_dir(t_inj) * chord * 1.0
    tan1 = _unit(p_la - p_inj) * chord * 0.6
    rel_la = p_la - moon_la
    site_rel_land = geo.site_pos(site, geo.et(ph.landing)) - geo.moon_pos(geo.et(ph.landing))

    pos = []
    for t in t_s:
        dt = ph.launch + timedelta(seconds=float(t))
        if t <= t_asc:  # 1. despegue radial (la plataforma gira con la Tierra)
            up = _unit(geo.earth_rot(geo.et(dt)) @ pad_ecef)
            s = _smoothstep(t / t_asc)
            # dirección y radio por separado (mezclar puntos linealmente cortaría por dentro de la Tierra);
            # al final del ascenso la dirección coincide con la de la órbita de espera
            p = _slerp_dir(up, parking(t), s) * (R_EARTH_KM + PARKING_ALT_KM * s)
        elif t <= t_inj:  # 2. órbita de espera
            p = parking(t)
        elif t <= t_la:  # 3. transferencia
            p = _hermite(p_inj, tan0, p_la, tan1, (t - t_inj) / (t_la - t_inj))
        else:  # 4. aproximación y descenso en el marco de la Luna
            et = geo.et(dt)
            s = (t - t_la) / (total - t_la)
            direction = _slerp_dir(rel_la, site_rel_land, _smoothstep(s))
            r = np.linalg.norm(rel_la) + (np.linalg.norm(site_rel_land) - np.linalg.norm(rel_la)) * (1 - (1 - s) ** 3)
            p = geo.moon_pos(et) + r * direction
            if t == total:
                p = geo.site_pos(site, et)  # aterrizaje exacto en el sitio
        pos.append(p)

    stamp = arrival.strftime("%Y%m%d")
    iso = lambda d: d.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")  # noqa: E731
    return {
        "id": f"{site['id']}_{stamp}",
        "site_id": site["id"],
        "mode": MODE,
        "frame": SCENE_FRAME,
        "t0_utc": iso(ph.launch),
        "t_s": [round(float(x), 1) for x in t_s],
        "pos_km": np.round(np.array(pos), 1).tolist(),
        "phases": {"launch_utc": iso(ph.launch), "injection_utc": iso(ph.injection),
                   "lunar_arrival_utc": iso(ph.lunar_arrival), "landing_utc": iso(ph.landing)},
    }
