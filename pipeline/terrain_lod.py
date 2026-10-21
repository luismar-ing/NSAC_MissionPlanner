"""Terreno por niveles de detalle (spec 5.9, 8.3; contrato §13; D9: terreno simplificado en el MVP).

Malla local de cada sitio (frame ENU_SITE): el nodo (x, y) en metros (x = Este, y = Norte) es el punto de la
superficie a distancia geodésica hypot(x, y) y azimut atan2(x, y) desde el sitio (proyección azimutal
equidistante). Su altura z es la coordenada «Arriba» del ENU del sitio respecto a origin.elevation_m:
incluye la caída por curvatura (≈ d²/2R, ~115 m a 20 km), para que el terreno se vea curvo como en la realidad.

    python -m pipeline.terrain_lod            # sitios → pipeline/out/terrain/{site}/lod{n}.json + .bin
"""

from __future__ import annotations

import json
import struct
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from pipeline.dem import GEOD, R_MOON_M, DemWindow, latlon_to_xy

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "pipeline" / "out" / "terrain"
HEIGHT_SCALE_M = 0.25  # int16 × 0.25 m cubre ±8 191 m


@dataclass(frozen=True)
class Lod:
    lod: int
    half_m: float
    spacing_m: float


SITE_LODS = (Lod(0, 20_000.0, 400.0), Lod(1, 10_000.0, 80.0), Lod(2, 3_000.0, 40.0))


def enu_grid(half_m: float, spacing_m: float) -> tuple[np.ndarray, np.ndarray]:
    """Nodos de la malla: filas de norte a sur, columnas de oeste a este (contrato §13).

    Exige un número impar de nodos por lado, para que haya un nodo exactamente en el sitio (x = y = 0).
    """
    steps = 2 * half_m / spacing_m
    if abs(steps - round(steps)) > 1e-9 or round(steps) % 2:
        raise ValueError(f"2·half/spacing = {steps} debe ser un entero par (nodo central en el sitio)")
    n = int(round(steps)) + 1
    xs = -half_m + np.arange(n) * spacing_m
    ys = half_m - np.arange(n) * spacing_m
    return np.meshgrid(xs, ys)


def surface_up_m(site: dict, x: np.ndarray, y: np.ndarray, window: DemWindow) -> np.ndarray:
    """Coordenada Arriba (m) del terreno en los nodos, respecto a la elevación del sitio."""
    d = np.hypot(x, y)
    az = np.degrees(np.arctan2(x, y))
    lon2, lat2, _ = GEOD.fwd(np.full(d.shape, site["lon"]), np.full(d.shape, site["lat"]), az, d)
    px, py = latlon_to_xy(lat2, lon2)
    h = window.sample(np.asarray(px), np.asarray(py))
    if np.isnan(h).any():
        raise ValueError(f"{site['id']}: la ventana del DEM no cubre la malla")
    r0 = R_MOON_M + site["elevation_m"]
    theta = d / R_MOON_M
    # punto a radio R + h y ángulo θ desde el sitio: Arriba = (R + h)·cos θ − (R + h0)
    return (R_MOON_M + h) * np.cos(theta) - r0


def encode(z: np.ndarray) -> bytes:
    q = np.round(z / HEIGHT_SCALE_M)
    if np.abs(q).max() > 32767:
        raise ValueError("alturas fuera del rango de int16 con la escala elegida")
    return q.astype("<i2").tobytes()


def decode(blob: bytes, header: dict) -> np.ndarray:
    nx, ny = header["grid"]["nx"], header["grid"]["ny"]
    q = np.frombuffer(blob, dtype="<i2").reshape(ny, nx)
    return q.astype(np.float64) * header["height_scale_m"] + header["height_offset_m"]


def write_lod(site_id: str, lod: Lod, origin: dict, z: np.ndarray, frame: str = "ENU_SITE",
              projection: str | None = None, out: Path = OUT, x0: float | None = None, y0: float | None = None) -> dict:
    folder = out / site_id
    folder.mkdir(parents=True, exist_ok=True)
    blob = encode(z)
    header = {
        "site_id": site_id, "lod": lod.lod, "frame": frame, "origin": origin, "projection": projection,
        "grid": {"nx": int(z.shape[1]), "ny": int(z.shape[0]), "spacing_m": lod.spacing_m,
                 "x0_m": -lod.half_m if x0 is None else x0, "y0_m": lod.half_m if y0 is None else y0},
        "height_encoding": "int16", "height_scale_m": HEIGHT_SCALE_M, "height_offset_m": 0.0,
        "bin_file": f"lod{lod.lod}.bin", "byte_length": len(blob),
    }
    (folder / f"lod{lod.lod}.bin").write_bytes(blob)
    (folder / f"lod{lod.lod}.json").write_text(json.dumps(header, indent=1) + "\n", encoding="utf-8", newline="\n")
    return header


def build_site(site: dict, out: Path = OUT) -> list[dict]:
    x0, y0 = latlon_to_xy(site["lat"], site["lon"])
    window = DemWindow.read(x0, y0, max(l.half_m for l in SITE_LODS) * 1.45 + 1_000.0)
    origin = {"lat": site["lat"], "lon": site["lon"], "elevation_m": site["elevation_m"]}
    headers = []
    for lod in SITE_LODS:
        x, y = enu_grid(lod.half_m, lod.spacing_m)
        headers.append(write_lod(site["id"], lod, origin, surface_up_m(site, x, y, window), out=out))
    return headers


def main(argv=None) -> int:
    import sys
    import time

    from pipeline.validate import validate_file

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    sites = json.loads((ROOT / "pipeline" / "sites.json").read_text(encoding="utf-8"))
    total, errors = 0, []
    t0 = time.perf_counter()
    for site in sites:
        for h in build_site(site):
            p = OUT / site["id"] / f"lod{h['lod']}.json"
            errors += validate_file(p, "terrain_header")[1]
            size = h["byte_length"] + p.stat().st_size
            total += size
            print(f"{site['id']:18s} lod{h['lod']}: {h['grid']['nx']}×{h['grid']['ny']} nodos cada {h['grid']['spacing_m']:.0f} m "
                  f"(±{-h['grid']['x0_m'] / 1000:.0f} km)  {size / 1e3:6.1f} kB")
    print(f"Total {total / 1e6:.2f} MB en {time.perf_counter() - t0:.1f} s; contrato: {'OK' if not errors else errors[:3]}")
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
