"""Mapa de verificación de los sitios (T0.3.c): sombreado del DEM LOLA, regiones USGS y puntos elegidos.

    python -m pipeline.plots.sites_map

Escribe docs/figures/sites_map.png (vista polar) y docs/figures/sites_zoom.png (±12 km por sitio, 40 m/píxel).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import rasterio
from matplotlib.colors import LightSource
from pyproj import Transformer
from rasterio.enums import Resampling
from rasterio.windows import from_bounds

from pipeline.regions import DEM_CRS, MOON_GEO, load_lgrs_footprint, load_nine_regions

ROOT = Path(__file__).resolve().parents[2]
DEM = ROOT / "data" / "dem" / "LDEM_80S_40MPP_ADJ.TIF"
FIG = ROOT / "docs" / "figures"


def hillshade(z: np.ndarray, dx: float) -> np.ndarray:
    ls = LightSource(azdeg=315, altdeg=35)
    return ls.hillshade(np.nan_to_num(z, nan=np.nanmin(z)), vert_exag=1.0, dx=dx, dy=dx)


def load_inputs():
    cfg = json.loads((ROOT / "pipeline" / "sites_source.json").read_text(encoding="utf-8"))
    sites = {s["id"]: s for s in json.loads((ROOT / "pipeline" / "sites.json").read_text(encoding="utf-8"))}
    nine = load_nine_regions()
    to_dem = Transformer.from_crs(MOON_GEO, DEM_CRS, always_xy=True)
    rows = []
    for s in cfg["sites"]:
        region = nine[s["region"]] if s["loader"] == "nine" else load_lgrs_footprint(s["zip"], s["region"])
        x, y = to_dem.transform(sites[s["id"]]["lon"], sites[s["id"]]["lat"])
        rows.append((s, sites[s["id"]], region, x, y))
    return rows


def draw_region(ax, region, **kw):
    for p in region.polygons_xy:
        ax.plot(p[:, 0] / 1e3, p[:, 1] / 1e3, lw=kw.get("lw", 0.8), color=kw.get("color", "#ffb347"))


def main() -> int:
    rows = load_inputs()
    FIG.mkdir(parents=True, exist_ok=True)
    half = 170_000.0
    with rasterio.open(DEM) as ds:
        win = from_bounds(-half, -half, half, half, ds.transform)
        f = 8
        z = ds.read(1, window=win, out_shape=(int(win.height // f), int(win.width // f)), resampling=Resampling.average)
        hs = hillshade(z, ds.res[0] * f)
        fig, ax = plt.subplots(figsize=(10, 10), dpi=150)
        ax.imshow(hs, cmap="gray", extent=(-half / 1e3, half / 1e3, -half / 1e3, half / 1e3), origin="upper")
        for s, site, region, x, y in rows:
            draw_region(ax, region)
            ax.plot(x / 1e3, y / 1e3, "o", ms=6, mfc="#4aa3ff", mec="white", mew=1)
            ax.annotate(f"{site['name']}\n{site['lat']:.3f}°, {site['lon']:.3f}°  {site['elevation_m']:.0f} m",
                        (x / 1e3, y / 1e3), xytext=(6, 6), textcoords="offset points", fontsize=7, color="white",
                        bbox=dict(boxstyle="round,pad=0.2", fc="black", alpha=0.6, lw=0))
        ax.plot(0, 0, "+", color="red", ms=10)
        ax.set_xlabel("x polar stereographic (km)")
        ax.set_ylabel("y (km)")
        ax.set_title("PolePlanner sites — LOLA 40 m DEM (hillshade, 320 m display), USGS Artemis III regions (orange)", fontsize=9)
        fig.tight_layout()
        fig.savefig(FIG / "sites_map.png")
        plt.close(fig)

        r = 12_000.0
        fig, axes = plt.subplots(2, 3, figsize=(15, 10), dpi=120)
        for ax, (s, site, region, x, y) in zip(axes.ravel(), rows):
            w = from_bounds(x - r, y - r, x + r, y + r, ds.transform)
            zz = ds.read(1, window=w)
            ext = ((x - r) / 1e3, (x + r) / 1e3, (y - r) / 1e3, (y + r) / 1e3)
            ax.imshow(hillshade(zz, ds.res[0]), cmap="gray", extent=ext, origin="upper")
            cs = ax.contour(np.linspace(ext[0], ext[1], zz.shape[1]), np.linspace(ext[3], ext[2], zz.shape[0]), zz,
                            levels=12, colors="#9be3a6", linewidths=0.4)
            ax.clabel(cs, fontsize=5, fmt="%.0f")
            draw_region(ax, region, lw=1.2)
            ax.plot(x / 1e3, y / 1e3, "o", ms=7, mfc="#4aa3ff", mec="white", mew=1)
            ax.set_xlim(ext[0], ext[1]); ax.set_ylim(ext[2], ext[3])
            ax.set_title(f"{site['name']}: {site['elevation_m']:.0f} m", fontsize=9)
            ax.tick_params(labelsize=6)
        axes.ravel()[-1].axis("off")
        fig.suptitle("Chosen point (blue) = highest DEM pixel inside the official region (orange); contours in m", fontsize=10)
        fig.tight_layout()
        fig.savefig(FIG / "sites_zoom.png")
        plt.close(fig)
    for name in ("sites_map.png", "sites_zoom.png"):
        p = FIG / name
        print(f"escrito {p.relative_to(ROOT)} ({p.stat().st_size / 1e3:.0f} kB)")
    return 0


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
