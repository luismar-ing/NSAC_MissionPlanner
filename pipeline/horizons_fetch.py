"""Referencias de JPL Horizons para validar az/el del Sol y la Tierra (T1.1.a; método en docs/validation.md).

    python -m pipeline.horizons_fetch            # consulta la API y guarda las respuestas crudas
    python -m pipeline.horizons_fetch --check    # solo parsea y resume las ya guardadas

Por sitio de pipeline/sites.json y objetivo (Sol 10, Tierra 399) hace una consulta OBSERVER con
centro en un punto de la superficie lunar (CENTER='coord@301', geodésico sobre la esfera de 1737.4 km
de Horizons) y guarda la respuesta tal cual en pipeline/tests/reference/, precedida de los parámetros.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from pipeline import config

ROOT = Path(__file__).resolve().parents[1]
REF_DIR = Path(__file__).parent / "tests" / "reference"
API = "https://ssd.jpl.nasa.gov/api/horizons.api"
TARGETS = {"sun": "10", "earth": "399"}
# 7 instantes repartidos por el rango de D4 (2027), sin caer en horas redondas
TIMES = ["2027-01-15 06:00", "2027-03-02 17:30", "2027-04-20 03:15", "2027-06-11 12:00",
         "2027-08-29 21:45", "2027-10-17 08:30", "2027-12-24 23:00"]


def query_params(site: dict, target: str) -> dict[str, str]:
    alt_km = (site["elevation_m"] + config.H_OBS_M) / 1000.0  # sobre la esfera de 1737.4 km (= referencia del DEM)
    return {
        "format": "text",
        "COMMAND": f"'{TARGETS[target]}'",
        "OBJ_DATA": "'NO'",
        "MAKE_EPHEM": "'YES'",
        "EPHEM_TYPE": "'OBSERVER'",
        "CENTER": "'coord@301'",
        "COORD_TYPE": "'GEODETIC'",
        "SITE_COORD": f"'{site['lon']:.5f},{site['lat']:.5f},{alt_km:.4f}'",
        "TLIST": " ".join(f"'{t}'" for t in TIMES),
        "TLIST_TYPE": "'CAL'",
        "TIME_TYPE": "'UT'",
        "QUANTITIES": "'4'",
        "ANG_FORMAT": "'DEG'",
        "APPARENT": "'AIRLESS'",
        "EXTRA_PREC": "'YES'",
        "CSV_FORMAT": "'YES'",
    }


def ref_path(site_id: str, target: str) -> Path:
    return REF_DIR / f"horizons_{site_id}_{target}.txt"


def fetch(site: dict, target: str) -> str:
    params = query_params(site, target)
    url = API + "?" + urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "PolePlanner/1.0"}), timeout=60) as r:
        text = r.read().decode("utf-8")
    header = ["# PolePlanner T1.1.a: respuesta cruda de JPL Horizons",
              f"# fetched_utc: {datetime.now(timezone.utc):%Y-%m-%dT%H:%M:%SZ}",
              f"# site: {site['id']}  target: {target}",
              f"# params: {json.dumps(params, ensure_ascii=False)}", ""]
    return "\n".join(header) + text


def parse(text: str) -> list[dict]:
    """Filas entre $$SOE y $$EOE: [{'utc': 'YYYY-MM-DDTHH:MM:SSZ', 'az_deg', 'el_deg'}]."""
    body = text.split("$$SOE", 1)[1].split("$$EOE", 1)[0]
    rows = []
    for line in body.strip().splitlines():
        cols = [c.strip() for c in line.split(",")]
        t = datetime.strptime(cols[0], "%Y-%b-%d %H:%M:%S.%f").replace(tzinfo=timezone.utc)
        rows.append({"utc": t.strftime("%Y-%m-%dT%H:%M:%SZ"), "az_deg": float(cols[3]), "el_deg": float(cols[4])})
    return rows


def header_value(text: str, key: str) -> str:
    for line in text.splitlines():
        if line.startswith(key):
            return line.split(":", 1)[1].strip()
    return ""


# ---------------------------------------------------------------- referencias de la escena (T2.1.c)

# Instantes que coinciden con muestras horarias de scene/ephemeris.json
SCENE_TIMES = ["2027-01-15 06:00", "2027-04-20 03:00", "2027-07-04 12:00", "2027-09-30 18:00", "2027-12-24 23:00"]
SCENE_QUERIES = {
    "moon_phase": {"COMMAND": "'301'", "EPHEM_TYPE": "'OBSERVER'", "QUANTITIES": "'10,24'", "EXTRA_PREC": "'YES'"},
    "sun_vec": {"COMMAND": "'10'", "EPHEM_TYPE": "'VECTORS'", "REF_PLANE": "'FRAME'", "REF_SYSTEM": "'ICRF'",
                "VEC_CORR": "'NONE'", "VEC_TABLE": "'1'", "OUT_UNITS": "'KM-S'"},
    "moon_vec": {"COMMAND": "'301'", "EPHEM_TYPE": "'VECTORS'", "REF_PLANE": "'FRAME'", "REF_SYSTEM": "'ICRF'",
                 "VEC_CORR": "'NONE'", "VEC_TABLE": "'1'", "OUT_UNITS": "'KM-S'"},
}


def scene_ref_path(kind: str) -> Path:
    return REF_DIR / f"horizons_scene_{kind}.txt"


def fetch_scene(kind: str) -> str:
    params = {"format": "text", "OBJ_DATA": "'NO'", "MAKE_EPHEM": "'YES'", "CENTER": "'500@399'", "TIME_TYPE": "'UT'",
              "TLIST": " ".join(f"'{t}'" for t in SCENE_TIMES), "TLIST_TYPE": "'CAL'", "CSV_FORMAT": "'YES'",
              **SCENE_QUERIES[kind]}
    url = API + "?" + urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "PolePlanner/1.0"}), timeout=60) as r:
        text = r.read().decode("utf-8")
    header = ["# PolePlanner T2.1.c: respuesta cruda de JPL Horizons (geocentro)",
              f"# fetched_utc: {datetime.now(timezone.utc):%Y-%m-%dT%H:%M:%SZ}",
              f"# kind: {kind}", f"# params: {json.dumps(params, ensure_ascii=False)}", ""]
    return "\n".join(header) + text


def parse_scene(text: str, kind: str) -> list[dict]:
    body = text.split("$$SOE", 1)[1].split("$$EOE", 1)[0]
    rows = []
    for line in body.strip().splitlines():
        c = [x.strip() for x in line.split(",")]
        if kind == "moon_phase":
            t = datetime.strptime(c[0], "%Y-%b-%d %H:%M:%S.%f")
            rows.append({"utc": t.strftime("%Y-%m-%dT%H:%M:%SZ"), "illu_pct": float(c[3]), "sto_deg": float(c[4])})
        else:
            t = datetime.strptime(c[1].replace("A.D. ", ""), "%Y-%b-%d %H:%M:%S.%f")
            rows.append({"utc": t.strftime("%Y-%m-%dT%H:%M:%SZ"), "xyz_km": [float(c[2]), float(c[3]), float(c[4])]})
    return rows


def main(argv: list[str] | None = None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true", help="no consulta la API; resume las referencias guardadas")
    ap.add_argument("--scene", action="store_true", help="referencias de la escena desde el geocentro (T2.1.c)")
    args = ap.parse_args(argv)
    if args.scene:
        REF_DIR.mkdir(parents=True, exist_ok=True)
        for kind in SCENE_QUERIES:
            path = scene_ref_path(kind)
            if not args.check:
                path.write_text(fetch_scene(kind), encoding="utf-8", newline="\n")
            rows = parse_scene(path.read_text(encoding="utf-8"), kind)
            print(f"{kind:11s} {len(rows)} filas  primera: {rows[0]}")
        return 0
    sites = json.loads((ROOT / "pipeline" / "sites.json").read_text(encoding="utf-8"))
    REF_DIR.mkdir(parents=True, exist_ok=True)
    for site in sites:
        for target in TARGETS:
            path = ref_path(site["id"], target)
            if not args.check:
                path.write_text(fetch(site, target), encoding="utf-8", newline="\n")
            text = path.read_text(encoding="utf-8")
            rows = parse(text)
            els = [r["el_deg"] for r in rows]
            print(f"{site['id']:18s} {target:5s} {len(rows)} filas  el [{min(els):+7.3f}, {max(els):+7.3f}]°  "
                  f"centro: {header_value(text, 'Center pole/equ')}  | {header_value(text, 'Target body name')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
