"""fetch_data: la verificación de integridad detecta archivos alterados."""

import hashlib

from pipeline.fetch_data import check


def test_check_accepts_matching_file(tmp_path):
    f = tmp_path / "k.bin"
    f.write_bytes(b"kernel")
    src = {"bytes": 6, "md5": hashlib.md5(b"kernel").hexdigest(), "sha256": hashlib.sha256(b"kernel").hexdigest()}
    assert check(src, f) == []


def test_check_detects_size_md5_and_sha_mismatch(tmp_path):
    f = tmp_path / "k.bin"
    f.write_bytes(b"corrupt")
    src = {"bytes": 6, "md5": hashlib.md5(b"kernel").hexdigest(), "sha256": hashlib.sha256(b"kernel").hexdigest()}
    problems = check(src, f)
    assert len(problems) == 3, problems
