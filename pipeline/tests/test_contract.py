"""Contrato de datos (docs/DATA_CONTRACT.md): validación de archivos y comprobaciones cruzadas."""

import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

from pipeline.contract import MODELS
from pipeline.tests.fixtures import make_contract_fixtures as fx
from pipeline.validate import kind_for_path, validate_dir, validate_file

FIXTURES = Path(__file__).parent / "fixtures" / "contract"
VALID = FIXTURES / "valid"
INVALID = sorted((FIXTURES / "invalid").glob("*.json"))
ROOT = Path(__file__).resolve().parents[2]


def test_valid_dataset_passes():
    assert validate_dir(VALID) == []


@pytest.mark.parametrize("path", sorted(p for p in VALID.rglob("*.json")), ids=lambda p: p.relative_to(VALID).as_posix())
def test_each_valid_file_passes_alone(path):
    model, errors = validate_file(path)
    assert errors == [] and model is not None


def test_one_invalid_fixture_per_kind():
    kinds = {p.name.split("__")[0] for p in INVALID}
    assert kinds == set(MODELS)


@pytest.mark.parametrize("path", INVALID, ids=lambda p: p.stem)
def test_invalid_file_is_rejected_with_message(path):
    model, errors = validate_file(path)
    assert model is None
    assert errors and all(path.name in e for e in errors)
    print("\n".join(errors))


@pytest.mark.parametrize(
    "rel,kind",
    [("manifest.json", "manifest"), ("scene/ephemeris.json", "scene_ephemeris"),
     ("windows/syn_a_7d.json", "windows"), ("terrain/syn_a/lod0.json", "terrain_header")],
)
def test_kind_for_path(rel, kind):
    assert kind_for_path(VALID / rel) == kind


# ---------------------------------------------------------- comprobaciones cruzadas


@pytest.fixture
def dataset(tmp_path):
    dst = tmp_path / "data"
    shutil.copytree(VALID, dst)
    return dst


def edit(path: Path, fn):
    data = json.loads(path.read_text(encoding="utf-8"))
    fn(data)
    path.write_text(json.dumps(data), encoding="utf-8")


def assert_error(errors, fragment):
    assert any(fragment in e for e in errors), errors


def test_plan_with_unknown_site(dataset):
    edit(dataset / "plans.json", lambda d: d[0].update(site_id="syn_z", id="syn_z_20270101_3d", trajectory_id="syn_z_20270101"))
    assert_error(validate_dir(dataset), "site_id syn_z no existe")


def test_missing_windows_file(dataset):
    (dataset / "windows" / "syn_b_14d.json").unlink()
    assert_error(validate_dir(dataset), "falta windows/syn_b_14d.json")


def test_synthetic_site_must_be_labelled(dataset):
    edit(dataset / "sites.json", lambda d: d[0].update(name="Malapert"))
    assert_error(validate_dir(dataset), "name debe contener 'SYNTHETIC'")


def test_timeseries_must_match_date_range(dataset):
    def shorten(d):
        for k in ("sun_az", "sun_el", "earth_az", "earth_el", "sun_vis", "earth_vis"):
            d[k] = d[k][:-1]
        d["n"] -= 1
    edit(dataset / "timeseries" / "syn_a.json", shorten)
    assert_error(validate_dir(dataset), "no cuadra con date_range")


def test_terrain_binary_size(dataset):
    (dataset / "terrain" / "syn_a" / "lod0.bin").write_bytes(b"\x00" * 10)
    assert_error(validate_dir(dataset), "mide 10 bytes")


def test_trajectory_mode_must_match_manifest(dataset):
    edit(dataset / "trajectory" / "syn_a_20270101.json", lambda d: d.update(mode="REAL"))
    assert_error(validate_dir(dataset), "≠ params.trajectory_mode")


def test_site_id_inside_file_must_match(dataset):
    edit(dataset / "horizon" / "syn_a.json", lambda d: d.update(site_id="syn_b"))
    assert_error(validate_dir(dataset), "site_id interno = syn_b")


# ---------------------------------------------------------- CLI y fixtures


def run_cli(*args):
    return subprocess.run([sys.executable, "-m", "pipeline.validate", *args], cwd=ROOT, capture_output=True, text=True)


def test_cli_ok_and_error_exit_codes():
    ok = run_cli(str(VALID))
    assert ok.returncode == 0, ok.stdout + ok.stderr
    bad = run_cli("--file", str(FIXTURES / "invalid" / "plans__launch_mismatch.json"))
    assert bad.returncode == 1 and "launch_utc" in bad.stdout


def test_committed_fixtures_are_up_to_date(tmp_path):
    fx.write_all(tmp_path / "contract")
    generated = {p.relative_to(tmp_path / "contract").as_posix(): p.read_bytes()
                 for p in (tmp_path / "contract").rglob("*") if p.is_file()}
    committed = {p.relative_to(FIXTURES).as_posix(): p.read_bytes() for p in FIXTURES.rglob("*") if p.is_file()}
    assert generated == committed, "regenera con: python -m pipeline.tests.fixtures.make_contract_fixtures"
