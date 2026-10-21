"""Muestra de paridad Python ↔ TypeScript de restricciones y score (T3.5.a).

    python -m pipeline.parity            # escribe web/tests/fixtures/parity_sample.json

Lee los mismos archivos que el front end (web/public/data/windows/*.json) y guarda, para 100 celdas
(sitio, L, llegada) con conjuntos de restricciones aleatorios, el resultado de `meets_constraints` (T1.4.c) y
el score. También guarda el recuento de celdas válidas de toda la rejilla (5 sitios × 365 días) por conjunto.
La prueba web/tests/parity.test.ts compara esto con `validMask`/`lookup` (T3.1.d).

Umbrales: los pasos de los deslizadores (1 %, 1 h, 0.5 h/día) y, a propósito, valores exactos de los datos,
que es donde una diferencia de redondeo (Float32 en el front end) cambiaría el resultado.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

from pipeline.windows import meets_constraints

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "web" / "public" / "data"
OUT = ROOT / "web" / "tests" / "fixtures" / "parity_sample.json"
SEED = 20261021
N_CELLS = 100


def load_rows() -> tuple[list[str], dict[int, dict[str, list[dict]]]]:
    sites = [s["id"] for s in json.loads((DATA / "sites.json").read_text(encoding="utf-8"))]
    rows = {L: {s: json.loads((DATA / "windows" / f"{s}_{L}d.json").read_text(encoding="utf-8"))["rows"] for s in sites}
            for L in (3, 7, 14)}
    return sites, rows


def constraint_set(rng: random.Random, row: dict, L: int) -> dict:
    """Cada control activo o no; umbral en un paso del deslizador o exactamente igual al valor de la celda."""
    def pick(value: float, step: float, hi: float) -> float | None:
        r = rng.random()
        if r < 0.25:
            return None  # control desactivado
        if r < 0.55:
            return value  # justo en el límite (inclusivo)
        return round(rng.uniform(0, hi) / step) * step

    return {
        "minSunPct": pick(row["sun_pct"], 1, 100),
        "maxDarkH": pick(row["longest_dark_h"], 1, 24 * L),
        "minEarthH": pick(row["earth_h_min"], 0.5, 24),
    }


def build() -> dict:
    rng = random.Random(SEED)
    sites, rows = load_rows()
    cells = []
    for _ in range(N_CELLS):
        L = rng.choice((3, 7, 14))
        site = rng.choice(sites)
        row = rng.choice(rows[L][site])
        c = constraint_set(rng, row, L)
        at_limit = (c["minSunPct"] == row["sun_pct"] or c["maxDarkH"] == row["longest_dark_h"]
                    or c["minEarthH"] == row["earth_h_min"])
        meets = meets_constraints(row, c["minSunPct"], c["maxDarkH"], c["minEarthH"])
        n_valid = sum(meets_constraints(r, c["minSunPct"], c["maxDarkH"], c["minEarthH"])
                      for s in sites for r in rows[L][s])
        cells.append({"site_id": site, "window_days": L, "arrival": row["start"], "constraints": c,
                      "at_limit": at_limit, "meets": meets, "score": row["score"], "valid_cells_L": n_valid})
    return {"seed": SEED, "source": "web/public/data/windows", "cells": cells}


def main() -> None:
    sample = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(sample, indent=1) + "\n", encoding="utf-8", newline="\n")
    cells = sample["cells"]
    print(f"{len(cells)} celdas -> {OUT.relative_to(ROOT).as_posix()}  (cumplen {sum(c['meets'] for c in cells)}, "
          f"con algún umbral exactamente en el valor de la celda {sum(c['at_limit'] for c in cells)})")


if __name__ == "__main__":
    main()
