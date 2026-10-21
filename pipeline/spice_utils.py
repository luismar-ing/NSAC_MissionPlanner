"""Carga de kernels SPICE y utilidades de tiempo y cobertura (spec 5.1)."""

from __future__ import annotations

import os
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

import spiceypy as sp

ROOT = Path(__file__).resolve().parents[1]
META_KERNEL = Path("pipeline/spice/poleplanner.tm")  # relativo a ROOT


@contextmanager
def _cwd(path: Path):
    prev = os.getcwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(prev)


def load_kernels() -> None:
    """Carga el meta-kernel una sola vez (las rutas del .tm son relativas a la raíz del repo)."""
    if sp.ktotal("META") > 0:
        return
    missing = [k for k in kernel_files() if not (ROOT / k).exists()]
    if missing:
        raise FileNotFoundError(f"faltan kernels {missing}; ejecuta: python -m pipeline.fetch_data --kernels")
    with _cwd(ROOT):
        sp.furnsh(str(META_KERNEL).replace("\\", "/"))


def kernel_files() -> list[str]:
    """Rutas (relativas a la raíz) de los kernels que lista el meta-kernel."""
    text = (ROOT / META_KERNEL).read_text(encoding="utf-8")
    names = [line.strip().strip("'") for line in text.splitlines() if line.strip().startswith("'$K/")]
    return [n.replace("$K", "data/kernels") for n in names]


def loaded_kernel_names() -> list[str]:
    """Nombres de archivo de los kernels cargados (para manifest.params.spice_kernels)."""
    return [Path(sp.kdata(i, "ALL")[0]).name for i in range(sp.ktotal("ALL")) if sp.kdata(i, "ALL")[1] != "META"]


def utc_to_et(dt: datetime) -> float:
    # SPICE interpreta una cadena ISO sin zona como UTC
    return sp.str2et(dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S"))


def spk_coverage(kernel: str, body: int) -> list[tuple[float, float]]:
    """Intervalos ET con datos del cuerpo `body` en un SPK."""
    cover = sp.spkcov(str(ROOT / kernel), body)
    return [sp.wnfetd(cover, i) for i in range(sp.wncard(cover))]


def pck_coverage(kernel: str, frame_class_id: int) -> list[tuple[float, float]]:
    """Intervalos ET con datos de orientación en un PCK binario."""
    cover = sp.pckcov(str(ROOT / kernel), frame_class_id)
    return [sp.wnfetd(cover, i) for i in range(sp.wncard(cover))]


def covers(intervals: list[tuple[float, float]], et0: float, et1: float) -> bool:
    return any(a <= et0 and et1 <= b for a, b in intervals)
