# PolePlanner · Validación contra JPL Horizons

Spec 4.1 («validación contra una fuente de referencia documentada»), 5.7 y 10 (T1.1, T5.3).
Este documento empieza en T1.1.a (método y referencias) y se completa en T1.1.d (tabla de errores), T2.1.c (fase lunar) y T5.3.a (versión final).

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

## 3. Comparación (pendiente: T1.1.d)

Tabla de errores de PolePlanner frente a Horizons, con ≥ 5 instantes × 2 sitios para el Sol y la Tierra (objetivo < 0.05°).
