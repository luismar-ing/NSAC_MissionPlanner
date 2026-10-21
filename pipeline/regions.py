"""Regiones candidatas de Artemis III publicadas por USGS (T0.3.a; fuentes en docs/sites.md).

Lee los zips tal como se descargan de ScienceBase (data/regions/, descarga manual):
- A3_9regions-lonlat-simplified.zip: contornos de las 9 regiones de 2024 en lon/lat (GCS Moon 2000).
- <Región>.zip: rejillas LGRS (ACC) en la proyección polar LPS de USGS; la de 1 km da la huella
  de regiones que no están entre las 9 (por ejemplo, Connecting Ridge, de la lista de 2022).

Todas las geometrías se devuelven en el CRS del DEM LOLA (estereográfica polar sur, R = 1 737 400 m),
para elegir puntos con el DEM.
"""

from __future__ import annotations

import io
import json
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import shapefile  # pyshp
from pyproj import CRS, Transformer

ROOT = Path(__file__).resolve().parents[1]
REGIONS_DIR = ROOT / "data" / "regions"
DEM_CRS = CRS.from_proj4("+proj=stere +lat_0=-90 +lat_ts=-90 +lon_0=0 +x_0=0 +y_0=0 +R=1737400 +units=m +no_defs")
MOON_GEO = CRS.from_proj4("+proj=longlat +R=1737400 +no_defs")

NINE_REGIONS_ZIP = "A3_9regions-lonlat-simplified.zip"
CITATION_9 = ("McClernan, M. T., 2024, Down Selected Artemis III Candidate Landing Site Navigational Grids: "
              "U.S. Geological Survey data release, https://doi.org/10.5066/P1MEQ6UK")
CITATION_ACC = ("McClernan, M. T., 2024, Lunar Grid Reference System (LGRS) Artemis III Candidate Landing Site "
                "Navigational Grids in Artemis Condensed Coordinate (ACC) Format: U.S. Geological Survey data release, "
                "https://doi.org/10.5066/P13FD9ZD")


@dataclass
class Region:
    name: str
    source: str
    file: str
    polygons_xy: list[np.ndarray] = field(default_factory=list)  # en el CRS del DEM, (n, 2) en metros

    def lonlat_extent(self) -> tuple[float, float, float, float]:
        """(lat_min, lat_max, lon_min, lon_max) de todos los vértices."""
        to_geo = Transformer.from_crs(DEM_CRS, MOON_GEO, always_xy=True)
        xy = np.vstack(self.polygons_xy)
        lon, lat = to_geo.transform(xy[:, 0], xy[:, 1])
        return float(lat.min()), float(lat.max()), float(lon.min()), float(lon.max())

    def area_km2(self) -> float:
        def shoelace(p):
            x, y = p[:, 0], p[:, 1]
            return 0.5 * abs(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))
        return sum(shoelace(p) for p in self.polygons_xy) / 1e6


def load_nine_regions(regions_dir: Path = REGIONS_DIR) -> dict[str, Region]:
    """Las 9 regiones de 2024 (GeoJSON del zip simplificado, lon/lat sobre la esfera de 1 737 400 m)."""
    to_dem = Transformer.from_crs(MOON_GEO, DEM_CRS, always_xy=True)
    with zipfile.ZipFile(regions_dir / NINE_REGIONS_ZIP) as zf:
        prj = zf.read("A3_9regions-lonlat-simplified.prj").decode()
        if "1737400" not in prj:
            raise ValueError(f"CRS inesperado en {NINE_REGIONS_ZIP}: {prj}")
        gj = json.loads(zf.read("A3_9regions-lonlat-simplified.geojson"))
    out = {}
    for feat in gj["features"]:
        geom = feat["geometry"]
        rings = [geom["coordinates"][0]] if geom["type"] == "Polygon" else [p[0] for p in geom["coordinates"]]
        polys = []
        for ring in rings:
            lon, lat = np.array(ring, dtype=float).T
            x, y = to_dem.transform(lon, lat)
            polys.append(np.column_stack([x, y]))
        name = feat["properties"]["Region"]
        out[name] = Region(name=name, source=CITATION_9, file=NINE_REGIONS_ZIP, polygons_xy=polys)
    return out


def load_lgrs_footprint(zip_name: str, region_name: str, regions_dir: Path = REGIONS_DIR) -> Region:
    """Huella de una región = unión de las celdas de su rejilla LGRS de 1 km (proyección LPS de USGS)."""
    with zipfile.ZipFile(regions_dir / zip_name) as zf:
        base = next(n[:-4] for n in zf.namelist() if n.endswith("_1km_S_Grid.shp"))
        prj = zf.read(base + ".prj").decode()
        reader = shapefile.Reader(shp=io.BytesIO(zf.read(base + ".shp")), shx=io.BytesIO(zf.read(base + ".shx")),
                                  dbf=io.BytesIO(zf.read(base + ".dbf")))
        cells = [np.asarray(s.points, dtype=float) for s in reader.shapes()]
    to_dem = Transformer.from_crs(CRS.from_wkt(prj), DEM_CRS, always_xy=True)
    polys = []
    for c in cells:
        x, y = to_dem.transform(c[:, 0], c[:, 1])
        polys.append(np.column_stack([x, y]))
    return Region(name=region_name, source=CITATION_ACC, file=zip_name, polygons_xy=polys)


if __name__ == "__main__":
    import sys

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    regions = load_nine_regions()
    regions["Connecting Ridge"] = load_lgrs_footprint("Connecting_Ridge.zip", "Connecting Ridge")
    for r in regions.values():
        la0, la1, lo0, lo1 = r.lonlat_extent()
        print(f"{r.name:22s} {len(r.polygons_xy):4d} polígono(s) {r.area_km2():8.1f} km²  "
              f"lat [{la0:.3f}, {la1:.3f}]  lon [{lo0:.2f}, {lo1:.2f}]  ({r.file})")
