"""Banderas de visibilidad del Sol y la Tierra (spec 5.3 y 5.4)."""

from __future__ import annotations

import numpy as np

from pipeline import config


def horizon_at(az_deg: np.ndarray, elev_deg: np.ndarray, az_step_deg: float = config.HORIZON_AZ_STEP_DEG) -> np.ndarray:
    """Elevación de la máscara en azimuts arbitrarios.

    `elev_deg[i]` es la elevación en el azimut `i · az_step_deg` (contrato §6). Entre bins se
    interpola linealmente, con paso de 359° a 0° (envolvente circular).
    """
    elev = np.asarray(elev_deg, dtype=float)
    n = elev.size
    if abs(n * az_step_deg - 360.0) > 1e-9:
        raise ValueError(f"la máscara tiene {n} bins de {az_step_deg}°, no cubre 360°")
    pos = (np.asarray(az_deg, dtype=float) % 360.0) / az_step_deg
    i0 = np.floor(pos).astype(int) % n
    frac = pos - np.floor(pos)
    return elev[i0] * (1.0 - frac) + elev[(i0 + 1) % n] * frac


def sun_visible(sun_az_deg: np.ndarray, sun_el_deg: np.ndarray, elev_deg: np.ndarray,
                az_step_deg: float = config.HORIZON_AZ_STEP_DEG,
                sun_radius_deg: float = config.SUN_RADIUS_DEG) -> np.ndarray:
    """Spec 5.3, criterio por defecto: el borde superior del Sol está sobre la máscara.

    sun_visible = (sun_el + 0.265°) > horizon_el[sun_az]   → array de 0/1 (uint8)
    """
    mask = horizon_at(sun_az_deg, elev_deg, az_step_deg)
    return ((np.asarray(sun_el_deg, dtype=float) + sun_radius_deg) > mask).astype(np.uint8)


def earth_visible(earth_az_deg: np.ndarray, earth_el_deg: np.ndarray, elev_deg: np.ndarray,
                  az_step_deg: float = config.HORIZON_AZ_STEP_DEG,
                  antenna_margin_deg: float = config.ANTENNA_MARGIN_DEG) -> np.ndarray:
    """Spec 5.4: enlace directo si el centro de la Tierra supera la máscara más el margen de antena.

    earth_visible = earth_el > horizon_el[earth_az] + margen_antena   → array de 0/1 (uint8)
    """
    mask = horizon_at(earth_az_deg, elev_deg, az_step_deg)
    return (np.asarray(earth_el_deg, dtype=float) > mask + antenna_margin_deg).astype(np.uint8)


def earth_partial(earth_az_deg: np.ndarray, earth_el_deg: np.ndarray, elev_deg: np.ndarray,
                  az_step_deg: float = config.HORIZON_AZ_STEP_DEG,
                  antenna_margin_deg: float = config.ANTENNA_MARGIN_DEG,
                  earth_radius_deg: float = config.EARTH_RADIUS_DEG) -> np.ndarray:
    """Spec 5.4 (opcional): visibilidad parcial = sin enlace por el criterio del centro, pero con el
    borde superior de la Tierra sobre la máscara (sin margen). Solo informativo: no cuenta como enlace.
    """
    el = np.asarray(earth_el_deg, dtype=float)
    mask = horizon_at(earth_az_deg, elev_deg, az_step_deg)
    no_link = el <= mask + antenna_margin_deg
    return (no_link & (el + earth_radius_deg > mask)).astype(np.uint8)


def sun_disk_fraction(sun_az_deg: np.ndarray, sun_el_deg: np.ndarray, elev_deg: np.ndarray,
                      az_step_deg: float = config.HORIZON_AZ_STEP_DEG,
                      sun_radius_deg: float = config.SUN_RADIUS_DEG, columns: int = 41) -> np.ndarray:
    """Spec 5.3 (rigor extra): fracción del disco solar por encima de la máscara, en [0, 1].

    El disco se integra por columnas verticales: en cada desplazamiento horizontal x ∈ [−r, r]
    la cuerda va de el − √(r² − x²) a el + √(r² − x²), y se cuenta la parte por encima de la
    máscara en el azimut az + x / cos(el). Así una máscara inclinada dentro del disco cuenta.
    Con una máscara plana coincide con la fórmula del segmento circular (prueba).
    """
    az = np.asarray(sun_az_deg, dtype=float)[..., None]
    el = np.asarray(sun_el_deg, dtype=float)[..., None]
    r = sun_radius_deg
    # Regla del punto medio en x (evita las columnas de cuerda nula en ±r)
    x = (np.arange(columns) + 0.5) / columns * 2 * r - r
    half = np.sqrt(r**2 - x**2)
    mask = horizon_at(az + x / np.cos(np.radians(el)), elev_deg, az_step_deg)
    visible = np.clip(el + half - np.maximum(el - half, mask), 0.0, None)
    return (visible * (2 * r / columns)).sum(axis=-1) / (np.pi * r**2) * _area_correction(columns)


