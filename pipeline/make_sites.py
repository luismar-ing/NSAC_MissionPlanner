"""Genera pipeline/sites.json (T0.3.b; método en docs/sites.md §3).

    python -m pipeline.make_sites

Para cada sitio: el píxel del DEM LOLA de máxima elevación cuyo centro cae dentro del polígono
oficial USGS de su región. Coordenadas planetocéntricas, longitud este en [-180, 180) (contrato §1).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import rasterio
from matplotlib.path import Path as MplPath
from pyproj import Transformer
from rasterio.windows import from_bounds

from pipeline.regions import DEM_CRS, MOON_GEO, Region, is_dem_crs, load_lgrs_footprint, load_nine_regions

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(__file__).with_name("sites_source.json")
OUT = Path(__file__).with_name("sites.json")


def highest_point(region: Region, dem_path: Path) -> tuple[float, float, float, int]:
    """(x, y, z, n_píxeles) del píxel más alto dentro de la región, en el CRS del DEM."""
    xy = np.vstack(region.polygons_xy)
    with rasterio.open(dem_path) as ds:
        if not is_dem_crs(ds.crs):
            raise ValueError(f"CRS del DEM inesperado: {ds.crs}")
        pad = 2 * ds.res[0]
        win = from_bounds(xy[:, 0].min() - pad, xy[:, 1].min() - pad, xy[:, 0].max() + pad, xy[:, 1].max() + pad,
                          ds.transform).round_offsets().round_lengths()
        z = ds.read(1, window=win)
        tr = ds.window_transform(win)
    rows, cols = np.mgrid[0:z.shape[0], 0:z.shape[1]]
    px = tr.c + (cols + 0.5) * tr.a
    py = tr.f + (rows + 0.5) * tr.e
    pts = np.column_stack([px.ravel(), py.ravel()])
    inside = np.zeros(pts.shape[0], dtype=bool)
    for poly in region.polygons_xy:
        inside |= MplPath(poly).contains_points(pts)
    zz = np.where(inside & np.isfinite(z.ravel()), z.ravel(), -np.inf)
    k = int(np.argmax(zz))
    if not np.isfinite(zz[k]):
        raise ValueError(f"{region.name}: ningún píxel válido dentro del polígono")
    return float(pts[k, 0]), float(pts[k, 1]), float(zz[k]), int(inside.sum())


def build() -> list[dict]:
    cfg = json.loads(SOURCE.read_text(encoding="utf-8"))
    dem_path = ROOT / "data" / cfg["dem"]["file"]
    nine = load_nine_regions()
    to_geo = Transformer.from_crs(DEM_CRS, MOON_GEO, always_xy=True)
    sites = []
    for s in cfg["sites"]:
        region = nine[s["region"]] if s["loader"] == "nine" else load_lgrs_footprint(s["zip"], s["region"])
        x, y, z, n = highest_point(region, dem_path)
        lon, lat = to_geo.transform(x, y)
        lon = ((lon + 180.0) % 360.0) - 180.0
        sites.append({
            "id": s["id"],
            "name": s["name"],
            "lat": round(float(lat), 5),
            "lon": round(float(lon), 5),
            "elevation_m": round(z, 1),
            "source": (f"Highest LOLA DEM pixel (40 m) inside the USGS Artemis III candidate region '{s['region']}' "
                       f"(McClernan 2024, {s['doi']}); elevation from {cfg['dem']['citation']}, "
                       f"relative to the 1737.4 km reference sphere"),
        })
        print(f"{s['id']:18s} lat {lat:9.5f}  lon {lon:10.5f}  z {z:8.1f} m  "
              f"(x {x:10.0f}, y {y:10.0f} m; {n:,} píxeles en la región)")
    return sites


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    sites = build()
    OUT.write_text(json.dumps(sites, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print(f"escrito {OUT.relative_to(ROOT)} ({len(sites)} sitios)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
