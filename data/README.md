# data/: fuentes de datos externas

Esta carpeta guarda los datos pesados (kernels SPICE, DEM LOLA, texturas). **No se versionan**: solo este README.
Se descargan con `python -m pipeline.fetch_data` (registro de fuentes y checksums: `pipeline/data_sources.json`).

Descargado: kernels SPICE, DEM LOLA y texturas (2026-10-21). Cada fila se completa al verificar y descargar la fuente (T0.2.a, T0.2.d, T0.2.f, T2.2.a, T2.3.b). No se escribe ningún nombre de archivo ni URL que no se haya comprobado.

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

Fuente: NASA GSFC Planetary Geodynamics Data Archive (PGDA), producto «A New View of the Lunar South Pole from LOLA», https://pgda.gsfc.nasa.gov/products/90 (DOI de los datos: 10.60903/gsfcpgda-lola-spole). Verificado el 2026-10-21: URL HTTP 200; metadatos leídos de la cabecera del GeoTIFF remoto con rasterio.

| Producto | URL | Resolución | Proyección (de la cabecera) | Referencia de alturas | Tamaño (bytes) | SHA-256 | Fecha | Cita |
|---|---|---|---|---|---|---|---|---|
| `LDEM_80S_40MPP_ADJ.TIF` (COG, float32, nodata NaN, 15 200 × 15 200, overviews 2–32) | https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_40MPP_ADJ.TIF | 40 m/píxel, 80°S–90°S (x, y en ±304 000 m) | `+proj=stere +lat_0=-90 +lat_ts=-90 +lon_0=0 +R=1737400 +units=m` (IAU 30135, «Moon (2015) - Sphere / Ocentric / South Polar»); coordenadas en MOON_ME de DE421 | Altura en m sobre la esfera de referencia de 1 737 400 m (rango −7 296.5 a +7 026.8 m) | 716 299 920 | `b7f3567bfa405dbcb42f867f6cd3c9932ca9752b4363ce1eef835f9115c1dd76` | 2026-10-21 | Barker, M. K. et al. 2023, *Planetary Science Journal* 4, 183, doi:10.3847/PSJ/acf3e1 |

Notas de la selección:
- **Fuente:** la spec sugiere el PDS Geosciences Node. Se usa PGDA, que es el archivo del equipo LOLA en NASA GSFC: tiene el producto polar más reciente («ADJ», ajustado, Barker et al. 2023), con DOI, en GeoTIFF COG legible con rasterio. Los productos GDR polares de PDS (ODE) son anteriores; ODE lista, por ejemplo, `LDEM_80S_20M` con 30 400 × 30 400 píxeles en 16 bits.
- **Resolución:** 40 m cumple «decenas de metros» (spec 6) y cubre 80°S–90°S, lo que deja ≥ 100 km de margen (R_max, 5.2) alrededor de sitios hasta ~83°S. Alternativas del mismo producto: `LDEM_80S_80MPP_ADJ.TIF` (189 158 392 bytes; respaldo si el cómputo es lento) y `LDEM_80S_20MPP_ADJ.TIF` (2,6 GB; descartado por tamaño).
- **Referencia de alturas:** el artículo habla de «elevation above the reference sphere» con un radio de proyección de 1737.4 km, y la convención de los LOLA GDR en PDS es HEIGHT relativa a una esfera de referencia (`OFFSET`). Se toma 1 737 400 m, la esfera del CRS. El rango de valores de la cabecera es coherente con ello.
- **Marco:** MOON_ME de DE421. El marco `MOON_ME` de nuestros kernels es `MOON_ME_DE440_ME421`, alineado con el ME de DE421 (FK `moon_de440_250416.tf`). Por eso conviene usar MOON_ME en T1.1.b.
- **Uso:** la página no declara una licencia; pide citar Barker et al. 2023 («Data Usage Policy»). Se cita en el README y en la interfaz (regla 12).

## Texturas (T0.2.f)

