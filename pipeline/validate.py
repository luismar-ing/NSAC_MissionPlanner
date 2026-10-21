"""Valida datos contra el contrato (docs/DATA_CONTRACT.md).

Uso:
    python -m pipeline.validate <directorio>              # conjunto completo + comprobaciones cruzadas
    python -m pipeline.validate --file <archivo> [--kind K]

Sale con código 0 si todo es válido y 1 si hay errores.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import timedelta
from pathlib import Path

from pydantic import BaseModel, ValidationError

from pipeline.contract import (
    CONTRACT_VERSION,
    MODELS,
    Manifest,
    parse_day,
    parse_instant,
)

KINDS = sorted(MODELS)


def load_json(path: Path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def kind_for_path(path: Path) -> str:
    """Deduce el tipo de archivo por su ruta (o por el prefijo 'kind__' de las fixtures)."""
    name, parent = path.name, path.parent.name
    if "__" in name and name.split("__")[0] in MODELS:
        return name.split("__")[0]
    if name in ("manifest.json", "sites.json", "plans.json"):
        return name[:-5]
    if parent == "scene" and name == "ephemeris.json":
        return "scene_ephemeris"
    if parent in ("horizon", "timeseries", "daily", "windows", "trajectory", "site_features"):
        return parent
    if path.parent.parent.name == "terrain" and re.fullmatch(r"lod\d+\.json", name):
        return "terrain_header"
    raise ValueError(f"no se puede deducir el tipo de {path}; usa --kind ({', '.join(KINDS)})")


def _format(err: ValidationError, label: str) -> list[str]:
    out = []
    for e in err.errors():
        loc = ".".join(str(x) for x in e["loc"]) or "(raíz)"
        out.append(f"{label}: {loc}: {e['msg']}")
    return out


def validate_file(path: Path, kind: str | None = None) -> tuple[BaseModel | None, list[str]]:
    """Valida un archivo aislado. Devuelve (modelo o None, errores)."""
    label = str(path)
    try:
        kind = kind or kind_for_path(path)
        data = load_json(path)
    except (ValueError, OSError) as e:
        return None, [f"{label}: {e}"]
    try:
        return MODELS[kind].model_validate(data), []
    except ValidationError as e:
        return None, _format(e, label)


def validate_dir(root: Path) -> list[str]:
    """Valida un conjunto de datos completo con las comprobaciones de la sección 14 del contrato."""
    root = Path(root)
    errors: list[str] = []

    def need(rel: str, kind: str):
        p = root / rel
        if not p.exists():
            errors.append(f"falta {rel}")
            return None
        model, errs = validate_file(p, kind)
        errors.extend(errs)
        return model

    manifest: Manifest | None = need("manifest.json", "manifest")
    sites = need("sites.json", "sites")
    plans = need("plans.json", "plans")
    if manifest is None or sites is None:
        return errors or ["manifest.json o sites.json no válidos"]

    # 1. versión y lista de sitios
    if manifest.contract_version.split(".")[0] != CONTRACT_VERSION.split(".")[0]:
        errors.append(f"contract_version {manifest.contract_version} incompatible con {CONTRACT_VERSION}")
    site_ids = [s.id for s in sites.root]
    if manifest.sites != site_ids:
        errors.append("manifest.sites no coincide con los id de sites.json")

    p, dr = manifest.params, manifest.date_range
    a0, a1 = parse_day(dr.arrival_start), parse_day(dr.arrival_end)
    n_arrivals = (a1 - a0).days + 1
    ts_start, ts_end = parse_instant(dr.timeseries_start_utc), parse_instant(dr.timeseries_end_utc)

    # 12. SYNTHETIC / REAL
    if manifest.data_status == "SYNTHETIC":
        for s in sites.root:
            if "SYNTHETIC" not in s.name or s.source != "SYNTHETIC":
                errors.append(f"sitio {s.id}: con data_status SYNTHETIC, name debe contener 'SYNTHETIC' y source ser 'SYNTHETIC'")
    else:
        if any(s.id.startswith("syn_") for s in sites.root):
            errors.append("data_status REAL con sitios syn_*")
        if not p.spice_kernels:
            errors.append("data_status REAL sin params.spice_kernels")

    for sid in site_ids:
        # 2-3. archivos por sitio y site_id interno
        files = {
            "horizon": need(f"horizon/{sid}.json", "horizon"),
            "timeseries": need(f"timeseries/{sid}.json", "timeseries"),
            "daily": need(f"daily/{sid}.json", "daily"),
            "site_features": need(f"site_features/{sid}.json", "site_features"),
        }
        for L in p.window_days:
            files[f"windows_{L}"] = w = need(f"windows/{sid}_{L}d.json", "windows")
            if w is not None:
                if w.window_days != L:
                    errors.append(f"windows/{sid}_{L}d.json: window_days = {w.window_days}")
                # 7. una fila por día de llegada
                first, last = parse_instant(w.rows[0].start), parse_instant(w.rows[-1].start)
                if first != a0 or last != a1 or len(w.rows) != n_arrivals:
                    errors.append(f"windows/{sid}_{L}d.json: las filas deben ir de arrival_start a arrival_end ({n_arrivals})")
        for key, m in files.items():
            if m is not None and m.site_id != sid:
                errors.append(f"{key} de {sid}: site_id interno = {m.site_id}")

        # 4. series
        ts = files["timeseries"]
        if ts is not None:
            if ts.step_min != p.step_min:
                errors.append(f"timeseries/{sid}: step_min {ts.step_min} ≠ manifiesto {p.step_min}")
            start = parse_instant(ts.start_utc)
            if start != ts_start or start + timedelta(minutes=ts.step_min * ts.n) != ts_end:
                errors.append(f"timeseries/{sid}: start_utc + n·step_min no cuadra con date_range")
        # 5. horizonte
        hz = files["horizon"]
        if hz is not None:
            if hz.az_step_deg != p.horizon.az_step_deg or hz.h_obs_m != p.h_obs_m or hz.r_max_km != p.horizon.r_max_km:
                errors.append(f"horizon/{sid}: az_step_deg, h_obs_m o r_max_km no coinciden con el manifiesto")
            if p.horizon.clip_negative and min(hz.elev_deg) < 0:
                errors.append(f"horizon/{sid}: valores negativos con clip_negative")
        # 6. diarios
        dl = files["daily"]
        if dl is not None:
            if parse_day(dl.days[0].date) != a0 or parse_day(dl.days[-1].date) + timedelta(days=1) != ts_end:
                errors.append(f"daily/{sid}: los días deben cubrir el rango de las series")

    # 8-9. planes y trayectorias
    traj_cache: dict[str, object] = {}
    if plans is not None:
        if len(plans.root) != len(site_ids) * n_arrivals * len(p.window_days):
            errors.append(f"plans.json: {len(plans.root)} planes; con D6 se esperan sitios × llegadas × L = "
                          f"{len(site_ids) * n_arrivals * len(p.window_days)}")
        for plan in plans.root:
            if plan.site_id not in site_ids:
                errors.append(f"plan {plan.id}: site_id {plan.site_id} no existe")
            if plan.window_days not in p.window_days:
                errors.append(f"plan {plan.id}: window_days {plan.window_days} no está en params.window_days")
            arr = parse_instant(plan.arrival_utc)
            if not a0 <= arr <= a1:
                errors.append(f"plan {plan.id}: arrival_utc fuera del rango de llegadas")
            tid = plan.trajectory_id
            if tid not in traj_cache:  # need() registra "falta ..." si el archivo no existe
                traj_cache[tid] = need(f"trajectory/{tid}.json", "trajectory")
            tr = traj_cache[tid]
            if tr is not None:
                if tr.mode != p.trajectory_mode:
                    errors.append(f"{tid}: mode {tr.mode} ≠ params.trajectory_mode {p.trajectory_mode}")
                if tr.phases.launch_utc != plan.launch_utc or tr.phases.landing_utc != plan.arrival_utc:
                    errors.append(f"{tid}: phases no coinciden con launch_utc/arrival_utc del plan {plan.id}")

    # 10. escena
    scene = need("scene/ephemeris.json", "scene_ephemeris")
    if scene is not None:
        if scene.frame != p.scene_frame or scene.moon_frame != p.moon_frame:
            errors.append("scene/ephemeris.json: frame o moon_frame no coinciden con el manifiesto")
        s0 = parse_instant(scene.start_utc)
        s1 = s0 + timedelta(minutes=scene.step_min * scene.n)
        if s0 != parse_instant(dr.scene_start_utc) or s1 != parse_instant(dr.scene_end_utc):
            errors.append("scene/ephemeris.json: start_utc + n·step_min no cuadra con date_range")
        if plans is not None and plans.root:
            first_launch = min(parse_instant(x.launch_utc) for x in plans.root)
            if s0 > first_launch or s1 < ts_end:
                errors.append("scene/ephemeris.json: no cubre desde el primer despegue hasta el final de las series")

    # 11. terreno
    terrain = root / "terrain"
    if terrain.exists():
        for header in sorted(terrain.glob("*/lod*.json")):
            model, errs = validate_file(header, "terrain_header")
            errors.extend(errs)
            if model is None:
                continue
            if model.site_id != header.parent.name:
                errors.append(f"{header}: site_id {model.site_id} ≠ carpeta {header.parent.name}")
            binp = header.parent / model.bin_file
            if not binp.exists():
                errors.append(f"{header}: falta {model.bin_file}")
            elif binp.stat().st_size != model.byte_length:
                errors.append(f"{header}: {model.bin_file} mide {binp.stat().st_size} bytes, byte_length = {model.byte_length}")

    return errors


def main(argv: list[str] | None = None) -> int:
    if hasattr(sys.stdout, "reconfigure"):  # en Windows, una tubería usaría cp1252
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("directory", nargs="?", help="raíz de un conjunto de datos")
    ap.add_argument("--file", help="valida un solo archivo")
    ap.add_argument("--kind", choices=KINDS, help="tipo del archivo (si no se deduce de la ruta)")
    args = ap.parse_args(argv)
    if bool(args.directory) == bool(args.file):
        ap.error("indica un directorio o --file")

    if args.file:
        _, errors = validate_file(Path(args.file), args.kind)
        target = args.file
    else:
        errors = validate_dir(Path(args.directory))
        target = args.directory
    if errors:
        print(f"INVALID: {target} ({len(errors)} error(es))")
        for e in errors:
            print(f"  - {e}")
        return 1
    print(f"OK: {target} cumple el contrato {CONTRACT_VERSION}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
