"""Inspecciona el DEM LOLA descargado (T0.2.e).

    python -m pipeline.inspect_dem [--path data/dem/LDEM_80S_40MPP_ADJ.TIF]

Imprime CRS, tamaño, resolución, rango de alturas y el valor junto al polo, y comprueba
que coinciden con lo registrado en data/README.md (T0.2.d). Sale con 1 si algo no cuadra.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling

ROOT = Path(__file__).resolve().parents[1]
DEFAULT = ROOT / "data" / "dem" / "LDEM_80S_40MPP_ADJ.TIF"

# Valores esperados (cabecera remota leída en T0.2.d)
EXPECTED = {"res_m": 40.0, "half_extent_m": 304_000.0, "radius_m": 1_737_400.0, "lat_0": -90.0}


def inspect(path: Path) -> list[str]:
    problems: list[str] = []
    with rasterio.open(path) as ds:
        crs = ds.crs.to_dict()
        print(f"Archivo     : {path.relative_to(ROOT) if path.is_relative_to(ROOT) else path}")
        print(f"CRS (PROJ)  : {ds.crs.to_proj4()}")
        print(f"Tamaño      : {ds.width} x {ds.height} píxeles, {ds.count} banda(s), {ds.dtypes[0]}, nodata={ds.nodata}")
        print(f"Resolución  : {ds.res[0]:.1f} x {ds.res[1]:.1f} m/píxel")
        print(f"Extensión   : x [{ds.bounds.left:.0f}, {ds.bounds.right:.0f}] m, y [{ds.bounds.bottom:.0f}, {ds.bounds.top:.0f}] m")

        if crs.get("proj") != "stere" or crs.get("lat_0") != EXPECTED["lat_0"]:
            problems.append(f"CRS no es estereográfica polar sur: {crs}")
        if crs.get("R") != EXPECTED["radius_m"]:
            problems.append(f"radio de la esfera {crs.get('R')} ≠ {EXPECTED['radius_m']}")
        if ds.res != (EXPECTED["res_m"], EXPECTED["res_m"]):
            problems.append(f"resolución {ds.res} ≠ {EXPECTED['res_m']} m")
        if abs(ds.bounds.right - EXPECTED["half_extent_m"]) > 1e-6 or abs(ds.bounds.left + EXPECTED["half_extent_m"]) > 1e-6:
            problems.append(f"extensión inesperada {ds.bounds}")

        # Rango de alturas: overview 1/8 (la lectura completa ocupa ~0,9 GB en float32)
        ov = ds.read(1, out_shape=(ds.height // 8, ds.width // 8), resampling=Resampling.nearest, masked=True)
        valid = ov.compressed()
        print(f"Alturas     : min {valid.min():.1f} m, max {valid.max():.1f} m, media {valid.mean():.1f} m "
              f"(sobre la esfera de {EXPECTED['radius_m']:.0f} m; muestra 1/8, {valid.size:,} píxeles)")
        print(f"Sin datos   : {100 * (1 - valid.size / ov.size):.2f} % de la muestra")
        if valid.min() < -10_000 or valid.max() > 10_000:
            problems.append("alturas fuera de ±10 km respecto a la esfera de referencia")

        # Valor junto al polo (x = y = 0) y en una ventana de 1 km alrededor
        (pole,) = ds.sample([(0.0, 0.0)])
        row, col = ds.index(0.0, 0.0)
        win = ds.read(1, window=((row - 12, row + 13), (col - 12, col + 13)))
        print(f"Polo (0, 0) : {float(pole[0]):.1f} m; ventana de 1 km: {np.nanmin(win):.1f} a {np.nanmax(win):.1f} m")
        if not np.isfinite(pole[0]):
            problems.append("sin dato en el polo")
    return problems


def main(argv: list[str] | None = None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--path", type=Path, default=DEFAULT)
    args = ap.parse_args(argv)
    if not args.path.exists():
        print(f"No existe {args.path}; ejecuta: python -m pipeline.fetch_data --dem")
        return 1
    problems = inspect(args.path)
    for p in problems:
        print(f"PROBLEMA: {p}")
    print("OK" if not problems else f"{len(problems)} problema(s)")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
