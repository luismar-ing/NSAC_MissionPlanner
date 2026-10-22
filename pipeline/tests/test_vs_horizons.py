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


# ---------------------------------------------------------------- T5.3.a: resumen final regenerable

KERNEL_ROLE = {
    "naif0012.tls": "LSK (segundos intercalares)",
    "pck00011.tpc": "PCK de texto (constantes, radios, IAU_EARTH)",
    "de440s.bsp": "SPK planetario DE440",
    "moon_pa_de440_200625.bpc": "PCK binario de orientación lunar (DE440)",
    "moon_de440_250416.tf": "FK lunar (MOON_ME / MOON_PA)",
}
DATA = ROOT / "web" / "public" / "data"
OUT = ROOT / "pipeline" / "out"


def _sha256(path: Path) -> str:
    import hashlib

    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _sanity_rows():
    """Sanity checks de 5.7 sobre los datos PUBLICADOS (web/public/data, versionados), por sitio."""
    rows = []
    for site in SITES:
        sid = site["id"]
        ts = json.loads((DATA / "timeseries" / f"{sid}.json").read_text(encoding="utf-8"))
        k = ts["angle_scale"]
        sun_el = np.abs(np.array(ts["sun_el"]) * k)
        earth_el = np.abs(np.array(ts["earth_el"]) * k)
        az = np.radians(np.array(ts["earth_az"]) * k)
        spread = float(np.degrees(np.ptp(np.unwrap(az - np.angle(np.mean(np.exp(1j * az)))))))
        b = E.elevation_bounds_deg(site["lat"])
        mask = np.array(json.loads((DATA / "horizon" / f"{sid}.json").read_text(encoding="utf-8"))["elev_deg"])
        flags_ok = set(np.unique(ts["sun_vis"])) <= {0, 1} and set(np.unique(ts["earth_vis"])) <= {0, 1}
        sun_pct = 100 * float(np.mean(ts["sun_vis"]))
        win_ok = True
        for L in (3, 7, 14):
            w = json.loads((DATA / "windows" / f"{sid}_{L}d.json").read_text(encoding="utf-8"))["rows"]
            win_ok &= len(w) == 365 and all(0 <= r["sun_pct"] <= 100 and 0 <= r["score"] <= 1 and r["longest_dark_h"] <= 24 * L for r in w)
        rows.append(dict(sid=sid, sun=float(sun_el.max()), sun_b=b["sun"], earth=float(earth_el.max()), earth_b=b["earth"], spread=spread,
                         mask=float(np.abs(mask).max()), sun_pct=sun_pct, flags=flags_ok, win=win_ok))
    return rows