Fuente: NASA Scientific Visualization Studio (SVS). Verificado el 2026-10-21 (URLs HTTP 200). Política de uso de SVS (https://svs.gsfc.nasa.gov/help/): «All of our content is in the public domain (unless otherwise noted)»; las páginas de estas texturas no indican otra cosa.

| Cuerpo | Fuente | URL | Resolución | Licencia y crédito | Tamaño (bytes) | SHA-256 | Fecha |
|---|---|---|---|---|---|---|---|
| Luna (color) | SVS 4720 «CGI Moon Kit», versión 2019 con polos: `lroc_color_poles_4k.tif` | https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_4k.tif | 4096 × 2048, equirectangular, RGB | Dominio público (SVS). Crédito: «NASA's Scientific Visualization Studio». La página avisa: «optimized for aesthetics, not science». | 13 095 388 | `918649a7f8ed2f1329b2cd95bb0d25483befdcb60ae1a66db681a637cc21344f` | 2026-10-21 |
| Tierra (color con nubes) | SVS 3615 «Equirectangular Projected Earth»: `flat_earth_Largest_still.0330.jpg` | https://svs.gsfc.nasa.gov/vis/a000000/a003600/a003615/flat_earth_Largest_still.0330.jpg | 8192 × 4096, equirectangular, RGB | Dominio público (SVS). Crédito: «NASA/Goddard Space Flight Center Scientific Visualization Studio»; datos: «The Blue Marble Next Generation data is courtesy of Reto Stockli (NASA/GSFC) and NASA's Earth Observatory.» | 6 003 000 | `5ea6b68a4412421cae11711ae4fec1a7b1f2dbd7265c0c3004d487a03c43be9a` | 2026-10-21 |

Notas de la selección:
- **Luna:** se usa la versión «poles» de 2019, que cubre las regiones polares; la escena hace zoom al polo sur. La versión 2025 (`lroc_color_16bit_srgb_4k.tif`, 59 MB) pesa 4,5 veces más. La textura es solo visual (la página lo advierte); la ciencia sale del DEM LOLA.
- **Tierra:** el servidor original de Blue Marble NG (Visible Earth, NEO) redirige ahora a science.nasa.gov y no publica listados de archivos; SVS 3615 ofrece la Tierra equirectangular para envolver una esfera, con crédito BMNG.
- **Conversión web (T4.1.c):** `python -m pipeline.textures` genera `web/public/textures/{earth,moon}_{4k,2k}.jpg` (JPEG calidad 85, 3,74 MB en total, determinista) y `textures.json` con tamaños, SHA-256 y créditos. Convención comprobada: longitud 0° en el centro, −180° a la izquierda, norte arriba.
- **Presupuesto (D13 < 50 MB):** se reservan 10 MB para texturas web. Prueba de conversión a 4096 × 2048 JPEG calidad 85: Luna 1,55 MB + Tierra 1,54 MB = 3,09 MB. La conversión definitiva (y la de 2k para móvil) se hace en T4.1.c. Los originales de `data/textures/` no se publican.

## Regiones candidatas de Artemis III (T0.3.a) — descarga MANUAL

`sciencebase.gov` bloquea las descargas automáticas (desafío anti-bots de Cloudflare). Estos archivos se bajan **a mano en el navegador** desde la página del DOI y se dejan **tal cual (.zip)** en `data/regions/`. `python -m pipeline.fetch_data --regions` solo comprueba el SHA-256 o explica cómo obtenerlos. Restricciones de uso según los metadatos: «None».

| Archivo | DOI (página de descarga) | Contenido usado | Tamaño (bytes) | SHA-256 | Fecha | Cita |
|---|---|---|---|---|---|---|
| `A3_9regions-lonlat-simplified.zip` | https://doi.org/10.5066/P1MEQ6UK | Contornos de las 9 regiones de 2024 (GeoJSON/shapefile, lon/lat sobre la esfera Moon 2000, R = 1 737 400 m) | 637,136 | `a0ca63acc829f8e8188bc90217512a81ce4f09c88126ec45efb74be560091b42` | 2026-10-21 | McClernan, M. T., 2024, Down Selected Artemis III Candidate Landing Site Navigational Grids, USGS data release |
| `Connecting_Ridge.zip` | https://doi.org/10.5066/P13FD9ZD | Rejilla LGRS de 1 km de Connecting Ridge (proyección polar LPS de USGS); su unión da la huella de la región | 83,294,903 | `6f8b6bf9da77745acd938b5439a15771c17107bd3af6b1654f0bb2420aca07a6` | 2026-10-21 | McClernan, M. T., 2024, LGRS Artemis III Candidate Landing Site Navigational Grids in ACC Format, USGS data release |

El humano descargó también los zips de las demás regiones y el XML de metadatos `Publication_Data_Release_LGRS3.xml`; no se usan por ahora, así que no se registran.

## Otras fuentes (trayectoria real, nomenclatura, cohete)

| Uso | Fuente | URL | Licencia | Fecha |
|---|---|---|---|---|
| Rasgos con nombre cerca de los sitios (T2.3.b) y centro de Shackleton para el control (T1.3.d) | IAU/USGS Gazetteer of Planetary Nomenclature (9 202 rasgos de la Luna; coordenadas «Planetographic, +East») | https://planetarynames.wr.usgs.gov/SearchResults?Target=16_Moon | Datos públicos de USGS/IAU; se cita el Feature ID de cada rasgo | 2026-10-21 (extracto versionado en `pipeline/feature_sources.json`) |
