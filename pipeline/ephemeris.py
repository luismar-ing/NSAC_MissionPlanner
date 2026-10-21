"""Efemérides del sitio: posición del Sol y la Tierra en el marco local ENU (spec 5.1).

Marco lunar: MOON_ME (Tierra media / eje polar). Es el marco del DEM LOLA (MOON_ME de DE421)
y el de los sitios de Horizons («MEAN_ME»); en nuestros kernels, MOON_ME = MOON_ME_DE440_ME421.
Ver docs/validation.md §1.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

from pipeline import config

MOON_FRAME = "MOON_ME"
R_REF_KM = 1737.4  # esfera de referencia de las alturas del DEM LOLA y de Horizons


def observer_position_km(lat_deg: float, lon_deg: float, elevation_m: float, h_obs_m: float = config.H_OBS_M) -> np.ndarray:
    """Posición del observador en MOON_ME (km): radio = 1737.4 km + elevación del DEM + h_obs.

    Coordenadas planetocéntricas (latitud y longitud este), sobre la esfera de referencia.
    """
    r = R_REF_KM + (elevation_m + h_obs_m) / 1000.0
    lat, lon = np.radians(lat_deg), np.radians(lon_deg)
    return r * np.array([np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat)])


def enu_basis(lat_deg: float, lon_deg: float) -> np.ndarray:
    """Matriz 3 × 3 cuyas filas son E, N, U del sitio, expresadas en MOON_ME.

    U es radial (cenit de la esfera de referencia, como el «local zenith» de Horizons), N apunta
    hacia el polo norte a lo largo del meridiano y E = N × U, de modo que E × N = U (marco directo).
    Un vector v en MOON_ME pasa a ENU con enu_basis(...) @ v.
    """
    lat, lon = np.radians(lat_deg), np.radians(lon_deg)
    sl, cl, so, co = np.sin(lat), np.cos(lat), np.sin(lon), np.cos(lon)
    e = np.array([-so, co, 0.0])
    n = np.array([-sl * co, -sl * so, cl])
    u = np.array([cl * co, cl * so, sl])
    return np.vstack([e, n, u])


def az_el_deg(v_enu: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Azimut (desde el Norte hacia el Este, [0, 360)) y elevación (grados) de vectores ENU (..., 3)."""
    v = np.asarray(v_enu, dtype=float)
    az = np.degrees(np.arctan2(v[..., 0], v[..., 1])) % 360.0
    el = np.degrees(np.arctan2(v[..., 2], np.hypot(v[..., 0], v[..., 1])))
    return az, el


TARGET_NAMES = {"sun": "SUN", "earth": "EARTH"}
ABCORR = "LT+S"  # spec 5.1: corrección de tiempo de luz y aberración estelar


def et_grid(start_utc, end_utc, step_min: int) -> np.ndarray:
    """Instantes ET de [start, end) cada step_min minutos de UTC.

    Se construye sumando segundos a ET(start); es exacto mientras no haya un segundo
    intercalar dentro del rango, lo que se comprueba (no hay ninguno conocido después de 2017).
    """
    from pipeline.spice_utils import load_kernels, utc_to_et

    load_kernels()
    et0, et1 = utc_to_et(start_utc), utc_to_et(end_utc)
    duration = (end_utc - start_utc).total_seconds()
    if abs((et1 - et0) - duration) > 1e-3:
        raise ValueError("hay un segundo intercalar dentro del rango: la rejilla UTC no es uniforme en ET")
    n = int(round(duration / (step_min * 60)))
    return et0 + np.arange(n) * step_min * 60.0


def target_enu_km(site: dict, target: str, ets: np.ndarray, h_obs_m: float = config.H_OBS_M) -> np.ndarray:
    """Vector observador → objetivo en ENU (km), con LT+S, para cada instante ET.

    Observador fijo en la superficie: spiceypy.spkcpo con la posición constante del sitio en
    MOON_ME, centro MOON. Es la forma de SPICE de aplicar spkpos (spec 5.1) a un punto de la superficie:
    el tiempo de luz y la aberración se calculan desde el sitio, no desde el centro de la Luna.
    """
    import spiceypy as sp

    from pipeline.spice_utils import load_kernels

    load_kernels()
    obs = observer_position_km(site["lat"], site["lon"], site["elevation_m"], h_obs_m)
    rot = enu_basis(site["lat"], site["lon"])
    name = TARGET_NAMES[target]
    out = np.empty((len(ets), 3))
    for i, et in enumerate(ets):
        state, _ = sp.spkcpo(name, float(et), MOON_FRAME, "OBSERVER", ABCORR, obs, "MOON", MOON_FRAME)
        out[i] = state[:3]
    return out @ rot.T


