"""Descarga reproducible de los datos externos (spec 6, regla 5).

    python -m pipeline.fetch_data              # todos los grupos
    python -m pipeline.fetch_data --kernels    # solo kernels SPICE (también --dem, --textures)

Lee pipeline/data_sources.json. Cada archivo se descarga a data/<path> solo si falta.
Se comprueban tamaño, MD5 publicado (si existe) y SHA-256. En la primera descarga el
SHA-256 se registra en data_sources.json; desde entonces se exige que coincida.
Es idempotente: una segunda ejecución solo verifica. Las fuentes con "manual": true (sitios que
bloquean descargas automáticas) no se descargan: solo se verifican, o se explica cómo obtenerlas.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
SOURCES = Path(__file__).with_name("data_sources.json")
GROUPS = ("kernels", "dem", "textures", "regions")
CHUNK = 1 << 20


def digests(path: Path) -> tuple[str, str]:
    md5, sha = hashlib.md5(), hashlib.sha256()
    with open(path, "rb") as f:
        while block := f.read(CHUNK):
            md5.update(block)
            sha.update(block)
    return md5.hexdigest(), sha.hexdigest()


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    part = dest.with_name(dest.name + ".part")
    req = urllib.request.Request(url, headers={"User-Agent": "PolePlanner-fetch/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp, open(part, "wb") as out:
        while block := resp.read(CHUNK):
            out.write(block)
    part.replace(dest)


def check(src: dict, path: Path) -> list[str]:
    """Devuelve los problemas de integridad del archivo local (lista vacía si está bien)."""
    problems = []
    size = path.stat().st_size
    if src.get("bytes") is not None and size != src["bytes"]:
        problems.append(f"tamaño {size} ≠ {src['bytes']}")
    md5, sha = digests(path)
    if src.get("md5") and md5 != src["md5"]:
        problems.append(f"MD5 {md5} ≠ publicado {src['md5']}")
    if src.get("sha256") and sha != src["sha256"]:
        problems.append(f"SHA-256 {sha} ≠ registrado {src['sha256']}")
    src["_sha256_actual"] = sha
    return problems


def fetch(groups: list[str]) -> int:
    registry = json.loads(SOURCES.read_text(encoding="utf-8"))
    changed, failures = False, 0
    for src in registry["sources"]:
        if src["group"] not in groups:
            continue
        path = DATA / src["path"]
        state = "present"
        if not path.exists() and src.get("manual"):
            failures += 1
            print(f"[{src['id']}] FALTA {src['path']}: descarga manual (la web bloquea descargas automáticas). "
                  f"Bájalo en el navegador desde {src['url']} y déjalo tal cual en data/{src['path']}")
            continue
        if not path.exists():
            print(f"[{src['id']}] descargando {src['url']} ...", flush=True)
            download(src["url"], path)
            state = "downloaded"
        problems = check(src, path)
        sha = src.pop("_sha256_actual")
        if problems:
            failures += 1
            print(f"[{src['id']}] ERROR {src['path']}: {'; '.join(problems)}")
            continue
        if src.get("sha256") is None:
            src["sha256"] = sha
            changed = True
            print(f"[{src['id']}] {state}, checksum registrado: sha256 {sha}")
        else:
            print(f"[{src['id']}] {state}, checksum OK ({src['path']})")
    if changed:
        SOURCES.write_text(json.dumps(registry, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    return 1 if failures else 0


def main(argv: list[str] | None = None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    for g in GROUPS:
        ap.add_argument(f"--{g}", action="store_true", help=f"solo el grupo {g}")
    args = ap.parse_args(argv)
    groups = [g for g in GROUPS if getattr(args, g)] or list(GROUPS)
    return fetch(groups)


if __name__ == "__main__":
    sys.exit(main())