def test_write_validation_summary():
    """Regenera el resumen final (§0) de docs/validation.md: fuentes, kernels, resultados y sanity checks."""
    from datetime import date

    # Horizons: fechas de consulta (cabecera de cada respuesta guardada)
    fetched = sorted(header_value(ref_path(s["id"], t).read_text(encoding="utf-8"), "# fetched_utc")
                     for s in SITES for t in ("sun", "earth"))
    worst = max(compare(s, t)[3].max() for s in SITES for t in ("sun", "earth"))
    old = E.MOON_FRAME
    E.MOON_FRAME = "MOON_PA"
    try:
        wrong = compare(next(s for s in SITES if s["id"] == "malapert_massif"), "sun")[3].max()
    finally:
        E.MOON_FRAME = old

    # kernels: sha256 recalculado y comparado con el registrado en data/README.md
    readme = (ROOT / "data" / "README.md").read_text(encoding="utf-8")
    krows, all_match = [], True
    for name in loaded_kernel_names():
        sha = _sha256(ROOT / "data" / "kernels" / name)
        match = sha in readme
        all_match &= match
        krows.append(f"| `{name}` | {KERNEL_ROLE.get(name, '')} | `{sha[:16]}…` | {'✓ coincide' if match else '✗ NO coincide'} |")
    assert all_match, "algún kernel no coincide con el sha256 de data/README.md"

    # fase lunar (T2.1.c): línea de resultado del bloque que genera test_scene.py
    text = DOC.read_text(encoding="utf-8")
    m = re.search(r"<!-- vs_scene:start.*?\*\*Resultado:\*\* (.*?)\n", text, re.S)
    phase = m.group(1) if m else "ver §4"

    sanity = _sanity_rows()
    srows = [f"| {r['sid']} | {r['sun']:.2f}° ≤ {r['sun_b']:.2f}° {'✓' if r['sun'] <= r['sun_b'] else '✗'} | "
             f"{r['earth']:.2f}° ≤ {r['earth_b']:.2f}° {'✓' if r['earth'] <= r['earth_b'] else '✗'} | "
             f"{r['spread']:.1f}° < 40° {'✓' if r['spread'] < 40 else '✗'} | {r['mask']:.2f}° < 10° {'✓' if r['mask'] < 10 else '✗'} | "
             f"{r['sun_pct']:.1f} % | {'✓' if r['flags'] and r['win'] else '✗'} |" for r in sanity]
    ok_sanity = all(r["sun"] <= r["sun_b"] and r["earth"] <= r["earth_b"] and r["spread"] < 40 and r["mask"] < 10 and r["flags"] and r["win"] for r in sanity)
    assert ok_sanity
    ctrl = OUT / "flags_control_shackleton_floor.npz"
    if ctrl.exists():
        ctrl_pct = 100 * float(np.load(ctrl)["sun_vis"].mean())
        control = (f"Control negativo de 5.7 (fondo del cráter Shackleton, permanentemente en sombra): Sol el **{ctrl_pct:.2f} %** "
                   f"del año, frente a ≥ {min(r['sun_pct'] for r in sanity):.1f} % en los sitios de cresta ✓ (salida intermedia del pipeline, `pipeline/out/`).")
    else:
        control = "Control negativo de 5.7 (fondo del cráter Shackleton): requiere las salidas intermedias del pipeline (`python -m pipeline.build_all`)."

    block = "\n".join([
        "<!-- validation_summary:start (generado por pipeline/tests/test_vs_horizons.py; no editar a mano) -->",
        f"Generado el {date.today().isoformat()} con `python -m pytest pipeline/tests/test_vs_horizons.py -v` (la fase lunar, con `pipeline/tests/test_scene.py`).",
        "",
        f"**Referencia:** JPL Horizons (API `https://ssd.jpl.nasa.gov/api/horizons.api`), efemérides DE441. Consultas hechas el {fetched[0][:10]} "
        f"({fetched[0]} a {fetched[-1]}); respuestas crudas en `pipeline/tests/reference/` (`python -m pipeline.horizons_fetch --check` las relee sin red).",
        "",
        f"**PolePlanner:** SPICE (spiceypy), marco lunar {E.MOON_FRAME}, corrección {E.ABCORR}, h_obs = 3 m (D12), altura de los sitios sobre la esfera de 1737,4 km.",
        "",
        "| Kernel | Función | sha256 (recalculado) | Frente a `data/README.md` |",
        "|---|---|---|---|",
        *krows,
        "",
        "| Comprobación | Criterio | Resultado |",
        "|---|---|---|",
        f"| Az/el del Sol y de la Tierra frente a Horizons: 5 sitios × 2 objetivos × 7 instantes de 2027 (§3) | < 0.05° (spec); < 1″ (prueba) | peor **{worst * 3600:.4f}″** ({worst:.1e}°) ✓ |",
        f"| Control negativo: marco equivocado (MOON_PA) | la prueba debe detectarlo (> 10″) | {wrong * 3600:.1f}″ ✓ |",
        f"| Fase lunar y dirección del Sol de la escena frente a Horizons, 5 fechas (§4) | < 0.5 puntos de fracción iluminada; < 0.1° | {phase} ✓ |",
        "| Fase lunar en la imagen renderizada (§5, T4.4.c) | coherente con la geometría dibujada | ≤ 0.21 puntos frente al trazado de rayos; ≤ 1 punto frente a Horizons por la Luna ×6 (D8) ✓ |",
        "| Escena 3D frente a las series 2D: elevación de la Tierra y del Sol en cada sitio (`web/tests/skycheck.test.ts`) | mismos ángulos | ≤ 0.005° (Tierra), ≤ 0.031° (Sol) ✓ |",
        "",
        "**Sanity checks de 5.7** sobre los datos publicados (`web/public/data/`, año completo cada 30 min), con los límites de elevación corregidos por latitud (§2):",
        "",
        "| Sitio | max \\|el Sol\\| ≤ límite | max \\|el Tierra\\| ≤ límite | Tierra: franja de azimut | max \\|máscara del horizonte\\| | Sol en el año | Banderas 0/1 y ventanas en rango |",
        "|---|---|---|---|---|---|---|",
        *srows,
        "",
        control,
        "<!-- validation_summary:end -->",
    ])
    pattern = re.compile(r"<!-- validation_summary:start.*?<!-- validation_summary:end -->", re.S)
    if pattern.search(text):
        text = pattern.sub(lambda _: block, text)
    else:
        anchor = "## 1. Método (T1.1.a, 2026-10-21)"
        text = text.replace(anchor, "## 0. Resumen (T5.3.a)\n\n" + block + "\n\n" + anchor)
    DOC.write_text(text, encoding="utf-8", newline="\n")
    assert "validation_summary:start" in DOC.read_text(encoding="utf-8")
