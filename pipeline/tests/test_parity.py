"""T3.5.a: la muestra de paridad versionada coincide con lo que calcula hoy el pipeline sobre los datos del front end."""

import json

from pipeline import parity


def test_parity_sample_is_current():
    committed = json.loads(parity.OUT.read_text(encoding="utf-8"))
    assert committed == parity.build(), "regenera con: python -m pipeline.parity"


def test_parity_sample_has_boundary_cases():
    cells = parity.build()["cells"]
    assert len(cells) == parity.N_CELLS
    assert sum(c["at_limit"] for c in cells) > 30
