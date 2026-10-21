"""Regenera todos los datos del front end con un solo comando (spec 7.2, regla 5; T2.4.a).

    python -m pipeline.build_all            # cadena completa → web/public/data/ + manifest.json
    python -m pipeline.build_all --assemble # solo reensambla desde pipeline/out/ (sin recalcular)

Requisitos: kernels, DEM y regiones en data/ (python -m pipeline.fetch_data). El resultado se valida con
el contrato (docs/DATA_CONTRACT.md). El manifiesto es determinista: data_version y generated_utc salen
del commit de git, no del reloj, para que dos ejecuciones sobre el mismo commit den bytes idénticos.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from pipeline import config
from pipeline.contract import CONTRACT_VERSION, format_instant

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "pipeline" / "out"
WEB = ROOT / "web" / "public" / "data"
SCALE_MODE = "exaggerated_bodies_compressed_distances"  # D8
DEM_PRODUCT = "LDEM_80S_40MPP_ADJ (LOLA, NASA GSFC PGDA)"


def run_chain() -> None:
    """Ejecuta cada paso del pipeline; cada uno escribe en pipeline/out/ y comprueba lo suyo."""
    from pipeline import ephemeris, horizon, plans, site_features, terrain_lod, trajectory, visibility, windows

    steps = [
        ("efemérides de los sitios", lambda: ephemeris.main(["--no-plots"])),
        ("máscaras de horizonte", lambda: horizon.main(["--no-plots"])),
        ("banderas de visibilidad", lambda: visibility.main([])),
        ("métricas diarias y por ventana", lambda: windows.main([])),
        ("planes", plans.main),
        ("efemérides de escena", lambda: ephemeris.main(["--scene"])),
        ("trayectorias ILLUSTRATIVE", lambda: trajectory.main([])),
        ("características de los sitios", lambda: site_features.main([])),
        ("terreno en LOD", lambda: terrain_lod.main(["--no-plots"])),
    ]
    for name, fn in steps:
        t0 = time.perf_counter()
        print(f"\n== {name}", flush=True)
        if fn() not in (0, None):
            raise SystemExit(f"falló el paso: {name}")
        print(f"   ({time.perf_counter() - t0:.1f} s)")


def git_version() -> tuple[str, str]:
    """(data_version, generated_utc) a partir del commit actual; '-dirty' si hay cambios sin commit en el código."""
    def git(*args):
        return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()

    sha = git("rev-parse", "--short=10", "HEAD")
    ts = int(git("log", "-1", "--format=%ct"))
    dirty = git("status", "--porcelain", "--", "pipeline", ":!pipeline/out")
    return (f"{sha}-dirty" if dirty else sha), format_instant(datetime.fromtimestamp(ts, timezone.utc))


def write_json(path: Path, obj, compact: bool = True) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(obj, separators=(",", ":"), ensure_ascii=False) if compact else json.dumps(obj, indent=1, ensure_ascii=False)
    path.write_text(text + "\n", encoding="utf-8", newline="\n")


def timeseries_json(site_id: str) -> dict:
    """Contrato §7: ángulos cuantizados a enteros de 0.01°."""
    s = np.load(OUT / f"ephem_{site_id}.npz")
    f = np.load(OUT / f"flags_{site_id}.npz")
    q = lambda a: np.round(np.asarray(a) / 0.01).astype(int)  # noqa: E731
    return {
        "site_id": site_id, "start_utc": str(s["start_utc"]), "step_min": int(s["step_min"]), "n": int(s["n"]),
        "angle_scale": 0.01,
        "sun_az": (q(s["sun_az"]) % 36000).tolist(), "sun_el": q(s["sun_el"]).tolist(),
        "earth_az": (q(s["earth_az"]) % 36000).tolist(), "earth_el": q(s["earth_el"]).tolist(),
        "sun_vis": f["sun_vis"].astype(int).tolist(), "earth_vis": f["earth_vis"].astype(int).tolist(),
    }


def horizon_json(site_id: str) -> dict:
    h = np.load(OUT / f"horizon_{site_id}.npz")
    return {"site_id": site_id, "az_step_deg": float(h["az_step_deg"]), "h_obs_m": float(h["h_obs_m"]),
            "r_max_km": float(h["r_max_km"]), "elev_deg": np.round(h["elev_deg"], 3).tolist()}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def assemble() -> Path:
    """Escribe web/public/data/ desde pipeline/out/ y genera manifest.json."""
    from pipeline.horizon import CLIP_NEGATIVE
    from pipeline.spice_utils import load_kernels, loaded_kernel_names

    sites = json.loads((ROOT / "pipeline" / "sites.json").read_text(encoding="utf-8"))
    ids = [s["id"] for s in sites]
    for item in WEB.iterdir() if WEB.exists() else []:
        if item.name != ".gitkeep":
            shutil.rmtree(item) if item.is_dir() else item.unlink()
    WEB.mkdir(parents=True, exist_ok=True)

    write_json(WEB / "sites.json", sites, compact=False)
    shutil.copyfile(ROOT / "pipeline" / "plans.json", WEB / "plans.json")
    for sid in ids:
        write_json(WEB / "horizon" / f"{sid}.json", horizon_json(sid))
        write_json(WEB / "timeseries" / f"{sid}.json", timeseries_json(sid))
    for sub in ("daily", "windows", "trajectory", "site_features", "scene"):
        shutil.copytree(OUT / sub, WEB / sub)
    shutil.copytree(OUT / "terrain", WEB / "terrain")

    load_kernels()
    data_version, generated = git_version()
    ts0, ts1 = config.timeseries_range()
    sc0, sc1 = config.scene_range()
    files = {p.relative_to(WEB).as_posix(): {"bytes": p.stat().st_size, "sha256": sha256(p)}
             for p in sorted(WEB.rglob("*")) if p.is_file() and p.name != ".gitkeep"}
    manifest = {
        "contract_version": CONTRACT_VERSION,
        "data_version": data_version,
        "generated_utc": generated,
        "data_status": "REAL",
        "date_range": {
            "arrival_start": config.ARRIVAL_START.strftime("%Y-%m-%d"),
            "arrival_end": config.ARRIVAL_END.strftime("%Y-%m-%d"),
            "timeseries_start_utc": format_instant(ts0), "timeseries_end_utc": format_instant(ts1),
            "scene_start_utc": format_instant(sc0), "scene_end_utc": format_instant(sc1),
        },
        "params": {
            "step_min": config.STEP_MIN, "h_obs_m": config.H_OBS_M, "antenna_margin_deg": config.ANTENNA_MARGIN_DEG,
            "sun_criterion": config.SUN_CRITERION, "sun_radius_deg": config.SUN_RADIUS_DEG,
            "sun_fraction_threshold": None if config.SUN_CRITERION == "upper_limb" else config.SUN_FRACTION_THRESHOLD,
            "horizon": {"az_step_deg": config.HORIZON_AZ_STEP_DEG, "r_max_km": config.HORIZON_R_MAX_KM,
                        "clip_negative": CLIP_NEGATIVE},
            "window_days": list(config.WINDOW_DAYS), "transit_days": config.TRANSIT_DAYS,
            "score_weights": config.SCORE_WEIGHTS, "trajectory_mode": config.TRAJECTORY_MODE,
            "scale_mode": SCALE_MODE, "moon_frame": "MOON_ME", "scene_frame": "J2000",
            "spice_kernels": loaded_kernel_names(), "dem_product": DEM_PRODUCT,
        },
        "sites": ids,
        "files": files,
    }
    write_json(WEB / "manifest.json", manifest, compact=False)
    return WEB / "manifest.json"


def main(argv=None) -> int:
    from pipeline.validate import validate_dir

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--assemble", action="store_true", help="solo reensambla web/public/data desde pipeline/out")
    args = ap.parse_args(argv)
    t0 = time.perf_counter()
    if not args.assemble:
        run_chain()
    print("\n== ensamblado de web/public/data", flush=True)
    manifest = assemble()
    errors = validate_dir(WEB)
    m = json.loads(manifest.read_text(encoding="utf-8"))
    total = sum(f["bytes"] for f in m["files"].values())
    print(f"{len(m['files'])} archivos, {total / 1e6:.2f} MB; data_version {m['data_version']}; "
          f"validación del contrato: {'OK' if not errors else str(len(errors)) + ' errores'}")
    for e in errors[:10]:
        print("  -", e)
    print(f"Total {time.perf_counter() - t0:.1f} s")
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