def target_az_el(site: dict, target: str, ets: np.ndarray, h_obs_m: float = config.H_OBS_M):
    """Azimut y elevación (grados) del Sol o la Tierra vistos desde el sitio."""
    return az_el_deg(target_enu_km(site, target, ets, h_obs_m))


def elevation_bounds_deg(lat_deg: float) -> dict[str, float]:
    """Límites físicos de |elevación| por latitud (docs/validation.md §2; corrige el ±1.6° de 5.7)."""
    colat = 90.0 - abs(lat_deg)
    # Tierra: libración en latitud (~6.7°) + paralaje topocéntrica (≤ ~0.26°) + holgura
    return {"sun": colat + 1.6, "earth": colat + 7.5}


# ---------------------------------------------------------------- series de un año (T1.1.e)

OUT_DIR = Path(__file__).with_name("out")


def site_series(site: dict, step_min: int = config.STEP_MIN) -> dict:
    """Az/el del Sol y la Tierra en todo el rango de series (contrato §2)."""
    start, end = config.timeseries_range()
    ets = et_grid(start, end, step_min)
    out = {"site_id": site["id"], "start_utc": start.strftime("%Y-%m-%dT%H:%M:%SZ"), "step_min": step_min, "n": len(ets)}
    for target in TARGET_NAMES:
        az, el = target_az_el(site, target, ets)
        out[f"{target}_az"], out[f"{target}_el"] = az, el
    return out


def save_series(series: dict) -> Path:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / f"ephem_{series['site_id']}.npz"
    np.savez_compressed(path, **{k: np.asarray(v) for k, v in series.items()})
    return path


def load_series(site_id: str) -> dict:
    data = np.load(OUT_DIR / f"ephem_{site_id}.npz")
    return {k: (data[k].item() if data[k].ndim == 0 else data[k]) for k in data.files}


def plot_series(series: dict, site: dict, path) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    days = np.arange(series["n"]) * series["step_min"] / 1440.0
    b = elevation_bounds_deg(site["lat"])
    fig, ax = plt.subplots(figsize=(12, 4), dpi=110)
    ax.plot(days, series["earth_el"], lw=0.6, color="#4aa3ff", label="Earth elevation")
    ax.plot(days, series["sun_el"], lw=0.6, color="#ffb347", label="Sun elevation")
    for v, c in ((b["sun"], "#ffb347"), (b["earth"], "#4aa3ff")):
        ax.axhline(v, color=c, ls=":", lw=0.8)
        ax.axhline(-v, color=c, ls=":", lw=0.8)
    ax.axhline(0, color="k", lw=0.5)
    ax.set_xlabel(f"days since {series['start_utc']}")
    ax.set_ylabel("elevation (deg, no terrain)")
    ax.set_title(f"{site['name']} ({site['lat']:.3f}°, {site['lon']:.3f}°): geometric Sun/Earth elevation; "
                 f"dotted = latitude bounds (docs/validation.md §2)", fontsize=9)
    ax.legend(loc="upper right", fontsize=8)
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)


# ---------------------------------------------------------------- efemérides de escena (T2.1.a)

SCENE_FRAME = "J2000"  # marco común con centro en la Tierra (ejes ecuatoriales inerciales)
EARTH_FRAME = "IAU_EARTH"  # rotación de la Tierra del modelo IAU de pck00011.tpc (suficiente para la escena)
SCENE_ABCORR = "NONE"  # estados geométricos: la aberración (~20″) es invisible en la escena


def matrix_to_quat_xyzw(m: np.ndarray) -> np.ndarray:
    """Matriz de rotación → cuaternión [x, y, z, w] (orden three.js) con q·v·q⁻¹ = m·v.

    spiceypy.m2q devuelve [w, x, y, z] con esa misma convención (comprobado en T2.1.a/b).
    """
    import spiceypy as sp

    w, x, y, z = sp.m2q(np.asarray(m, dtype=float))
    return np.array([x, y, z, w])


def make_continuous(quats: np.ndarray) -> np.ndarray:
    """Invierte el signo donde haga falta para que muestras consecutivas tengan producto escalar ≥ 0
    (q y −q son la misma rotación; así slerp no da la vuelta larga)."""
    q = np.array(quats, dtype=float)
    for i in range(1, len(q)):
        if np.dot(q[i], q[i - 1]) < 0:
            q[i] = -q[i]
    return q


