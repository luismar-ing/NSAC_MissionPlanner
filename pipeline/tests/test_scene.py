"""T2.1.b: convención de cuaterniones y error de interpolación de scene/ephemeris.json.

Comprobación independiente: Tierra → sitio según el archivo (posición de la Luna + q·sitio·q⁻¹)
frente a SPICE (spkcpo con observador en el sitio, geométrico).
"""

import json
from pathlib import Path

import numpy as np
import pytest
import spiceypy as sp

from pipeline.ephemeris import observer_position_km
from pipeline.spice_utils import load_kernels

ROOT = Path(__file__).resolve().parents[2]
SCENE = ROOT / "pipeline" / "out" / "scene" / "ephemeris.json"
SITES = json.loads((ROOT / "pipeline" / "sites.json").read_text(encoding="utf-8"))

pytestmark = pytest.mark.skipif(not SCENE.exists(), reason="falta scene/ephemeris.json (python -m pipeline.ephemeris --scene)")


def qrot(q, v):
    """q·v·q⁻¹ con q = [x, y, z, w] (Hamilton, orden three.js)."""
    u, w = np.asarray(q[:3]), q[3]
    return v + 2 * np.cross(u, np.cross(u, v) + w * v)


def slerp(q0, q1, t):
    q0, q1 = np.asarray(q0), np.asarray(q1)
    d = float(np.clip(np.dot(q0, q1), -1, 1))
    if d < 0:
        q1, d = -q1, -d
    th = np.arccos(d)
    if th < 1e-12:
        return q0
    return (np.sin((1 - t) * th) * q0 + np.sin(t * th) * q1) / np.sin(th)


def catmull_rom(p0, p1, p2, p3, t):
    """Interpolación cúbica de Catmull-Rom entre p1 y p2 (uniforme)."""
    p0, p1, p2, p3 = map(np.asarray, (p0, p1, p2, p3))
    t2, t3 = t * t, t * t * t
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)


@pytest.fixture(scope="module")
def scene():
    load_kernels()
    return json.loads(SCENE.read_text(encoding="utf-8"))


def et_of(scene, k):
    et0 = sp.str2et(scene["start_utc"].replace("Z", ""))
    return et0 + k * scene["step_min"] * 60.0


def site_truth(site, et):
    """Tierra → sitio en J2000 (km), SPICE geométrico, observador en el sitio (spkcpo)."""
    obs = observer_position_km(site["lat"], site["lon"], site["elevation_m"], 0.0)
    state, _ = sp.spkcpo("EARTH", et, "J2000", "OBSERVER", "NONE", obs, "MOON", "MOON_ME")
    return -np.asarray(state[:3])


def site_from_file(site, moon_pos, q):
    obs = observer_position_km(site["lat"], site["lon"], site["elevation_m"], 0.0)
    return np.asarray(moon_pos) + qrot(q, obs)


def test_samples_reproduce_spice_site_position(scene):
    rng = np.random.default_rng(1)
    worst = 0.0
    for k in rng.choice(scene["n"], 40, replace=False):
        for site in SITES:
            err = np.linalg.norm(site_from_file(site, scene["moon_pos_km"][k], scene["moon_quat"][k]) - site_truth(site, et_of(scene, k)))
            worst = max(worst, err)
    print(f"\nEn las muestras: error máx {worst * 1000:.1f} m (redondeo de moon_pos_km a 0.1 km)")
    assert worst < 0.1


def test_midpoint_interpolation(scene):
    rng = np.random.default_rng(2)
    worst_cubic = worst_linear = 0.0
    for k in rng.integers(1, scene["n"] - 2, 60):
        P, Q = scene["moon_pos_km"], scene["moon_quat"]
        cubic = catmull_rom(P[k - 1], P[k], P[k + 1], P[k + 2], 0.5)
        linear = 0.5 * (np.asarray(P[k]) + np.asarray(P[k + 1]))
        q = slerp(Q[k], Q[k + 1], 0.5)
        et = et_of(scene, k) + scene["step_min"] * 30.0
        for site in SITES:
            truth = site_truth(site, et)
            worst_cubic = max(worst_cubic, np.linalg.norm(site_from_file(site, cubic, q) - truth))
            worst_linear = max(worst_linear, np.linalg.norm(site_from_file(site, linear, q) - truth))
    print(f"\nA mitad de intervalo: Catmull-Rom + slerp {worst_cubic * 1000:.1f} m; lineal + slerp {worst_linear:.2f} km")
    assert worst_cubic < 1.0  # tolerancia documentada: < 1 km interpolado
    assert worst_linear > worst_cubic  # por eso el contrato exige interpolación cúbica de posiciones


def test_quaternions_are_continuous_and_unit(scene):
    for key in ("moon_quat", "earth_quat"):
        q = np.asarray(scene[key])
        assert np.max(np.abs(np.linalg.norm(q, axis=1) - 1)) < 1e-6
        assert np.min(np.sum(q[1:] * q[:-1], axis=1)) > 0  # sin saltos de signo (slerp por el camino corto)


