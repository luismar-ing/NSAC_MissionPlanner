"""T1.5.a: planes de 5.8 (todas las combinaciones, D6) con lanzamiento derivado."""

from pipeline.plans import build_plans, check


def test_all_combinations_and_derived_launch():
    plans = build_plans(["a_site", "b_site"])
    assert len(plans) == 2 * 365 * 3
    assert check(plans, ["a_site", "b_site"]) == []
    p = plans[0]
    assert p["arrival_utc"] == "2027-01-01T00:00:00Z" and p["launch_utc"] == "2026-12-29T00:00:00Z"
    assert len({q["trajectory_id"] for q in plans}) == 2 * 365  # compartida por las tres L


def test_check_detects_errors():
    plans = build_plans(["a_site"])
    plans[0]["launch_utc"] = "2026-12-30T00:00:00Z"
    plans[1]["site_id"] = "zzz"
    errs = check(plans, ["a_site"])
    assert any("launch_utc" in e for e in errs) and any("desconocido" in e for e in errs)
