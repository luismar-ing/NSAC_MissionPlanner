"""Texturas web de la Tierra y la Luna para la escena 3D (T4.1.c).

    python -m pipeline.textures        # data/textures/ (originales, T0.2.f) -> web/public/textures/

Convierte los originales verificados en T0.2.f (NASA SVS, dominio público; ver data/README.md) a JPEG
equirectangulares de 4096x2048 (escritorio) y 2048x1024 (móvil). Convención de ambos mapas, comprobada a ojo
en T4.1.c: longitud 0° en el centro, -180° en el borde izquierdo, este a la derecha, norte arriba (la de
three.js para una esfera, con un giro de 90° sobre X para pasar al marco fijo del cuerpo).

Determinista: mismos originales -> mismos bytes (Pillow fijado en requirements.txt, sin metadatos de fecha).
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "textures"
OUT = ROOT / "web" / "public" / "textures"

# originales de T0.2.f (pipeline/data_sources.json); el crédito se muestra en la interfaz
SOURCES = {
    "moon": {
        "file": "lroc_color_poles_4k.tif",
        "credit": "Moon: NASA's Scientific Visualization Studio, CGI Moon Kit (SVS 4720), LRO LROC color",
    },
    "earth": {
        "file": "flat_earth_Largest_still.0330.jpg",
        "credit": "Earth: NASA/GSFC Scientific Visualization Studio (SVS 3615); Blue Marble Next Generation courtesy of Reto Stöckli (NASA/GSFC) and NASA's Earth Observatory",
    },
}
SIZES = {"4k": (4096, 2048), "2k": (2048, 1024)}
QUALITY = 85


def convert() -> dict:
    Image.MAX_IMAGE_PIXELS = None  # the 8192x4096 Earth map
    OUT.mkdir(parents=True, exist_ok=True)
    manifest: dict = {"textures": {}, "convention": "equirectangular; lon 0 at centre, -180 at the left edge, north up"}
    for body, src in SOURCES.items():
        path = SRC / src["file"]
        if not path.exists():
            raise FileNotFoundError(f"falta {path}: descárgalo con python -m pipeline.fetch_data --textures")
        im = Image.open(path).convert("RGB")
        entry = {"source": src["file"], "credit": src["credit"], "files": {}}
        for tag, size in SIZES.items():
            out = OUT / f"{body}_{tag}.jpg"
            im.resize(size, Image.Resampling.LANCZOS).save(out, "JPEG", quality=QUALITY, optimize=True, progressive=True)
            data = out.read_bytes()
            entry["files"][tag] = {"file": out.name, "width": size[0], "height": size[1], "bytes": len(data),
                                   "sha256": hashlib.sha256(data).hexdigest()}
        manifest["textures"][body] = entry
    (OUT / "textures.json").write_text(json.dumps(manifest, indent=1, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    return manifest


def main() -> None:
    m = convert()
    total = 0
    for body, e in m["textures"].items():
        for tag, f in e["files"].items():
            total += f["bytes"]
            print(f"{body:6s} {tag}: {f['file']:16s} {f['width']}x{f['height']}  {f['bytes'] / 1e6:5.2f} MB")
    print(f"total: {total / 1e6:.2f} MB -> {OUT.relative_to(ROOT).as_posix()}")


if __name__ == "__main__":
    main()
