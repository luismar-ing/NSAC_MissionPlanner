"""Características del sitio (spec 5.10; contrato §12; D10).

Pendiente: gradiente central del DEM sobre la malla proyectada, corregido por el factor de escala de la
estereográfica polar (k = 2 / (1 + sen|φ|) con lat_ts = −90°): distancias del mapa = k · distancias reales,
así que pendiente real = atan(k · |∇z|) y el radio de referencia en el mapa es k · radio.
"""

from __future__ import annotations

import numpy as np

from pipeline import config
from pipeline.dem import DemWindow


def polar_scale_factor(lat_deg: float) -> float:
    """Factor de escala de la estereográfica polar sur con escala real en el polo."""
    return 2.0 / (1.0 + np.sin(np.radians(abs(lat_deg))))


def slope_deg_grid(window: DemWindow, k: float) -> np.ndarray:
    """Pendiente real (grados) en cada píxel de la ventana (bordes NaN)."""
    z = window.z.astype(np.float64)
    dz_dy, dz_dx = np.gradient(z, window.res)  # por metro de mapa (filas de norte a sur: signo irrelevante en |∇z|)
    s = np.degrees(np.arctan(k * np.hypot(dz_dx, dz_dy)))
    s[0, :] = s[-1, :] = s[:, 0] = s[:, -1] = np.nan
    return s


def slope_stats(window: DemWindow, x: float, y: float, lat_deg: float,
                radius_m: float = config.SLOPE_RADIUS_M) -> dict:
    """Pendiente media y máxima (grados) en un círculo de radio real `radius_m` alrededor de (x, y)."""
    k = polar_scale_factor(lat_deg)
    s = slope_deg_grid(window, k)
    rows, cols = np.mgrid[0:s.shape[0], 0:s.shape[1]]
    px = window.transform.c + (cols + 0.5) * window.res
    py = window.transform.f - (rows + 0.5) * window.res
    inside = (np.hypot(px - x, py - y) <= k * radius_m) & np.isfinite(s)
    if inside.sum() < 9:
        raise ValueError("muy pocos píxeles dentro del radio de referencia")
    return {"slope_mean_deg": float(np.mean(s[inside])), "slope_max_deg": float(np.max(s[inside])),
            "n_pixels": int(inside.sum()), "scale_factor": k}


# ---------------------------------------------------------------- rasgos cercanos (T2.3.b)

GAZETTEER_URL = "https://planetarynames.wr.usgs.gov/SearchResults?Target=16_Moon"
GAZETTEER_NAME = "IAU/USGS Gazetteer of Planetary Nomenclature"
R_MOON_KM = 1737.4
# Tipos IAU → tipos del contrato §12. Los «Satellite Feature» de la IAU son cráteres con letra (p. ej. «Malapert A»).
TYPE_MAP = {"Crater, craters": "crater", "Satellite Feature": "crater", "Mons, montes": "massif",
            "Dorsum, dorsa": "ridge"}


def great_circle_km(lat1, lon1, lat2, lon2, r_km: float = R_MOON_KM):
    """Distancia sobre la esfera (haversine), en km."""
    p1, p2 = np.radians(lat1), np.radians(lat2)
    dlat, dlon = p2 - p1, np.radians(np.asarray(lon2) - lon1)
    a = np.sin(dlat / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dlon / 2) ** 2
    return 2 * r_km * np.arcsin(np.sqrt(np.clip(a, 0, 1)))


