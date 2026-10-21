# data/: fuentes de datos externas

Esta carpeta guarda los datos pesados (kernels SPICE, DEM LOLA, texturas). **No se versionan**: solo este README.
Se descargan con `python -m pipeline.fetch_data` (registro de fuentes y checksums: `pipeline/data_sources.json`).

Descargado: kernels SPICE (2026-10-21). Cada fila se completa al verificar y descargar la fuente (T0.2.a, T0.2.d, T0.2.f, T2.2.a, T2.3.b). No se escribe ningún nombre de archivo ni URL que no se haya comprobado.

## Kernels SPICE (T0.2.a)

Fuente: NAIF generic kernels (NASA/JPL), `https://naif.jpl.nasa.gov/pub/naif/generic_kernels/`. Condiciones de uso: `AACLEARANCE_STATEMENT.pdf` en esa carpeta (pendiente de leer y resumir antes de la entrega, regla 12).
Verificado el 2026-10-21: todas las URLs responden HTTP 200; nombres, tamaños y coberturas copiados del servidor (`Content-Length`, `aa_summaries.txt` y los `.cmt`).

| Tipo | Archivo exacto | URL | Tamaño (bytes) | Cobertura publicada | Checksum publicado por NAIF | SHA-256 (T0.2.b) | Fecha de descarga |
|---|---|---|---|---|---|---|---|
| SPK planetario (DE440, versión corta) | `de440s.bsp` | https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440s.bsp | 32 726 016 | 1849-12-26 a 2150-01-22 (ET) | MD5 `3917ee56769db332790c751e2168843d` (`aa_checksums.txt`) | `c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2` | 2026-10-21 |
| LSK (segundos intercalares) | `naif0012.tls` | https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls | 5 257 | Último salto: 2017-01-01 (idéntico a `latest_leapseconds.tls`) | — | `678e32bdb5a744117a467cd9601cd6b373f0e9bc9bbde1371d5eee39600a039b` | 2026-10-21 |
| PCK de texto (constantes, IAU_EARTH, radios) | `pck00011.tpc` | https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc | 131 226 | Sin límite (modelo analítico) | — | `3dff7b1dbeceaa01f25467767d3fa25816051c85d162d1edf04acb310ee28bb1` | 2026-10-21 |
| PCK binario de orientación lunar (DE440) | `moon_pa_de440_200625.bpc` | https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/moon_pa_de440_200625.bpc | 12 863 488 | 1549-12-31 a 2650-01-25 (ET) | — | `60cd55aa401ea2ea97360636f567554bfe4e37bb829f901b4460a455dfaf783f` | 2026-10-21 |
| FK lunar (define MOON_PA y MOON_ME para DE440) | `moon_de440_250416.tf` | https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_de440_250416.tf | 19 478 | — (marcos fijos) | — | `a47c71e9c9f33796bdafb2c9d69a7ee447b6016ecad80f71cd6f3e479f9cf768` | 2026-10-21 |

Notas de la selección:
- **SPK:** `de440s.bsp` es la versión de periodo corto de DE440 (la spec sugiere DE440) y cubre de sobra el rango D4 (2027). Se descarta `de440.bsp` (119 799 808 bytes, mismo modelo y periodo más largo) por tamaño. Existe un DE442 más reciente, pero el PCK y el FK lunares publicados son de la serie DE440. Usar la misma serie mantiene coherentes efemérides y orientación.
- **Marcos lunares:** según `moon_de440_250416.tf`, `MOON_PA` → `MOON_PA_DE440` (PCK, id 31008, orientación del binario anterior) y `MOON_ME` → `MOON_ME_DE440_ME421` (fijo respecto a MOON_PA_DE440). La elección entre ME y PA es de T1.1.b (spec 5.1).
- **LSK:** no se conocen segundos intercalares posteriores a 2017; para 2027 SPICE supone ΔAT = 37 s. Si se anunciara uno nuevo, el error sería de ~1 s en la conversión UTC↔TDB, despreciable para az/el del Sol y la Tierra vistos desde la Luna.
- **Orientación de la Tierra (escena 3D, T2.1.a):** `pck00011.tpc` ya trae el modelo IAU_EARTH, suficiente para la rotación visual. Alternativa de mayor precisión, solo si T2.1.a la necesita: `earth_1962_260806_2126_combined.bpc` (31 318 016 bytes; ITRF93; 1962-01-20 a 2126-11-03 TDB; la parte posterior al 2026-11-02 es una predicción de baja precisión) junto con `fk/planets/earth_assoc_itrf93.tf` (7 522 bytes). No se descargan por ahora.

## DEM LOLA del polo sur (T0.2.d)

| Producto | URL | Resolución | Proyección | Radio de referencia | Tamaño | SHA-256 | Fecha | Cita |
|---|---|---|---|---|---|---|---|---|

## Texturas (T0.2.f)

| Cuerpo | Fuente | URL | Resolución | Licencia | Tamaño | SHA-256 | Fecha |
|---|---|---|---|---|---|---|---|

## Otras fuentes (trayectoria real, nomenclatura, cohete)

| Uso | Fuente | URL | Licencia | Fecha |
|---|---|---|---|---|
