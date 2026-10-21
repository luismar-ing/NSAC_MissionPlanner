"""Genera las fixtures del contrato de datos (SYNTHETIC, deterministas).

    python -m pipeline.tests.fixtures.make_contract_fixtures

valid/   un conjunto completo y pequeño que cumple el contrato (2 sitios, 2 días de llegada,
         paso de 6 h). Los valores son fórmulas simples sin significado físico.
invalid/ un archivo por tipo, con nombre '{kind}__{caso}.json', que el contrato debe rechazar.

Las usan pipeline/tests/test_contract.py y web/tests/contract.test.ts (prueba de paridad).
"""

from __future__ import annotations

import copy
import json
import math
import shutil
import struct
from datetime import datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).parent / "contract"

SITES = ["syn_a", "syn_b"]
ARRIVAL_START = datetime(2027, 1, 1, tzinfo=timezone.utc)
N_ARRIVALS = 2
WINDOWS = [3, 7, 14]
STEP_MIN = 360
SCENE_STEP_MIN = 720
TRANSIT_DAYS = 3


def iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def day(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")


def r(x: float, nd: int = 3) -> float:
    return round(x, nd)


def build() -> dict[str, object]:
    """Devuelve {ruta relativa: contenido JSON o bytes} del conjunto válido."""
    out: dict[str, object] = {}
    a0 = ARRIVAL_START
    a1 = a0 + timedelta(days=N_ARRIVALS - 1)
    ts_start = a0
    ts_end = a1 + timedelta(days=1 + max(WINDOWS))
    scene_start = a0 - timedelta(days=TRANSIT_DAYS + 1)
    scene_end = ts_end
    n = int((ts_end - ts_start).total_seconds() // (STEP_MIN * 60))

    out["manifest.json"] = {
        "contract_version": "1.0.0",
        "data_version": "fixtures-1",
        "generated_utc": "2026-10-21T00:00:00Z",
        "data_status": "SYNTHETIC",
        "date_range": {
            "arrival_start": day(a0),
            "arrival_end": day(a1),
            "timeseries_start_utc": iso(ts_start),
            "timeseries_end_utc": iso(ts_end),
            "scene_start_utc": iso(scene_start),
            "scene_end_utc": iso(scene_end),
        },
        "params": {
            "step_min": STEP_MIN,
            "h_obs_m": 3.0,
            "antenna_margin_deg": 0.5,
            "sun_criterion": "upper_limb",
            "sun_radius_deg": 0.265,
            "sun_fraction_threshold": None,
            "horizon": {"az_step_deg": 1.0, "r_max_km": 100.0, "clip_negative": True},
            "window_days": WINDOWS,
            "transit_days": TRANSIT_DAYS,
            "score_weights": {"w1": 0.4, "w2": 0.3, "w3": 0.3},
            "trajectory_mode": "ILLUSTRATIVE",
            "scale_mode": "SYNTHETIC_fixture",
            "moon_frame": "MOON_ME",
            "scene_frame": "J2000",
            "spice_kernels": [],
            "dem_product": None,
        },
        "sites": SITES,
    }

    out["sites.json"] = [
        {"id": sid, "name": f"SYNTHETIC Site {sid[-1].upper()}", "lat": -88.0 - i, "lon": 10.0 * i,
         "elevation_m": 100.0 * (i + 1), "source": "SYNTHETIC"}
        for i, sid in enumerate(SITES)
    ]

    plans = []
    for sid in SITES:
        for k in range(N_ARRIVALS):
            arr = a0 + timedelta(days=k)
            for L in WINDOWS:
                plans.append({
                    "id": f"{sid}_{arr:%Y%m%d}_{L}d", "site_id": sid, "arrival_utc": iso(arr),
                    "window_days": L, "transit_days": TRANSIT_DAYS,
                    "launch_utc": iso(arr - timedelta(days=TRANSIT_DAYS)),
                    "trajectory_id": f"{sid}_{arr:%Y%m%d}",
                })
    out["plans.json"] = plans

    n_days = (ts_end - ts_start).days
    for i, sid in enumerate(SITES):
        out[f"horizon/{sid}.json"] = {
            "site_id": sid, "az_step_deg": 1.0, "h_obs_m": 3.0, "r_max_km": 100.0,
            "elev_deg": [r(max(0.0, 1.0 + math.sin(math.radians(az * (i + 2))))) for az in range(360)],
        }
        sun_el = [round(150 * math.sin(2 * math.pi * k / 4)) for k in range(n)]
        out[f"timeseries/{sid}.json"] = {
            "site_id": sid, "start_utc": iso(ts_start), "step_min": STEP_MIN, "n": n, "angle_scale": 0.01,
            "sun_az": [(9000 * k + 1000 * i) % 36000 for k in range(n)],
            "sun_el": sun_el,
            "earth_az": [(500 * k) % 36000 for k in range(n)],
            "earth_el": [round(300 * math.cos(2 * math.pi * k / 20)) for k in range(n)],
            "sun_vis": [1 if e > 50 else 0 for e in sun_el],
            "earth_vis": [1 if k % 5 else 0 for k in range(n)],
        }
        out[f"daily/{sid}.json"] = {
            "site_id": sid,
            "days": [{"date": day(ts_start + timedelta(days=d)), "sun_pct": 50.0, "earth_h": 18.0,
                      "longest_dark_h": 6.0, "longest_comm_gap_h": 6.0} for d in range(n_days)],
        }
        for L in WINDOWS:
            out[f"windows/{sid}_{L}d.json"] = {
                "site_id": sid, "window_days": L,
                "rows": [{"start": iso(a0 + timedelta(days=k)), "sun_pct": 50.0, "longest_dark_h": 6.0,
                          "earth_h_min": 12.0, "earth_h_mean": 18.0, "longest_comm_gap_h": 6.0,
                          "score": r(0.5 + 0.1 * i - 0.05 * k)} for k in range(N_ARRIVALS)],
            }
        out[f"site_features/{sid}.json"] = {
            "site_id": sid,
            "attributes": [
                {"key": "elevation_m", "label": "Elevation", "value": 100.0 * (i + 1), "unit": "m",
                 "status": "available", "source": "SYNTHETIC", "method": "SYNTHETIC fixture"},
                {"key": "slope_mean_deg", "label": "Mean slope", "value": None, "unit": "deg",
                 "status": "not available", "source": None, "method": None},
            ],
            "nearby_features": [],
        }

    ns = int((scene_end - scene_start).total_seconds() // (SCENE_STEP_MIN * 60))
    moon, sun, mq, eq = [], [], [], []
    for k in range(ns):
        th = 2 * math.pi * k / 54.6  # una vuelta cada ~27.3 días con paso de 12 h (sin significado físico)
        moon.append([r(384400 * math.cos(th), 1), r(384400 * math.sin(th), 1), 0.0])
        ph = 2 * math.pi * k / 730
        sun.append([r(math.cos(ph), 9), r(math.sin(ph), 9), 0.0])
        mq.append([0.0, 0.0, r(math.sin(th / 2), 9), r(math.cos(th / 2), 9)])
        eq.append([0.0, 0.0, r(math.sin(k * math.pi / 2), 9), r(math.cos(k * math.pi / 2), 9)])
    out["scene/ephemeris.json"] = {
        "frame": "J2000", "start_utc": iso(scene_start), "step_min": SCENE_STEP_MIN, "n": ns,
        "moon_pos_km": moon, "sun_dir": sun, "moon_frame": "MOON_ME", "moon_quat": mq,
        "earth_frame": "SYNTHETIC_EARTH_FIXED", "earth_quat": eq,
    }

    for sid in SITES:
        for k in range(N_ARRIVALS):
            arr = a0 + timedelta(days=k)
            launch = arr - timedelta(days=TRANSIT_DAYS)
            total = TRANSIT_DAYS * 86400
            t_s = [0.0, 3600.0, total / 2, total - 7200.0, float(total)]
            out[f"trajectory/{sid}_{arr:%Y%m%d}.json"] = {
                "id": f"{sid}_{arr:%Y%m%d}", "site_id": sid, "mode": "ILLUSTRATIVE", "frame": "J2000",
                "t0_utc": iso(launch), "t_s": t_s,
                "pos_km": [[r(6371 + 378000 * t / total, 1), 0.0, 0.0] for t in t_s],
                "phases": {"launch_utc": iso(launch), "injection_utc": iso(launch + timedelta(seconds=3600)),
                           "lunar_arrival_utc": iso(arr - timedelta(seconds=7200)), "landing_utc": iso(arr)},
            }

    heights = [-100, 0, 50, 25, 0, -25, 10, 20, 30]  # 3 × 3 nodos
    out["terrain/syn_a/lod0.json"] = {
        "site_id": "syn_a", "lod": 0, "frame": "ENU_SITE",
        "origin": {"lat": -88.0, "lon": 0.0, "elevation_m": 100.0}, "projection": None,
        "grid": {"nx": 3, "ny": 3, "spacing_m": 100.0, "x0_m": -100.0, "y0_m": 100.0},
        "height_encoding": "int16", "height_scale_m": 1.0, "height_offset_m": 0.0,
        "bin_file": "lod0.bin", "byte_length": 18,
    }
    out["terrain/syn_a/lod0.bin"] = struct.pack("<9h", *heights)
    return out


def invalid_cases(valid: dict[str, object]) -> dict[str, object]:
    """Un caso inválido por tipo de archivo: {'kind__caso': contenido}."""
    v = copy.deepcopy(valid)
    cases: dict[str, object] = {}

    m = copy.deepcopy(v["manifest.json"]); m["data_status"] = "FAKE"
    cases["manifest__bad_status"] = m
    s = copy.deepcopy(v["sites.json"]); del s[0]["source"]
    cases["sites__missing_source"] = s
    p = copy.deepcopy(v["plans.json"]); p[0]["launch_utc"] = "2026-12-30T00:00:00Z"
    cases["plans__launch_mismatch"] = p
    h = copy.deepcopy(v["horizon/syn_a.json"]); h["elev_deg"] = h["elev_deg"][:359]
    cases["horizon__wrong_length"] = h
    t = copy.deepcopy(v["timeseries/syn_a.json"]); t["sun_vis"] = t["sun_vis"][:-1]
    cases["timeseries__length_mismatch"] = t
    d = copy.deepcopy(v["daily/syn_a.json"]); d["days"][0]["sun_pct"] = 120.0
    cases["daily__pct_out_of_range"] = d
    w = copy.deepcopy(v["windows/syn_a_7d.json"]); w["rows"][0]["score"] = 1.5
    cases["windows__score_out_of_range"] = w
    e = copy.deepcopy(v["scene/ephemeris.json"]); e["moon_quat"][0] = [0.0, 0.0, 0.0, 2.0]
    cases["scene_ephemeris__quat_not_normalized"] = e
    tr = copy.deepcopy(v["trajectory/syn_a_20270101.json"]); tr["t_s"][2] = tr["t_s"][1]
    cases["trajectory__time_not_increasing"] = tr
    f = copy.deepcopy(v["site_features/syn_a.json"]); f["attributes"][0]["source"] = None
    cases["site_features__available_without_source"] = f
    th = copy.deepcopy(v["terrain/syn_a/lod0.json"]); th["byte_length"] = 20
    cases["terrain_header__byte_length"] = th
    return cases


def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")


def write_all(target: Path = HERE) -> None:
    if target.exists():
        shutil.rmtree(target)
    valid = build()
    for rel, content in valid.items():
        path = target / "valid" / rel
        if isinstance(content, bytes):
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
        else:
            write_json(path, content)
    for name, content in invalid_cases(valid).items():
        write_json(target / "invalid" / f"{name}.json", content)


if __name__ == "__main__":
    write_all()
    print(f"fixtures escritas en {HERE}")
