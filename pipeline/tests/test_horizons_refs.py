"""T1.1.a: las referencias de Horizons están completas, usan MEAN_ME y respetan los límites por latitud."""

import json
from pathlib import Path

import pytest

from pipeline.horizons_fetch import TARGETS, TIMES, header_value, parse, ref_path

SITES = json.loads((Path(__file__).resolve().parents[1] / "sites.json").read_text(encoding="utf-8"))
CASES = [(s, t) for s in SITES for t in TARGETS]


@pytest.mark.parametrize("site,target", CASES, ids=[f"{s['id']}-{t}" for s, t in CASES])
def test_reference_file(site, target):
    text = ref_path(site["id"], target).read_text(encoding="utf-8")
    rows = parse(text)
    assert len(rows) == len(TIMES)
    assert header_value(text, "Center pole/equ").startswith("MEAN_ME")
    assert header_value(text, "Center radii").startswith("1737.4, 1737.4, 1737.4")
    assert "AIRLESS" in header_value(text, "Atmos refraction")
    assert f"'{site['lon']:.5f},{site['lat']:.5f}," in text  # el sitio consultado es el de sites.json
    colat = 90 - abs(site["lat"])
    bound = colat + (1.6 if target == "sun" else 7.0)  # docs/validation.md §2
    assert all(abs(r["el_deg"]) <= bound for r in rows)
    assert all(0 <= r["az_deg"] < 360 for r in rows)