def _area_correction(columns: int) -> float:
    """Normaliza el error de la regla del punto medio para que un disco libre dé exactamente 1."""
    x = (np.arange(columns) + 0.5) / columns * 2 - 1
    return np.pi / (2 * np.sqrt(1 - x**2) * (2 / columns)).sum()


def sun_day_from_fraction(fraction: np.ndarray, threshold: float = config.SUN_FRACTION_THRESHOLD) -> np.ndarray:
    """Spec 5.3: «día» si la fracción visible supera el umbral (0.5 por defecto)  → 0/1 (uint8)."""
    return (np.asarray(fraction) > threshold).astype(np.uint8)


# ---------------------------------------------------------------- banderas de los sitios (T1.3.d)

# Punto de control (no es un sitio candidato): fondo del cráter Shackleton, región permanentemente
# sombreada. Centro oficial del nomenclátor IAU/USGS (Feature ID 5450): −89.67°, 129.78°E, D = 20.92 km.
# Punto = píxel más bajo del DEM a ≤ 3 km de ese centro (docs/sites.md §4).
CONTROL_CENTER = {"lat": -89.67, "lon": 129.78, "radius_m": 3_000.0,
                  "source": "IAU/USGS Gazetteer of Planetary Nomenclature, Shackleton (Feature ID 5450)"}


def control_point() -> dict:
    """Punto de control en el fondo de Shackleton, con el formato de un sitio de sites.json."""
    from pipeline.dem import DemWindow, latlon_to_xy, xy_to_latlon

    cx, cy = latlon_to_xy(CONTROL_CENTER["lat"], CONTROL_CENTER["lon"])
    r = CONTROL_CENTER["radius_m"]
    w = DemWindow.read(cx, cy, r)
    rows, cols = np.mgrid[0:w.z.shape[0], 0:w.z.shape[1]]
    px = w.transform.c + (cols + 0.5) * w.res
    py = w.transform.f - (rows + 0.5) * w.res
    z = np.where(np.hypot(px - cx, py - cy) <= r, w.z, np.inf)
    k = np.unravel_index(np.argmin(z), z.shape)
    lat, lon = xy_to_latlon(px[k], py[k])
    return {"id": "control_shackleton_floor", "name": "CONTROL: Shackleton crater floor",
            "lat": round(float(lat), 5), "lon": round(float(lon), 5), "elevation_m": round(float(z[k]), 1),
            "source": f"Lowest LOLA DEM pixel within {r / 1000:.0f} km of the {CONTROL_CENTER['source']} centre"}


def site_flags(site: dict, series: dict, mask: np.ndarray) -> dict:
    """Banderas de Sol (5.3, borde superior) y Tierra (5.4) para la serie de un sitio."""
    return {"sun_vis": sun_visible(series["sun_az"], series["sun_el"], mask),
            "earth_vis": earth_visible(series["earth_az"], series["earth_el"], mask)}


def main(argv=None) -> int:
    import json
    import sys
    from pathlib import Path

    from pipeline.ephemeris import load_series, save_series, site_series
    from pipeline.horizon import load_mask, save_mask, site_mask

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    root = Path(__file__).resolve().parents[1]
    sites = json.loads((root / "pipeline" / "sites.json").read_text(encoding="utf-8"))
    ctrl = control_point()
    print(f"Control: {ctrl['name']} en {ctrl['lat']:.5f}°, {ctrl['lon']:.5f}°, z = {ctrl['elevation_m']:.1f} m")
    out_dir = root / "pipeline" / "out"
    results = {}
    for site in sites + [ctrl]:
        try:
            series, mask = load_series(site["id"]), load_mask(site["id"])
        except FileNotFoundError:  # el control no está en sites.json: se calcula aquí
            series = site_series(site)
            save_series(series)
            mask, t = site_mask(site)
            save_mask(site["id"], mask, t["z0_m"])
        flags = site_flags(site, series, mask)
        np.savez_compressed(out_dir / f"flags_{site['id']}.npz", **flags)
        results[site["id"]] = {k: 100.0 * float(np.mean(v)) for k, v in flags.items()}
        print(f"{site['id']:26s} Sol visible {results[site['id']]['sun_vis']:6.2f} %   "
              f"Tierra visible {results[site['id']]['earth_vis']:6.2f} %   (máscara máx {mask.max():+.2f}°)")
    ctrl_sun = results[ctrl["id"]]["sun_vis"]
    ridge_ok = all(results[s["id"]]["sun_vis"] > ctrl_sun for s in sites)
    print(f"Sanity 5.7: control ≈ 0 % de Sol → {ctrl_sun:.2f} %; todos los sitios > control → {ridge_ok}")
    return 0 if (ctrl_sun < 1.0 and ridge_ok) else 1


if __name__ == "__main__":
    raise SystemExit(main())
