"""Lit polar map for the zoom step (T6.2.a): the published LOLA average illumination of the south pole.

    python -m pipeline.illumination_map      # data/illumination/ -> pipeline/out/illumination/ + figure
                                             # (python -m pipeline.build_all --assemble copies it to web/public/data/)

Source (registered in pipeline/data_sources.json and data/README.md, downloaded by fetch_data --illumination):
AVGVISIB_85S_060M_201608.TIF, NASA GSFC PGDA "Lunar Polar Illumination" (https://pgda.gsfc.nasa.gov/products/69).
Average fraction of time the Sun is visible, over hourly steps spanning a full lunar nutation cycle (~18.6 years),
from LOLA topography; polar stereographic (R = 1737.4 km, true scale at the pole), 60 m/px, 85°S-90°S.
Cite Mazarico, E., et al. (2011), Icarus 211, 1066-1081, doi:10.1016/j.icarus.2010.10.030.

Outputs:
- pipeline/out/illumination/south_avg.png: 8-bit grey, value = fraction x 255, averaged down to WEB_PX pixels.
- pipeline/out/illumination/south_avg.json: extent, CRS, encoding, source and citation.
  (Both reach web/public/data/illumination/ through build_all --assemble, like every other front-end file.)
- docs/figures/illumination_85s.png: check figure with the five sites.
It also prints the map value at each site (3x3 pixels, ~180 m) next to the site's own sunlit fraction for the demo
year (our series: the highest DEM pixel of each region, 3 m above the ground). They measure different things
(18.6 years vs one year, area average vs a local high point, ground vs 3 m), so the map is shown as context in the
zoom, never as a site metric.

Deterministic: same source -> same bytes (no dates in the PNG).
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from PIL import Image
from pyproj import Transformer

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "illumination" / "AVGVISIB_85S_060M_201608.TIF"
OUT = ROOT / "pipeline" / "out" / "illumination"  # build_all --assemble copies it to web/public/data/illumination/
WEB = ROOT / "web" / "public" / "data" / "illumination"
FIG = ROOT / "docs" / "figures" / "illumination_85s.png"
WEB_PX = 1024  # ~296 m/px over ±151.7 km: enough for a zoom step seen from hundreds of km
CITATION = "Mazarico, E., et al. (2011), Illumination conditions of the lunar polar regions using LOLA topography, Icarus 211, 1066-1081, doi:10.1016/j.icarus.2010.10.030"


def read(shape: int | None = None) -> tuple[np.ndarray, rasterio.coords.BoundingBox, str]:
    """Fraction of time sunlit (0-1) and the grid bounds; nodata -> NaN. `shape` averages down to shape x shape."""
    with rasterio.open(SRC) as r:
        kw = {"out_shape": (shape, shape), "resampling": Resampling.average} if shape else {}
        raw = r.read(1, masked=True, **kw).astype("float64")
        frac = raw.filled(np.nan) * r.scales[0] + r.offsets[0]
        return frac, r.bounds, r.crs.to_proj4()


def site_values(frac: np.ndarray, bounds, crs: str) -> list[dict]:
    sites = json.loads((ROOT / "pipeline" / "sites.json").read_text(encoding="utf-8"))
    to_xy = Transformer.from_crs("+proj=longlat +R=1737400 +no_defs", crs, always_xy=True)
    n = frac.shape[0]
    px = (bounds.right - bounds.left) / n
    out = []
    for s in sites:
        x, y = to_xy.transform(s["lon"], s["lat"])
        i, j = int((x - bounds.left) / px), int((bounds.top - y) / px)
        cell = frac[max(0, j - 1) : j + 2, max(0, i - 1) : i + 2]  # 3x3 pixels around the site
        ts = json.loads((ROOT / "web" / "public" / "data" / "timeseries" / f"{s['id']}.json").read_text(encoding="utf-8"))
        out.append({"id": s["id"], "name": s["name"], "x": x, "y": y, "map": float(np.nanmean(cell)), "year": float(np.mean(ts["sun_vis"]))})
    return out


def write_web(frac: np.ndarray, bounds, crs: str) -> dict:
    OUT.mkdir(parents=True, exist_ok=True)
    img = np.nan_to_num(np.clip(frac, 0, 1), nan=0.0)
    png = OUT / "south_avg.png"
    Image.fromarray(np.round(img * 255).astype(np.uint8), mode="L").save(png, optimize=True)
    header = {
        "product": "AVGVISIB_85S_060M_201608",
        "value": "average fraction of time the Sun is visible; pixel = fraction x 255",
        "period": "hourly steps over a full lunar nutation cycle (~18.6 years)",
        "projection": crs,
        "extent_m": {"left": bounds.left, "right": bounds.right, "bottom": bounds.bottom, "top": bounds.top},
        "size_px": WEB_PX,
        "source_url": "https://pgda.gsfc.nasa.gov/products/69",
        "citation": CITATION,
        "png_sha256": hashlib.sha256(png.read_bytes()).hexdigest(),
    }
    (OUT / "south_avg.json").write_text(json.dumps(header, indent=1) + "\n", encoding="utf-8", newline="\n")
    return header


def figure(frac: np.ndarray, bounds, sites: list[dict]) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(8, 8), dpi=110)
    km = [bounds.left / 1000, bounds.right / 1000, bounds.bottom / 1000, bounds.top / 1000]
    im = ax.imshow(frac, extent=km, cmap="gray", vmin=0, vmax=1)
    for s in sites:
        ax.plot(s["x"] / 1000, s["y"] / 1000, "o", ms=6, mfc="none", mec="#ffb347", mew=1.6)
        ax.annotate(f"{s['name'].split(' (')[0]}\n{100 * s['map']:.0f}% (18.6 y) · {100 * s['year']:.0f}% (2027)", (s["x"] / 1000, s["y"] / 1000), xytext=(6, 6), textcoords="offset points", color="#ffb347", fontsize=7)
    ax.set_xlabel("x (km, polar stereographic)")
    ax.set_ylabel("y (km)")
    ax.set_title("LOLA average solar illumination, 85°S-90°S (Mazarico et al. 2011)", fontsize=10)
    fig.colorbar(im, ax=ax, fraction=0.046, label="fraction of time sunlit")
    FIG.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(FIG, bbox_inches="tight", metadata={"Software": None})
    plt.close(fig)


def main(argv=None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if not SRC.exists():
        print(f"missing {SRC.relative_to(ROOT)}: run python -m pipeline.fetch_data --illumination")
        return 1
    full, bounds, crs = read()
    sites = site_values(full, bounds, crs)
    print(f"{'site':<22} {'map 18.6 y':>10} {'our 2027':>9}")
    for s in sites:
        print(f"{s['id']:<22} {100 * s['map']:>9.1f}% {100 * s['year']:>8.1f}%")
    small, _, _ = read(WEB_PX)
    header = write_web(small, bounds, crs)
    figure(small, bounds, sites)
    print(f"web: {OUT.relative_to(ROOT)}/south_avg.png ({(OUT / 'south_avg.png').stat().st_size} bytes) · figure: {FIG.relative_to(ROOT)}")
    return 0 if header else 1


if __name__ == "__main__":
    sys.exit(main())