def scene_ephemeris(step_min: int = config.SCENE_STEP_MIN) -> dict:
    """scene/ephemeris.json (contrato §10) en el rango de escena del contrato §2."""
    import spiceypy as sp

    from pipeline.spice_utils import load_kernels

    load_kernels()
    start, end = config.scene_range()
    ets = et_grid(start, end, step_min)
    moon, sun, mq, eq = [], [], [], []
    for et in ets:
        m_pos, _ = sp.spkpos("MOON", float(et), SCENE_FRAME, SCENE_ABCORR, "EARTH")
        s_pos, _ = sp.spkpos("SUN", float(et), SCENE_FRAME, SCENE_ABCORR, "EARTH")
        moon.append(m_pos)
        sun.append(np.asarray(s_pos) / np.linalg.norm(s_pos))
        mq.append(matrix_to_quat_xyzw(sp.pxform(MOON_FRAME, SCENE_FRAME, float(et))))
        eq.append(matrix_to_quat_xyzw(sp.pxform(EARTH_FRAME, SCENE_FRAME, float(et))))
    mq, eq = make_continuous(np.array(mq)), make_continuous(np.array(eq))

    def unit_rows(a, nd):
        a = np.round(np.asarray(a, dtype=float), nd)
        return (a / np.linalg.norm(a, axis=1)[:, None]).round(nd).tolist()

    return {
        "frame": SCENE_FRAME,
        "start_utc": start.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "step_min": step_min,
        "n": int(len(ets)),
        "moon_pos_km": np.round(np.array(moon), 1).tolist(),
        "sun_dir": unit_rows(sun, 9),
        "moon_frame": MOON_FRAME,
        "moon_quat": unit_rows(mq, 9),
        "earth_frame": EARTH_FRAME,
        "earth_quat": unit_rows(eq, 9),
    }


def write_scene(path: Path | None = None) -> Path:
    import json

    path = path or OUT_DIR / "scene" / "ephemeris.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(scene_ephemeris(), separators=(",", ":")) + "\n", encoding="utf-8", newline="\n")
    return path


def main(argv=None) -> int:
    import argparse
    import json
    import sys
    import time
    from pathlib import Path

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="Series de az/el del Sol y la Tierra para todos los sitios (T1.1.e)")
    ap.add_argument("--step-min", type=int, default=config.STEP_MIN, help="paso en minutos (30 por defecto; 10 opcional)")
    ap.add_argument("--no-plots", action="store_true")
    ap.add_argument("--scene", action="store_true", help="solo scene/ephemeris.json (T2.1.a)")
    args = ap.parse_args(argv)
    root = Path(__file__).resolve().parents[1]
    if args.scene:
        t0 = time.perf_counter()
        path = write_scene()
        print(f"escrito {path.relative_to(root)} ({path.stat().st_size / 1e6:.2f} MB) en {time.perf_counter() - t0:.1f} s")
        return 0
    sites = json.loads((root / "pipeline" / "sites.json").read_text(encoding="utf-8"))
    ok = True
    t_all = time.perf_counter()
    for site in sites:
        t0 = time.perf_counter()
        s = site_series(site, args.step_min)
        path = save_series(s)
        b = elevation_bounds_deg(site["lat"])
        inside = {t: bool(np.max(np.abs(s[f"{t}_el"])) <= b[t]) for t in TARGET_NAMES}
        ok &= all(inside.values())
        print(f"{site['id']:18s} n={s['n']}  Sol el [{s['sun_el'].min():+6.3f}, {s['sun_el'].max():+6.3f}]° (lím ±{b['sun']:.2f}, "
              f"{'OK' if inside['sun'] else 'FUERA'})  Tierra el [{s['earth_el'].min():+6.3f}, {s['earth_el'].max():+6.3f}]° "
              f"(lím ±{b['earth']:.2f}, {'OK' if inside['earth'] else 'FUERA'})  {time.perf_counter() - t0:5.1f} s → {path.name}")
        if not args.no_plots:
            fig = root / "docs" / "figures" / f"ephemeris_{site['id']}.png"
            fig.parent.mkdir(parents=True, exist_ok=True)
            plot_series(s, site, fig)
    print(f"Total {time.perf_counter() - t_all:.1f} s; {'todo dentro de los límites' if ok else 'HAY VALORES FUERA DE LÍMITE'}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
