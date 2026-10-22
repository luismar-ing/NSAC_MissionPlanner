# PolePlanner · Validación contra JPL Horizons

Spec 4.1 («validación contra una fuente de referencia documentada»), 5.7 y 10 (T1.1, T5.3).
Este documento empieza en T1.1.a (método y referencias) y se completa en T1.1.d (tabla de errores), T2.1.c (fase lunar) y T5.3.a (versión final).

## 0. Resumen (T5.3.a)

<!-- validation_summary:start (generado por pipeline/tests/test_vs_horizons.py; no editar a mano) -->
Generado el 2026-10-22 con `python -m pytest pipeline/tests/test_vs_horizons.py -v` (la fase lunar, con `pipeline/tests/test_scene.py`).

**Referencia:** JPL Horizons (API `https://ssd.jpl.nasa.gov/api/horizons.api`), efemérides DE441. Consultas hechas el 2026-10-21 (2026-10-21T17:20:56Z a 2026-10-21T17:21:00Z); respuestas crudas en `pipeline/tests/reference/` (`python -m pipeline.horizons_fetch --check` las relee sin red).

**PolePlanner:** SPICE (spiceypy), marco lunar MOON_ME, corrección LT+S, h_obs = 3 m (D12), altura de los sitios sobre la esfera de 1737,4 km.

| Kernel | Función | sha256 (recalculado) | Frente a `data/README.md` |
|---|---|---|---|
| `naif0012.tls` | LSK (segundos intercalares) | `678e32bdb5a74411…` | ✓ coincide |
| `pck00011.tpc` | PCK de texto (constantes, radios, IAU_EARTH) | `3dff7b1dbeceaa01…` | ✓ coincide |
| `de440s.bsp` | SPK planetario DE440 | `c1c7feeab882263f…` | ✓ coincide |
| `moon_pa_de440_200625.bpc` | PCK binario de orientación lunar (DE440) | `60cd55aa401ea2ea…` | ✓ coincide |
| `moon_de440_250416.tf` | FK lunar (MOON_ME / MOON_PA) | `a47c71e9c9f33796…` | ✓ coincide |

| Comprobación | Criterio | Resultado |
|---|---|---|
| Az/el del Sol y de la Tierra frente a Horizons: 5 sitios × 2 objetivos × 7 instantes de 2027 (§3) | < 0.05° (spec); < 1″ (prueba) | peor **0.0016″** (4.6e-07°) ✓ |
| Control negativo: marco equivocado (MOON_PA) | la prueba debe detectarlo (> 10″) | 101.6″ ✓ |
| Fase lunar y dirección del Sol de la escena frente a Horizons, 5 fechas (§4) | < 0.5 puntos de fracción iluminada; < 0.1° | peor diferencia de fracción iluminada **0.134 puntos** (criterio < 0.5); dirección del Sol **0.000000°** (criterio < 0.1°); posición de la Luna **0.07 km**. ✓ |
| Fase lunar en la imagen renderizada (§5, T4.4.c) | coherente con la geometría dibujada | ≤ 0.21 puntos frente al trazado de rayos; ≤ 1 punto frente a Horizons por la Luna ×6 (D8) ✓ |
| Escena 3D frente a las series 2D: elevación de la Tierra y del Sol en cada sitio (`web/tests/skycheck.test.ts`) | mismos ángulos | ≤ 0.005° (Tierra), ≤ 0.031° (Sol) ✓ |

**Sanity checks de 5.7** sobre los datos publicados (`web/public/data/`, año completo cada 30 min), con los límites de elevación corregidos por latitud (§2):

| Sitio | max \|el Sol\| ≤ límite | max \|el Tierra\| ≤ límite | Tierra: franja de azimut | max \|máscara del horizonte\| | Sol en el año | Banderas 0/1 y ventanas en rango |
|---|---|---|---|---|---|---|
| connecting_ridge | 2.09° ≤ 2.16° ✓ | 7.55° ≤ 8.06° ✓ | 15.4° < 40° ✓ | 3.85° < 10° ✓ | 95.1 % | ✓ |
| haworth | 5.15° ≤ 5.24° ✓ | 10.07° ≤ 11.14° ✓ | 15.1° < 40° ✓ | 3.59° < 10° ✓ | 78.6 % | ✓ |
| nobile_rim_1 | 6.31° ≤ 6.37° ✓ | 10.04° ≤ 12.27° ✓ | 16.1° < 40° ✓ | 3.76° < 10° ✓ | 71.1 % | ✓ |
| malapert_massif | 5.54° ≤ 5.61° ✓ | 10.54° ≤ 11.51° ✓ | 15.5° < 40° ✓ | 3.08° < 10° ✓ | 76.5 % | ✓ |
| de_gerlache_rim_2 | 2.92° ≤ 3.01° ✓ | 7.27° ≤ 8.91° ✓ | 15.1° < 40° ✓ | 3.51° < 10° ✓ | 87.8 % | ✓ |