def parse_gazetteer(html: str) -> list[dict]:
    """Filas de la tabla de resultados del nomenclátor (todas las de la Luna)."""
    from html.parser import HTMLParser

    class Table(HTMLParser):
        def __init__(self):
            super().__init__()
            self.rows, self.row, self.cell = [], None, None

        def handle_starttag(self, tag, attrs):
            if tag == "tr":
                self.row = []
            elif tag in ("td", "th") and self.row is not None:
                self.cell = []

        def handle_endtag(self, tag):
            if tag in ("td", "th") and self.cell is not None:
                self.row.append(" ".join("".join(self.cell).split()))
                self.cell = None
            elif tag == "tr" and self.row is not None:
                self.rows.append(self.row)
                self.row = None

        def handle_data(self, data):
            if self.cell is not None:
                self.cell.append(data)

    t = Table()
    t.feed(html)
    header = next(r for r in t.rows if r[:2] == ["Feature ID", "Feature Name"] and "Center Latitude" in r)
    idx = {k: header.index(k) for k in ("Feature ID", "Feature Name", "Diameter", "Center Latitude", "Center Longitude",
                                       "Coordinate System", "Feature Type", "Approval Status")}
    out = []
    for r in t.rows:
        if len(r) != len(header) or not r[0].isdigit():
            continue
        out.append({"feature_id": int(r[idx["Feature ID"]]), "name": r[idx["Feature Name"]],
                    "lat": float(r[idx["Center Latitude"]]), "lon": float(r[idx["Center Longitude"]]),
                    "diameter_km": float(r[idx["Diameter"]]) if r[idx["Diameter"]] else None,
                    "iau_type": r[idx["Feature Type"]], "coordinate_system": r[idx["Coordinate System"]],
                    "approval": r[idx["Approval Status"]]})
    return out


def nearby_features(site: dict, features: list[dict], radius_km: float = config.NEARBY_RADIUS_KM,
                    max_n: int = config.NEARBY_MAX) -> list[dict]:
    """Rasgos aprobados a ≤ radius_km del sitio, ordenados por distancia (contrato §12)."""
    ok = [f for f in features if f["approval"] == "Approved"]
    d = great_circle_km(site["lat"], site["lon"], np.array([f["lat"] for f in ok]), np.array([f["lon"] for f in ok]))
    order = np.argsort(d)
    out = []
    for i in order[:max_n]:
        if d[i] > radius_km:
            break
        f = ok[i]
        out.append({"name": f["name"], "type": TYPE_MAP.get(f["iau_type"], "other"), "lat": f["lat"], "lon": f["lon"],
                    "distance_km": round(float(d[i]), 2),
                    "source": f"{GAZETTEER_NAME}, Feature ID {f['feature_id']} ({f['iau_type']}), accessed {{accessed}}"})
    return out


def fetch_feature_sources(path, accessed: str) -> dict:
    """Descarga el nomenclátor (Luna), extrae los rasgos cercanos a cada sitio y guarda el extracto."""
    import json
    import urllib.request
    from pathlib import Path

    root = Path(__file__).resolve().parents[1]
    sites = json.loads((root / "pipeline" / "sites.json").read_text(encoding="utf-8"))
    req = urllib.request.Request(GAZETTEER_URL, headers={"User-Agent": "PolePlanner/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        features = parse_gazetteer(r.read().decode("utf-8", errors="replace"))
    systems = {f["coordinate_system"] for f in features}
    by_site = {}
    for s in sites:
        near = nearby_features(s, features)
        for n in near:
            n["source"] = n["source"].replace("{accessed}", accessed)
        by_site[s["id"]] = near
    data = {"source": GAZETTEER_NAME, "url": GAZETTEER_URL, "accessed": accessed,
            "n_features_moon": len(features), "coordinate_systems": sorted(systems),
            "radius_km": config.NEARBY_RADIUS_KM, "max_per_site": config.NEARBY_MAX,
            "note": "Planetographic +East coordinates; on the spherical Moon they equal planetocentric.",
            "features_by_site": by_site}
    Path(path).write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    return data


if __name__ == "__main__":
    import sys
    from datetime import datetime, timezone
    from pathlib import Path

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    out = Path(__file__).with_name("feature_sources.json")
    d = fetch_feature_sources(out, datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    print(f"{d['n_features_moon']} rasgos de la Luna en el nomenclátor; sistemas {d['coordinate_systems']}")
    for sid, feats in d["features_by_site"].items():
        print(f"{sid:18s} " + "; ".join(f"{f['name']} ({f['type']}, {f['distance_km']:.1f} km)" for f in feats))
    print(f"escrito {out.name}")