def test_earth_quaternion_matches_spice(scene):
    k = scene["n"] // 3
    m = np.array(sp.pxform(scene["earth_frame"], "J2000", et_of(scene, k)))
    v = np.array([0.2, 0.9, -0.4])
    assert np.linalg.norm(qrot(scene["earth_quat"][k], v) - m @ v) < 1e-8


# ---------------------------------------------------------------- T2.1.c: fase lunar y dirección del Sol

import re  # noqa: E402

from pipeline.horizons_fetch import parse_scene, scene_ref_path  # noqa: E402

DOC = ROOT / "docs" / "validation.md"


def sample_index(scene, utc):
    from datetime import datetime

    t0 = datetime.strptime(scene["start_utc"], "%Y-%m-%dT%H:%M:%SZ")
    t = datetime.strptime(utc, "%Y-%m-%dT%H:%M:%SZ")
    k, rem = divmod((t - t0).total_seconds(), scene["step_min"] * 60)
    assert rem == 0, "las fechas de referencia deben coincidir con muestras de la escena"
    return int(k)


def angle_deg(a, b):
    a, b = np.asarray(a, float), np.asarray(b, float)
    return float(np.degrees(np.arctan2(np.linalg.norm(np.cross(a, b)), np.dot(a, b))))


def test_phase_and_sun_direction_vs_horizons(scene):
    phase = parse_scene(scene_ref_path("moon_phase").read_text(encoding="utf-8"), "moon_phase")
    sun = {r["utc"]: r["xyz_km"] for r in parse_scene(scene_ref_path("sun_vec").read_text(encoding="utf-8"), "sun_vec")}
    moon = {r["utc"]: r["xyz_km"] for r in parse_scene(scene_ref_path("moon_vec").read_text(encoding="utf-8"), "moon_vec")}
    lines = ["| Instante (UTC) | Iluminada Horizons (%) | Iluminada escena (%) | Δ (puntos) | Fase S-T-O Horizons (°) | Fase escena (°) | Δ dirección del Sol (°) | Δ posición de la Luna (km) |",
             "|---|---|---|---|---|---|---|---|"]
    worst = {"illu": 0.0, "sun": 0.0, "moon": 0.0}
    for r in phase:
        k = sample_index(scene, r["utc"])
        moon_pos = np.asarray(scene["moon_pos_km"][k])
        sun_dir = np.asarray(scene["sun_dir"][k])
        phi = angle_deg(sun_dir, -moon_pos)  # lo que ve el usuario: luz en dirección sun_dir, Tierra en −moon_pos
        illu = 100 * (1 + np.cos(np.radians(phi))) / 2
        d_illu = abs(illu - r["illu_pct"])
        d_sun = angle_deg(sun_dir, sun[r["utc"]])
        d_moon = float(np.linalg.norm(moon_pos - np.asarray(moon[r["utc"]])))
        worst = {"illu": max(worst["illu"], d_illu), "sun": max(worst["sun"], d_sun), "moon": max(worst["moon"], d_moon)}
        lines.append(f"| {r['utc']} | {r['illu_pct']:.3f} | {illu:.3f} | {d_illu:.3f} | {r['sto_deg']:.3f} | {phi:.3f} | {d_sun:.6f} | {d_moon:.2f} |")
    print(f"\nPeor: iluminada {worst['illu']:.3f} puntos; dirección del Sol {worst['sun']:.6f}°; posición de la Luna {worst['moon']:.2f} km")
    assert worst["illu"] < 0.5 and worst["sun"] < 0.1 and worst["moon"] < 1.0

    block = "\n".join([
        "<!-- vs_scene:start (generado por pipeline/tests/test_scene.py; no editar a mano) -->",
        "Referencia: Horizons desde el geocentro (`500@399`): Luna OBSERVER, cantidades 10 (Illu%) y 24 (S-T-O); vectores ICRF, sin corrección, del Sol y de la Luna. Respuestas en `pipeline/tests/reference/horizons_scene_*.txt`.",
        "La fase de la escena usa la luz en la dirección `sun_dir` (Tierra → Sol) y la Tierra en `−moon_pos`; esa aproximación difiere ≤ 0.15° (paralaje Tierra–Luna) de la geometría vista desde la Luna.",
        "",
        f"**Resultado:** peor diferencia de fracción iluminada **{worst['illu']:.3f} puntos** (criterio < 0.5); dirección del Sol **{worst['sun']:.6f}°** (criterio < 0.1°); posición de la Luna **{worst['moon']:.2f} km**.",
        "",
        *lines,
        "<!-- vs_scene:end -->",
    ])
    text = DOC.read_text(encoding="utf-8")
    pat = re.compile(r"<!-- vs_scene:start.*?<!-- vs_scene:end -->", re.S)
    if pat.search(text):
        text = pat.sub(lambda _: block, text)
    else:
        text = text.rstrip("\n") + "\n\n## 4. Escena: fase lunar y dirección del Sol (T2.1.c)\n\n" + block + "\n"
    DOC.write_text(text, encoding="utf-8", newline="\n")