Control negativo de 5.7 (fondo del cráter Shackleton, permanentemente en sombra): Sol el **0.00 %** del año, frente a ≥ 71.1 % en los sitios de cresta ✓ (salida intermedia del pipeline, `pipeline/out/`).
<!-- validation_summary:end -->

## 1. Método (T1.1.a, 2026-10-21)

**Fuente:** JPL Horizons, API `https://ssd.jpl.nasa.gov/api/horizons.api` (documentación: https://ssd-api.jpl.nasa.gov/doc/horizons.html). Respuestas crudas guardadas en `pipeline/tests/reference/horizons_{sitio}_{sol|earth}.txt`, cada una precedida de sus parámetros exactos. Se regeneran con `python -m pipeline.horizons_fetch` (y `--check` para releerlas sin red).

**Consulta** (una por sitio y objetivo):

| Parámetro | Valor | Motivo |
|---|---|---|
| `COMMAND` | `10` (Sol), `399` (Tierra) | objetivos de 5.1 |
| `EPHEM_TYPE` | `OBSERVER` | az/el topocéntricos |
| `CENTER` | `coord@301` | punto definido por el usuario sobre la Luna |
| `COORD_TYPE` / `SITE_COORD` | `GEODETIC` / `lon_E, lat, alt_km` | coordenadas de `pipeline/sites.json` |
| altitud | `(elevation_m + h_obs) / 1000` km | Horizons usa para la Luna una esfera de 1737.4 km («Center radii: 1737.4, 1737.4, 1737.4 km»), la misma referencia que las alturas del DEM LOLA; h_obs = 3 m (D12) |
| `QUANTITIES` | `4` | «Airless apparent azimuth and elevation of target center» |
| `APPARENT` | `AIRLESS` | sin refracción |
| `TIME_TYPE` / `TLIST` | `UT` / 7 instantes de 2027 | 15-ene 06:00, 02-mar 17:30, 20-abr 03:15, 11-jun 12:00, 29-ago 21:45, 17-oct 08:30, 24-dic 23:00 UTC |
| `ANG_FORMAT`, `EXTRA_PREC`, `CSV_FORMAT` | `DEG`, `YES`, `YES` | grados con precisión extra, fácil de parsear |

**Convenciones de Horizons** (copiadas de la cabecera y el pie de las respuestas):
- Marco del sitio: «Center pole/equ: MEAN_ME (high precision)», el marco lunar medio (Tierra media / eje polar). Equivale a nuestro `MOON_ME` (`MOON_ME_DE440_ME421` en el FK). Por eso T1.1.b usará MOON_ME.
- Efemérides: «{source: DE441}». Nuestro SPK es DE440 (`de440s.bsp`). DE440 y DE441 comparten ajuste para la época actual; la diferencia esperada es muy inferior a la tolerancia de 0.05°, y T1.1.d la medirá.
- Azimut: «measured clockwise from north: North(0) → East(90) → South(180) → West(270)». Es la convención de 5.1; no hace falta convertir.
- Elevación: «with respect to a plane perpendicular to the reference surface local zenith direction». Con la esfera, el cenit es radial, igual que el eje U de nuestro ENU.
- Correcciones: «Compensated for light-time, the gravitational deflection of light, stellar aberration, precession and nutation». Equivale a LT+S (spec 5.1) más la deflexión gravitatoria, de orden de miliarcosegundos en esta geometría, despreciable frente a 0.05°.
- Tiempo: UTC; para fechas futuras Horizons usa el último segundo intercalar conocido, igual que nuestro LSK (`naif0012.tls`).

## 2. Hallazgo: el rango ±1.6° de la spec solo vale en el polo exacto

La spec (5.7 y la aceptación de T1.1) dice que la elevación del Sol «debe quedar siempre entre −1.6° y +1.6°». Horizons da valores mayores en los cinco sitios:

```
sitio              colatitud  Sol: max|el|  límite (90−|φ|)+1.6   ±1.6° de la spec
connecting_ridge     0.56°       1.99°           2.16°  OK              excede
haworth              3.64°       5.14°           5.24°  OK              excede
nobile_rim_1         4.77°       4.82°           6.37°  OK              excede
malapert_massif      4.01°       5.04°           5.61°  OK              excede
de_gerlache_rim_2    1.41°       2.58°           3.01°  OK              excede
```

**Explicación:** en el polo, la elevación del Sol es su latitud subsolar (≤ ~1.54°, por la inclinación del eje lunar). En un sitio a latitud φ, el plano del horizonte local está inclinado (90° − |φ|) respecto al plano polar, y a lo largo del día lunar el Sol sube y baja además esa cantidad: |el| ≤ (90° − |φ|) + ~1.6°. Los sitios están a entre 0.56° y 4.77° del polo.

**Criterio usado desde ahora (sustituye al ±1.6° literal de 5.7 y T1.1):**
- Sol: |sun_el| ≤ (90° − |lat|) + 1.6°.
- Tierra: |earth_el| ≤ (90° − |lat|) + 7.5°. Margen = libración en latitud (~6.7°) + paralaje topocéntrica de la Tierra (hasta ~0.26°, por estar el observador a 1737 km del centro lunar) + holgura. En T1.1.a se fijó 7.0°, pero en T1.1.c Connecting Ridge dio −7.545° (límite 7.56°): faltaba la paralaje. Los valores de Horizons cumplen 7.5° (máximo 10.24° en Malapert, cuyo límite es 11.5°).
- El espíritu de 5.7 se mantiene: un valor fuera de estos límites indica un error de marcos o de signos.

Desviación documentada también en `PROGRESS.md` (T1.1.a) y en la guía (T1.1.c, T1.1.e y T1.5.b).

## 3. Comparación (T1.1.d)

Tabla de errores de PolePlanner frente a Horizons, con ≥ 5 instantes × 2 sitios para el Sol y la Tierra (objetivo < 0.05°).

<!-- vs_horizons:start (generado por pipeline/tests/test_vs_horizons.py; no editar a mano) -->
Kernels PolePlanner: naif0012.tls, pck00011.tpc, de440s.bsp, moon_pa_de440_200625.bpc, moon_de440_250416.tf; marco MOON_ME; corrección LT+S; h_obs = 3 m.
Horizons: source: DE441; respuestas en `pipeline/tests/reference/`.

**Resultado:** 70 comparaciones (5 sitios × Sol y Tierra × 7 instantes). Peor separación angular: **0.0016″ = 4.57e-07°** (criterio de la spec: < 0.05° = 180″; criterio estricto de la prueba: < 1″).
Control negativo: con MOON_PA en lugar de MOON_ME el error sube a ~100″, y sin corrección de luz (NONE) a ~21″; la comparación distingue ambos errores.

| Sitio | Objetivo | Instante (UTC) | Horizons az / el (°) | PolePlanner az / el (°) | Δaz·cos(el) (″) | Δel (″) | Separación (″) |
|---|---|---|---|---|---|---|---|
| connecting_ridge | sun | 2027-01-15T06:00:00Z | 226.653549 / +0.354792 | 226.653549 / +0.354792 | +0.0000 | +0.0000 | 0.0000 |
| connecting_ridge | sun | 2027-03-02T17:30:00Z | 21.542657 / -0.081671 | 21.542657 / -0.081671 | -0.0000 | -0.0000 | 0.0000 |
| connecting_ridge | sun | 2027-04-20T03:15:00Z | 151.490293 / -1.987553 | 151.490293 / -1.987553 | -0.0000 | -0.0000 | 0.0000 |
| connecting_ridge | sun | 2027-06-11T12:00:00Z | 231.980890 / -1.580941 | 231.980890 / -1.580941 | +0.0000 | +0.0000 | 0.0000 |
| connecting_ridge | sun | 2027-08-29T21:45:00Z | 341.853132 / +1.202791 | 341.853132 / +1.202791 | -0.0000 | -0.0000 | 0.0000 |
| connecting_ridge | sun | 2027-10-17T08:30:00Z | 110.914101 / +1.308053 | 110.914101 / +1.308053 | -0.0000 | +0.0000 | 0.0000 |
| connecting_ridge | sun | 2027-12-24T23:00:00Z | 356.135122 / +1.323057 | 356.135122 / +1.323057 | -0.0000 | -0.0000 | 0.0000 |
| connecting_ridge | earth | 2027-01-15T06:00:00Z | 129.388958 / +5.024647 | 129.388957 / +5.024647 | -0.0014 | -0.0000 | 0.0014 |
| connecting_ridge | earth | 2027-03-02T17:30:00Z | 138.879913 / -5.152614 | 138.879913 / -5.152615 | -0.0007 | -0.0001 | 0.0007 |
| connecting_ridge | earth | 2027-04-20T03:15:00Z | 141.465333 / -6.529437 | 141.465333 / -6.529436 | -0.0012 | +0.0001 | 0.0012 |
| connecting_ridge | earth | 2027-06-11T12:00:00Z | 142.565828 / -4.799585 | 142.565828 / -4.799585 | -0.0013 | +0.0001 | 0.0013 |
| connecting_ridge | earth | 2027-08-29T21:45:00Z | 136.071457 / -0.619391 | 136.071457 / -0.619391 | -0.0011 | +0.0002 | 0.0011 |
| connecting_ridge | earth | 2027-10-17T08:30:00Z | 132.486192 / +5.879267 | 132.486191 / +5.879267 | -0.0016 | +0.0000 | 0.0016 |
| connecting_ridge | earth | 2027-12-24T23:00:00Z | 142.722853 / -6.731624 | 142.722853 / -6.731624 | -0.0008 | -0.0001 | 0.0008 |
| haworth | sun | 2027-01-15T06:00:00Z | 112.767240 / -0.667730 | 112.767240 / -0.667730 | +0.0000 | -0.0000 | 0.0000 |
| haworth | sun | 2027-03-02T17:30:00Z | 267.694449 / -0.751138 | 267.694449 / -0.751138 | -0.0000 | -0.0000 | 0.0000 |
| haworth | sun | 2027-04-20T03:15:00Z | 37.604002 / +1.386593 | 37.604002 / +1.386593 | -0.0000 | -0.0000 | 0.0000 |
| haworth | sun | 2027-06-11T12:00:00Z | 117.960537 / -2.944060 | 117.960537 / -2.944060 | +0.0000 | -0.0000 | 0.0000 |
| haworth | sun | 2027-08-29T21:45:00Z | 227.989427 / -1.765010 | 227.989427 / -1.765010 | -0.0000 | +0.0000 | 0.0000 |
| haworth | sun | 2027-10-17T08:30:00Z | 356.997807 / +5.139604 | 356.997807 / +5.139604 | -0.0000 | +0.0000 | 0.0000 |
| haworth | sun | 2027-12-24T23:00:00Z | 242.248106 / -0.930439 | 242.248106 / -0.930439 | -0.0000 | -0.0000 | 0.0000 |
| haworth | earth | 2027-01-15T06:00:00Z | 15.581369 / +8.886302 | 15.581368 / +8.886302 | -0.0014 | +0.0000 | 0.0014 |
| haworth | earth | 2027-03-02T17:30:00Z | 24.941734 / -1.434594 | 24.941734 / -1.434594 | -0.0007 | -0.0001 | 0.0007 |
| haworth | earth | 2027-04-20T03:15:00Z | 27.485918 / -2.867735 | 27.485918 / -2.867735 | -0.0012 | +0.0001 | 0.0012 |
| haworth | earth | 2027-06-11T12:00:00Z | 28.623183 / -1.164065 | 28.623182 / -1.164065 | -0.0013 | +0.0001 | 0.0013 |
| haworth | earth | 2027-08-29T21:45:00Z | 22.221927 / +3.151792 | 22.221927 / +3.151792 | -0.0011 | +0.0002 | 0.0011 |
| haworth | earth | 2027-10-17T08:30:00Z | 18.716231 / +9.706074 | 18.716230 / +9.706074 | -0.0016 | +0.0001 | 0.0016 |
| haworth | earth | 2027-12-24T23:00:00Z | 28.731717 / -3.099868 | 28.731717 / -3.099868 | -0.0008 | -0.0001 | 0.0008 |
| nobile_rim_1 | sun | 2027-01-15T06:00:00Z | 53.116299 / +3.607033 | 53.116299 / +3.607033 | +0.0000 | -0.0000 | 0.0000 |
| nobile_rim_1 | sun | 2027-03-02T17:30:00Z | 207.963694 / -4.816783 | 207.963694 / -4.816783 | -0.0000 | +0.0000 | 0.0000 |
| nobile_rim_1 | sun | 2027-04-20T03:15:00Z | 337.790132 / +2.919765 | 337.790132 / +2.919765 | -0.0000 | -0.0000 | 0.0000 |
| nobile_rim_1 | sun | 2027-06-11T12:00:00Z | 58.285510 / +1.271842 | 58.285510 / +1.271842 | +0.0000 | -0.0000 | 0.0000 |
| nobile_rim_1 | sun | 2027-08-29T21:45:00Z | 168.141711 / -3.996248 | 168.141711 / -3.996248 | -0.0000 | +0.0000 | 0.0000 |
| nobile_rim_1 | sun | 2027-10-17T08:30:00Z | 297.022855 / +3.682398 | 297.022855 / +3.682398 | -0.0000 | +0.0000 | 0.0000 |
| nobile_rim_1 | sun | 2027-12-24T23:00:00Z | 182.455715 / -3.999625 | 182.455715 / -3.999625 | -0.0000 | -0.0000 | 0.0000 |
| nobile_rim_1 | earth | 2027-01-15T06:00:00Z | 315.230732 / +8.779962 | 315.230732 / +8.779962 | -0.0014 | -0.0001 | 0.0014 |
| nobile_rim_1 | earth | 2027-03-02T17:30:00Z | 325.344155 / -0.812134 | 325.344155 / -0.812134 | -0.0007 | -0.0002 | 0.0007 |
| nobile_rim_1 | earth | 2027-04-20T03:15:00Z | 327.985329 / -2.053543 | 327.985328 / -2.053543 | -0.0012 | +0.0000 | 0.0012 |
| nobile_rim_1 | earth | 2027-06-11T12:00:00Z | 328.993613 / -0.270850 | 328.993612 / -0.270850 | -0.0013 | +0.0000 | 0.0013 |
| nobile_rim_1 | earth | 2027-08-29T21:45:00Z | 322.287365 / +3.559110 | 322.287365 / +3.559111 | -0.0011 | +0.0001 | 0.0011 |
| nobile_rim_1 | earth | 2027-10-17T08:30:00Z | 318.293404 / +9.832512 | 318.293403 / +9.832512 | -0.0016 | -0.0001 | 0.0016 |
| nobile_rim_1 | earth | 2027-12-24T23:00:00Z | 329.244528 / -2.193573 | 329.244528 / -2.193573 | -0.0008 | -0.0001 | 0.0008 |
| malapert_massif | sun | 2027-01-15T06:00:00Z | 87.556374 / +0.912967 | 87.556374 / +0.912967 | +0.0000 | -0.0000 | 0.0000 |
| malapert_massif | sun | 2027-03-02T17:30:00Z | 242.480037 / -2.460643 | 242.480037 / -2.460643 | -0.0000 | -0.0000 | 0.0000 |
| malapert_massif | sun | 2027-04-20T03:15:00Z | 12.346440 / +2.424476 | 12.346440 / +2.424476 | -0.0000 | -0.0000 | 0.0000 |
| malapert_massif | sun | 2027-06-11T12:00:00Z | 92.717896 / -1.428957 | 92.717896 / -1.428957 | +0.0000 | -0.0000 | 0.0000 |
| malapert_massif | sun | 2027-08-29T21:45:00Z | 202.728949 / -3.031121 | 202.728949 / -3.031121 | -0.0000 | -0.0000 | 0.0000 |
| malapert_massif | sun | 2027-10-17T08:30:00Z | 331.633335 / +5.040400 | 331.633335 / +5.040400 | -0.0000 | +0.0000 | 0.0000 |
| malapert_massif | sun | 2027-12-24T23:00:00Z | 217.012185 / -2.441244 | 217.012185 / -2.441244 | -0.0000 | -0.0000 | 0.0000 |
| malapert_massif | earth | 2027-01-15T06:00:00Z | 350.096696 / +9.334979 | 350.096695 / +9.334979 | -0.0014 | -0.0000 | 0.0014 |
| malapert_massif | earth | 2027-03-02T17:30:00Z | 359.752003 / -0.719663 | 359.752003 / -0.719663 | -0.0007 | -0.0001 | 0.0007 |
| malapert_massif | earth | 2027-04-20T03:15:00Z | 2.332447 / -2.084138 | 2.332447 / -2.084138 | -0.0012 | +0.0001 | 0.0012 |
| malapert_massif | earth | 2027-06-11T12:00:00Z | 3.423826 / -0.350936 | 3.423826 / -0.350936 | -0.0013 | +0.0001 | 0.0013 |
| malapert_massif | earth | 2027-08-29T21:45:00Z | 356.905650 / +3.790600 | 356.905650 / +3.790600 | -0.0011 | +0.0002 | 0.0011 |
| malapert_massif | earth | 2027-10-17T08:30:00Z | 353.210738 / +10.244197 | 353.210737 / +10.244197 | -0.0016 | +0.0000 | 0.0016 |
| malapert_massif | earth | 2027-12-24T23:00:00Z | 3.583400 / -2.283328 | 3.583400 / -2.283328 | -0.0008 | -0.0001 | 0.0008 |
| de_gerlache_rim_2 | sun | 2027-01-15T06:00:00Z | 157.487271 / -0.565232 | 157.487271 / -0.565232 | +0.0000 | +0.0000 | 0.0000 |
| de_gerlache_rim_2 | sun | 2027-03-02T17:30:00Z | 312.375184 / +0.348704 | 312.375184 / +0.348704 | -0.0000 | -0.0000 | 0.0000 |
| de_gerlache_rim_2 | sun | 2027-04-20T03:15:00Z | 82.293215 / -1.305557 | 82.293215 / -1.305557 | -0.0000 | -0.0000 | 0.0000 |
| de_gerlache_rim_2 | sun | 2027-06-11T12:00:00Z | 162.785088 / -2.584867 | 162.785088 / -2.584867 | +0.0000 | -0.0000 | 0.0000 |
| de_gerlache_rim_2 | sun | 2027-08-29T21:45:00Z | 272.667654 / +0.735696 | 272.667654 / +0.735696 | -0.0000 | -0.0000 | 0.0000 |
| de_gerlache_rim_2 | sun | 2027-10-17T08:30:00Z | 41.763643 / +2.562278 | 41.763643 / +2.562278 | -0.0000 | +0.0000 | 0.0000 |
| de_gerlache_rim_2 | sun | 2027-12-24T23:00:00Z | 286.941919 / +1.175328 | 286.941919 / +1.175328 | -0.0000 | -0.0000 | 0.0000 |
| de_gerlache_rim_2 | earth | 2027-01-15T06:00:00Z | 60.305155 / +6.082191 | 60.305154 / +6.082191 | -0.0014 | +0.0000 | 0.0014 |
| de_gerlache_rim_2 | earth | 2027-03-02T17:30:00Z | 69.640978 / -4.239849 | 69.640978 / -4.239849 | -0.0007 | -0.0001 | 0.0007 |
| de_gerlache_rim_2 | earth | 2027-04-20T03:15:00Z | 72.199047 / -5.660566 | 72.199047 / -5.660566 | -0.0012 | +0.0001 | 0.0012 |
| de_gerlache_rim_2 | earth | 2027-06-11T12:00:00Z | 73.328535 / -3.950131 | 73.328535 / -3.950131 | -0.0013 | +0.0001 | 0.0013 |
| de_gerlache_rim_2 | earth | 2027-08-29T21:45:00Z | 66.909084 / +0.338804 | 66.909083 / +0.338804 | -0.0011 | +0.0002 | 0.0011 |
| de_gerlache_rim_2 | earth | 2027-10-17T08:30:00Z | 63.420600 / +6.892315 | 63.420600 / +6.892315 | -0.0016 | +0.0001 | 0.0016 |
| de_gerlache_rim_2 | earth | 2027-12-24T23:00:00Z | 73.450722 / -5.884755 | 73.450722 / -5.884755 | -0.0008 | -0.0001 | 0.0008 |
<!-- vs_horizons:end -->

## 4. Escena: fase lunar y dirección del Sol (T2.1.c)

<!-- vs_scene:start (generado por pipeline/tests/test_scene.py; no editar a mano) -->
Referencia: Horizons desde el geocentro (`500@399`): Luna OBSERVER, cantidades 10 (Illu%) y 24 (S-T-O); vectores ICRF, sin corrección, del Sol y de la Luna. Respuestas en `pipeline/tests/reference/horizons_scene_*.txt`.
La fase de la escena usa la luz en la dirección `sun_dir` (Tierra → Sol) y la Tierra en `−moon_pos`; esa aproximación difiere ≤ 0.15° (paralaje Tierra–Luna) de la geometría vista desde la Luna.

**Resultado:** peor diferencia de fracción iluminada **0.134 puntos** (criterio < 0.5); dirección del Sol **0.000000°** (criterio < 0.1°); posición de la Luna **0.07 km**.

| Instante (UTC) | Iluminada Horizons (%) | Iluminada escena (%) | Δ (puntos) | Fase S-T-O Horizons (°) | Fase escena (°) | Δ dirección del Sol (°) | Δ posición de la Luna (km) |
|---|---|---|---|---|---|---|---|
| 2027-01-15T06:00:00Z | 43.734 | 43.599 | 0.134 | 97.200 | 97.355 | 0.000000 | 0.06 |
| 2027-04-20T03:00:00Z | 99.082 | 99.077 | 0.005 | 10.992 | 11.025 | 0.000000 | 0.07 |
| 2027-07-04T12:00:00Z | 0.249 | 0.247 | 0.002 | 174.282 | 174.300 | 0.000000 | 0.04 |
| 2027-09-30T18:00:00Z | 0.732 | 0.727 | 0.005 | 170.190 | 170.219 | 0.000000 | 0.05 |
| 2027-12-24T23:00:00Z | 8.408 | 8.373 | 0.036 | 146.283 | 146.361 | 0.000000 | 0.04 |
<!-- vs_scene:end -->

## 5. Escena 3D renderizada: fase lunar (T4.4.c, 2026-10-22)

Medida sobre la imagen que dibuja la app (WebGL, navegador, 1297 × 807 px). La cámara se coloca en el centro de la Tierra mirando al centro de la Luna, con un campo de 4° para que el disco ocupe unos 310 px de radio (~300 000 px). Cada instante se dibuja dos veces, con la luz del Sol y sin ella; un píxel del disco cuenta como iluminado si el Sol lo aclara (Δ luminancia > 0). Así se descarta la luz ambiente del lado nocturno.

Como control, se calcula también la fracción exacta de la **esfera dibujada** con un trazado de rayos en la CPU, píxel a píxel, con la misma cámara y la misma dirección de luz. En cada fecha se elige un plan que aterriza después, para que la escena esté en escala espacial (λ = 0, Luna ×6 por D8).

| Instante (UTC) | Horizons (%) | Escena, observador lejano (%) | Esfera ×6 vista desde la Tierra, rayos (%) | **Render ×6 (%)** | Render − rayos (puntos) | Luna a tamaño real: rayos / render (%) | Captura |
|---|---|---|---|---|---|---|---|
| 2027-01-15T06:00:00Z | 43.734 | 43.599 | 43.38 | **43.25** | −0.13 | 43.56 / 43.43 | `docs/img/t44c_phase_2027-01-15.png` |
| 2027-04-20T03:00:00Z | 99.082 | 99.077 | 99.37 | **99.55** | +0.18 | — | `docs/img/t44c_phase_2027-04-20.png` |
| 2027-12-24T23:00:00Z | 8.408 | 8.373 | 7.60 | **7.39** | −0.21 | 8.25 / 8.03 | `docs/img/t44c_phase_2027-12-24.png` |

**Lectura:**
- **La luz de la escena es la de los datos.** La fracción de observador lejano que da la geometría de la escena (dirección de la luz frente a la dirección Luna → cámara) reproduce exactamente la columna «escena» de §4, que está a ≤ 0.135 puntos de Horizons.
- **El render es fiel a lo que dibuja:** queda a ≤ 0.21 puntos del trazado de rayos de la misma esfera. La diferencia viene de los píxeles del terminador, donde el Sol aporta menos de un nivel de 8 bits.
- **La exageración ×6 de D8 explica el resto.** Una Luna 6 veces mayor, vista a distancia finita, deja ver algo menos de un hemisferio (radio angular de 1,6° en lugar de 0,26°). Eso desplaza la fracción visible hasta −0.77 puntos en creciente. A tamaño real el efecto se reduce unas 6 veces (8.25 % frente a 8.37 %) y el render queda a ≤ 0.38 puntos de Horizons.
- Las direcciones y los ángulos de la escena son exactos (§4, T4.1.b). La fase que ve el usuario en la vista 3D difiere de la real como máximo en ~1 punto, y solo por el tamaño exagerado de la Luna. Así lo dice el indicador de escala («Not to scale», «Earth and Moon drawn 6× larger … Moon phase exact»).
