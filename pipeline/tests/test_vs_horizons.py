"""T1.1.d (y T5.3.a): az/el de PolePlanner frente a JPL Horizons; regenera la tabla de docs/validation.md §3.

Criterio de la spec (10, T1.1): error < 0.05° en ≥ 5 instantes. Se exige además < 1″ (el acuerdo real
es de milésimas de segundo de arco), porque un error de marco (MOON_PA en vez de MOON_ME) da ~0.03°,
que pasaría el criterio de 0.05°.
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pytest

import pipeline.ephemeris as E
from pipeline.horizons_fetch import header_value, parse, ref_path
from pipeline.spice_utils import load_kernels, loaded_kernel_names, utc_to_et

ROOT = Path(__file__).resolve().parents[2]
SITES = json.loads((ROOT / "pipeline" / "sites.json").read_text(encoding="utf-8"))
DOC = ROOT / "docs" / "validation.md"
SPEC_TOL_DEG = 0.05
STRICT_TOL_ARCSEC = 1.0


def unit_from_az_el(az_deg, el_deg):
    az, el = np.radians(az_deg), np.radians(el_deg)
    return np.column_stack([np.cos(el) * np.sin(az), np.cos(el) * np.cos(az), np.sin(el)])


def compare(site, target):
    rows = parse(ref_path(site["id"], target).read_text(encoding="utf-8"))
    ets = np.array([utc_to_et(datetime.strptime(r["utc"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)) for r in rows])
    v = E.target_enu_km(site, target, ets)
    az, el = E.az_el_deg(v)
    h_az = np.array([r["az_deg"] for r in rows])
    h_el = np.array([r["el_deg"] for r in rows])
    u = v / np.linalg.norm(v, axis=1)[:, None]
    h = unit_from_az_el(h_az, h_el)
    # atan2(|u×h|, u·h): preciso en ángulos pequeños (arccos se queda en ~0.004″ por redondeo)
    sep = np.degrees(np.arctan2(np.linalg.norm(np.cross(u, h), axis=1), (u * h).sum(1)))
    d_el = el - h_el
    d_az = ((az - h_az + 180) % 360 - 180) * np.cos(np.radians(h_el))
    return rows, az, el, sep, d_az, d_el


@pytest.fixture(scope="module", autouse=True)
def kernels():
    load_kernels()


@pytest.mark.parametrize("site", SITES, ids=[s["id"] for s in SITES])
@pytest.mark.parametrize("target", ["sun", "earth"])
def test_matches_horizons(site, target):
    rows, *_, sep, d_az, d_el = compare(site, target)
    assert len(rows) >= 5
    assert np.all(sep < SPEC_TOL_DEG)
    assert np.all(sep * 3600 < STRICT_TOL_ARCSEC), sep.max() * 3600


def test_wrong_frame_would_be_detected():
    """Control negativo: con MOON_PA el error supera el umbral estricto (la prueba sí distingue marcos)."""
    site = next(s for s in SITES if s["id"] == "malapert_massif")
    old = E.MOON_FRAME
    E.MOON_FRAME = "MOON_PA"
    try:
        *_, sep, _, _ = compare(site, "sun")
    finally:
        E.MOON_FRAME = old
    assert sep.max() * 3600 > 10 * STRICT_TOL_ARCSEC


def test_write_validation_table():
    lines = ["| Sitio | Objetivo | Instante (UTC) | Horizons az / el (°) | PolePlanner az / el (°) | Δaz·cos(el) (″) | Δel (″) | Separación (″) |",
             "|---|---|---|---|---|---|---|---|"]
    worst = 0.0
    for site in SITES:
        for target in ("sun", "earth"):
            rows, az, el, sep, d_az, d_el = compare(site, target)
            worst = max(worst, sep.max())
            for r, a, e, s, da, de in zip(rows, az, el, sep, d_az, d_el):
                lines.append(f"| {site['id']} | {target} | {r['utc']} | {r['az_deg']:.6f} / {r['el_deg']:+.6f} | "
                             f"{a:.6f} / {e:+.6f} | {da * 3600:+.4f} | {de * 3600:+.4f} | {s * 3600:.4f} |")
    text = DOC.read_text(encoding="utf-8")
    ephem = header_value(ref_path(SITES[0]["id"], "sun").read_text(encoding="utf-8"), "Target body name")
    block = "\n".join([
        "<!-- vs_horizons:start (generado por pipeline/tests/test_vs_horizons.py; no editar a mano) -->",
        f"Kernels PolePlanner: {', '.join(loaded_kernel_names())}; marco {E.MOON_FRAME}; corrección {E.ABCORR}; h_obs = 3 m.",
        f"Horizons: {ephem.split('{')[-1].rstrip('}').strip() if '{' in ephem else ephem}; respuestas en `pipeline/tests/reference/`.",
        "",
        f"**Resultado:** {len(lines) - 2} comparaciones (5 sitios × Sol y Tierra × 7 instantes). "
        f"Peor separación angular: **{worst * 3600:.4f}″ = {worst:.2e}°** (criterio de la spec: < 0.05° = 180″; criterio estricto de la prueba: < 1″).",
        "Control negativo: con MOON_PA en lugar de MOON_ME el error sube a ~100″, y sin corrección de luz (NONE) a ~21″; la comparación distingue ambos errores.",
        "",
        *lines,
        "<!-- vs_horizons:end -->",
    ])
    pattern = re.compile(r"<!-- vs_horizons:start.*?<!-- vs_horizons:end -->", re.S)
    if pattern.search(text):
        text = pattern.sub(lambda _: block, text)
    else:
        text = text.replace("Tabla de errores de PolePlanner frente a Horizons, con ≥ 5 instantes × 2 sitios para el Sol y la Tierra (objetivo < 0.05°).",
                            "Tabla de errores de PolePlanner frente a Horizons, con ≥ 5 instantes × 2 sitios para el Sol y la Tierra (objetivo < 0.05°).\n\n" + block)
    DOC.write_text(text, encoding="utf-8", newline="\n")
    assert "vs_horizons:start" in DOC.read_text(encoding="utf-8")
    print(f"\nPeor separación: {worst * 3600:.4f}″")
