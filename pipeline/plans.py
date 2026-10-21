"""Genera pipeline/plans.json (spec 5.8; contrato §5; D5, D6, D7).

    python -m pipeline.plans

Un plan por sitio × día de llegada × L (D6: todas las combinaciones). Calendario indexado por llegada
(D7). launch_utc = arrival_utc − transit_days (D5: 3 días). trajectory_id = {sitio}_{AAAAMMDD} (una
trayectoria por sitio y día de llegada, compartida por las tres L).
"""

from __future__ import annotations

import json
import sys
from datetime import timedelta
from pathlib import Path

from pipeline import config
from pipeline.contract import format_instant, parse_instant

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(__file__).with_name("plans.json")


def build_plans(site_ids: list[str]) -> list[dict]:
    n_days = (config.ARRIVAL_END - config.ARRIVAL_START).days + 1
    plans = []
    for sid in site_ids:
        for k in range(n_days):
            arrival = config.ARRIVAL_START + timedelta(days=k)
            stamp = arrival.strftime("%Y%m%d")
            for L in config.WINDOW_DAYS:
                plans.append({
                    "id": f"{sid}_{stamp}_{L}d",
                    "site_id": sid,
                    "arrival_utc": format_instant(arrival),
                    "window_days": L,
                    "transit_days": config.TRANSIT_DAYS,
                    "launch_utc": format_instant(arrival - timedelta(days=config.TRANSIT_DAYS)),
                    "trajectory_id": f"{sid}_{stamp}",
                })
    return plans


def check(plans: list[dict], site_ids: list[str]) -> list[str]:
    """Comprobaciones cruzadas: sitio válido, lanzamiento derivado y número de planes (D6)."""
    errors = []
    n_days = (config.ARRIVAL_END - config.ARRIVAL_START).days + 1
    expected = len(site_ids) * n_days * len(config.WINDOW_DAYS)
    if len(plans) != expected:
        errors.append(f"{len(plans)} planes, se esperaban {expected}")
    for p in plans:
        if p["site_id"] not in site_ids:
            errors.append(f"{p['id']}: sitio desconocido")
        if parse_instant(p["arrival_utc"]) - parse_instant(p["launch_utc"]) != timedelta(days=p["transit_days"]):
            errors.append(f"{p['id']}: launch_utc no es arrival_utc − transit_days")
    return errors


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    from pipeline.validate import validate_file

    site_ids = [s["id"] for s in json.loads((ROOT / "pipeline" / "sites.json").read_text(encoding="utf-8"))]
    plans = build_plans(site_ids)
    OUT.write_text(json.dumps(plans, separators=(",", ":")) + "\n", encoding="utf-8", newline="\n")
    _, schema_errors = validate_file(OUT, "plans")
    errors = schema_errors + check(plans, site_ids)
    print(f"{len(plans)} planes = {len(site_ids)} sitios × {len(plans) // len(site_ids) // len(config.WINDOW_DAYS)} llegadas × "
          f"{len(config.WINDOW_DAYS)} L; {OUT.stat().st_size / 1e6:.2f} MB → {OUT.relative_to(ROOT)}")
    print(f"primero: {plans[0]}")
    print(f"contrato + comprobaciones cruzadas: {'OK' if not errors else errors[:5]}")
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
