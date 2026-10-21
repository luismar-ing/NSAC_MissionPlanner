# PolePlanner v2.0 · Contrato de datos

**Versión del contrato:** `1.0.0` · Define la sección 7.2 de [SPEC.md](SPEC.md) campo a campo.
Es el acuerdo entre el pipeline (que escribe), la Pista S (que genera datos SYNTHETIC) y el front end (que lee).

Implementaciones que deben coincidir con este documento:
- Python: `pipeline/contract.py` (modelos pydantic) y `pipeline/validate.py` (CLI y comprobaciones cruzadas).
- TypeScript: `web/src/lib/contract.ts` (esquemas zod y tipos).
- Fixtures compartidas: `pipeline/tests/fixtures/contract/` (`valid/` e `invalid/`).

Un cambio incompatible sube la versión mayor de `contract_version` y obliga a actualizar las tres piezas en el mismo commit.

## 1. Convenciones generales

| Tema | Regla |
|---|---|
| Codificación | JSON UTF-8. Sin `NaN` ni `Infinity` (no son JSON válido); un valor ausente es `null` solo donde se permite. |
| Tiempo | Todo en UTC. Instantes: ISO 8601 con `Z` y segundos, `YYYY-MM-DDTHH:MM:SSZ`. Días: `YYYY-MM-DD`. |
| Ángulos | Grados. Azimut desde el Norte local hacia el Este, en `[0, 360)`. Elevación sobre el plano horizontal local, en `[-90, 90]` (spec 5.1). |
| Coordenadas del sitio | Latitud planetocéntrica en `[-90, 90]`; longitud este positiva en `[-180, 180)`. Si la fuente usa otra convención, se convierte y se documenta en `source`. |
| Distancias | km en el espacio (`_km`), m en el terreno y alturas (`_m`). |
| Duraciones | Horas (`_h`), minutos (`_min`), días (`_days`), segundos (`_s`). |
| Porcentajes | `_pct` en `[0, 100]`. |
| Puntuación | `score` en `[0, 1]`. |
| Banderas | Enteros `0` o `1`. |
| Ids de sitio | slug `^[a-z0-9_]+$` (p. ej. `malapert`). Los SYNTHETIC empiezan por `syn_`. |
| Ids de plan | `{site_id}_{YYYYMMDD}_{L}d` (p. ej. `malapert_20270115_7d`). |
| Ids de trayectoria | `{site_id}_{YYYYMMDD}` (D6: una por sitio y día de llegada, compartida por las tres L). |
| Llegada | `arrival_utc` = 00:00:00Z del día de llegada. Es el inicio del tiempo en superficie (t0 de 5.5 y 5.8). |
| Ventana | Intervalo semiabierto `[t0, t0 + L días)`. |
| Rutas | Relativas a la raíz de datos (`web/public/data/` o `web/public/data_synthetic/`). `{site}` es el `site_id`. |
| Redondeo | Floats con la precisión útil: ángulos 3 decimales, horas y porcentajes 2, km 1, m 1. |

## 2. Rangos de fechas

Tres rangos, todos en `manifest.json` (sección 3):

- **Llegadas** `[arrival_start, arrival_end]`: un día por fila del calendario. Con D4: 2027-01-01 a 2027-12-31 (365 días).
- **Series del sitio** `[timeseries_start, timeseries_end)`: desde `arrival_start` hasta `arrival_end` + 1 día + `max(window_days)` días, para que todas las llegadas tengan su ventana completa en las tres L.
- **Escena** `[scene_start, scene_end)`: desde `arrival_start − transit_days − 1 día` hasta `timeseries_end`, para cubrir despegue, tránsito y estancia.

## 3. `manifest.json`

Se lee primero. Describe todo lo demás.

| Campo | Tipo | Regla |
|---|---|---|
| `contract_version` | string | Semver. Esta versión: `"1.0.0"`. |
| `data_version` | string | Identificador de la generación (p. ej. hash corto de git + fecha). |
| `generated_utc` | instante | Momento de la generación. |
| `data_status` | `"REAL"` \| `"SYNTHETIC"` | **Extensión de 7.2** (regla 1): con `"SYNTHETIC"` la interfaz muestra siempre el aviso SYNTHETIC DATA. |
| `date_range.arrival_start` | día | Primer día de llegada. |
| `date_range.arrival_end` | día | Último día de llegada (incluido). |
| `date_range.timeseries_start_utc` | instante | Inicio de las series. |
| `date_range.timeseries_end_utc` | instante | Fin (excluido) de las series. |
| `date_range.scene_start_utc` | instante | Inicio de la escena. |
| `date_range.scene_end_utc` | instante | Fin (excluido) de la escena. |
| `params.step_min` | int | Paso de las series (30 por defecto, 10 opcional; spec 5.1). |
| `params.h_obs_m` | number > 0 | Altura del observador (D12: 3). |
| `params.antenna_margin_deg` | number ≥ 0 | Margen de antena (D12: 0.5). |
| `params.sun_criterion` | `"upper_limb"` \| `"disk_fraction"` | Criterio de Sol de 5.3. |
| `params.sun_radius_deg` | number | Radio angular del Sol usado (0.265). |
| `params.sun_fraction_threshold` | number \| null | Umbral si el criterio es `disk_fraction` (0.5); `null` si no. |
| `params.horizon.az_step_deg` | number | Paso de azimut de las máscaras (1). |
| `params.horizon.r_max_km` | number | Alcance del trazado de rayos (100). |
| `params.horizon.clip_negative` | bool | `true` si la máscara se recorta con `max(0, ·)` (5.2, paso 3). |
| `params.window_days` | int[] | `[3, 7, 14]`. |
| `params.transit_days` | number | Días de tránsito por defecto (D5: 3). |
| `params.score_weights` | `{w1, w2, w3}` | Pesos de 5.6 (0.4, 0.3, 0.3). |
| `params.trajectory_mode` | `"REAL"` \| `"ILLUSTRATIVE"` | Modo de todas las trayectorias (D5: ILLUSTRATIVE). |
| `params.scale_mode` | string | Identificador del modo de escala 3D (D8; p. ej. `"exaggerated_bodies_compressed_distances"`). |
| `params.moon_frame` | string | Marco lunar fijo usado: `"MOON_ME"` o `"MOON_PA"` (5.1). |
| `params.scene_frame` | string | Marco común de la escena (sección 11). |
| `params.spice_kernels` | string[] | Nombres exactos de los kernels cargados (vacío en SYNTHETIC). |
| `params.dem_product` | string \| null | Producto DEM usado (`null` en SYNTHETIC). |
| `sites` | string[] | `site_id` de todos los sitios, en el orden de `sites.json`. |
| `files` | objeto \| ausente | Opcional: `{ "<ruta>": { "bytes": int, "sha256": string } }` para comprobar integridad y tamaños (8.7). |

## 4. `sites.json`

Array de sitios (spec 7.2). 4 o 5 en datos reales.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | string | Id de sitio (sección 1). Único. |
| `name` | string | Nombre para la interfaz, en inglés. En SYNTHETIC contiene `"SYNTHETIC"`. |
| `lat` | number | Latitud (sección 1). En datos reales, ≤ −80 (cobertura del DEM). |
| `lon` | number | Longitud (sección 1). |
| `elevation_m` | number | Elevación del DEM en el punto, respecto al radio de referencia del DEM. |
| `source` | string | Cita de la coordenada y del DEM. No vacío. `"SYNTHETIC"` en datos sintéticos. |

## 5. `plans.json`

Array de planes (spec 5.8, 7.2). Con D6: todas las combinaciones sitio × día de llegada × L.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | string | Id de plan (sección 1). Único. |
| `site_id` | string | Existe en `sites.json`. |
| `arrival_utc` | instante | 00:00:00Z de un día dentro del rango de llegadas. |
| `window_days` | int | Uno de `params.window_days`. |
| `transit_days` | number > 0 | Días de tránsito. |
| `launch_utc` | instante | Exactamente `arrival_utc − transit_days`. |
| `trajectory_id` | string | `{site_id}_{YYYYMMDD}` del día de llegada; existe `trajectory/{trajectory_id}.json`. |

## 6. `horizon/{site}.json`

Máscara de horizonte (spec 5.2).

| Campo | Tipo | Regla |
|---|---|---|
| `site_id` | string | Coincide con el nombre del archivo. *Añadido a 7.2.* |
| `az_step_deg` | number | Igual a `params.horizon.az_step_deg` (1). |
| `h_obs_m` | number | Igual a `params.h_obs_m`. |
| `r_max_km` | number | Igual a `params.horizon.r_max_km`. *Añadido a 7.2.* |
| `elev_deg` | number[] | Longitud `360 / az_step_deg` (360). `elev_deg[i]` es la elevación del horizonte en el azimut `i · az_step_deg`. Entre bins se interpola linealmente, con paso de 359° a 0°. Rango `[-90, 90]`; si `clip_negative`, ≥ 0. |

## 7. `timeseries/{site}.json`

Posiciones del Sol y la Tierra y banderas de visibilidad (spec 5.1, 5.3, 5.4).

| Campo | Tipo | Regla |
|---|---|---|
| `site_id` | string | Coincide con el nombre del archivo. *Añadido a 7.2.* |
| `start_utc` | instante | Igual a `date_range.timeseries_start_utc`. |
| `step_min` | int | Igual a `params.step_min`. |
| `n` | int | Número de muestras. *Añadido a 7.2.* `start_utc + n · step_min = timeseries_end_utc`. |
| `angle_scale` | number | Factor de cuantización: ángulo en grados = entero × `angle_scale`. Valor: `0.01` (spec 7.2). *Añadido a 7.2.* |
| `sun_az`, `earth_az` | int[] | Longitud `n`. Azimut cuantizado, en `[0, 36000)`. |
| `sun_el`, `earth_el` | int[] | Longitud `n`. Elevación cuantizada, en `[-9000, 9000]`. |
| `sun_vis`, `earth_vis` | int[] | Longitud `n`. `0` o `1`, según 5.3 y 5.4 con los parámetros del manifiesto. |

La muestra `k` corresponde al instante `start_utc + k · step_min`. Una muestra representa el intervalo `[t_k, t_k + step_min)` al sumar horas.

## 8. `daily/{site}.json`

Agregados por día UTC (spec 5.5, 7.2).

```json
{ "site_id": "malapert", "days": [ { "date": "2027-01-01", "sun_pct": 87.5, "earth_h": 24.0, "longest_dark_h": 3.0, "longest_comm_gap_h": 0.0 } ] }
```

| Campo | Tipo | Regla |
|---|---|---|
| `site_id` | string | Coincide con el nombre del archivo. |
| `days[].date` | día | Consecutivos, desde `arrival_start` y cubriendo todo el rango de las series. |
| `days[].sun_pct` | number | `[0, 100]`: porcentaje del día con Sol visible. |
| `days[].earth_h` | number | `[0, 24]`: horas con Tierra visible. |
| `days[].longest_dark_h` | number | `[0, 24]`: racha más larga sin Sol **dentro del día**. |
| `days[].longest_comm_gap_h` | number | `[0, 24]`: racha más larga sin Tierra **dentro del día**. |

## 9. `windows/{site}_{L}d.json`

Métricas por ventana para cada día de llegada (spec 5.5, 5.6). Un archivo por sitio y L ∈ {3, 7, 14}.

```json
{ "site_id": "malapert", "window_days": 7, "rows": [ { "start": "2027-01-01T00:00:00Z", "sun_pct": 91.2, "longest_dark_h": 14.0, "earth_h_min": 9.5, "earth_h_mean": 15.25, "longest_comm_gap_h": 30.5, "score": 0.82 } ] }
```

| Campo | Tipo | Regla |
|---|---|---|
| `site_id` | string | Coincide con el nombre del archivo. |
| `window_days` | int | Coincide con `L` del nombre del archivo. |
| `rows[].start` | instante | `arrival_utc` de la ventana. Una fila por día de llegada, consecutivas, de `arrival_start` a `arrival_end`. |
| `rows[].sun_pct` | number | `[0, 100]` (5.5 `sun_pct`). |
| `rows[].longest_dark_h` | number | `[0, 24·L]`. Racha continua más larga sin Sol en la ventana (cruza días). |
| `rows[].earth_h_min` | number | `[0, 24]` (5.5 `earth_h_per_day_min`). |
| `rows[].earth_h_mean` | number | `[0, 24]` (5.5 `earth_h_per_day_mean`). |
| `rows[].longest_comm_gap_h` | number | `[0, 24·L]` (5.5). *Añadido a 7.2:* lo necesitan los paneles (8.1) sin recalcular. |
| `rows[].score` | number | `[0, 1]` (5.6), normalizado sobre todas las filas de todos los sitios con la misma L. |

Las restricciones X, Y, Z de 5.6 se evalúan en el front end sobre `sun_pct`, `longest_dark_h` y `earth_h_min`.

## 10. `scene/ephemeris.json`

Muestreo grueso para la escena 3D (spec 5.8, 7.2).

| Campo | Tipo | Regla |
|---|---|---|
| `frame` | string | Marco común con centro en la Tierra. Igual a `params.scene_frame`. Propuesta: `"J2000"` (ejes ecuatoriales inerciales); se confirma en T2.1.a. |
| `start_utc` | instante | Igual a `date_range.scene_start_utc`. |
| `step_min` | int | 60 por defecto. |
| `n` | int | Número de muestras; `start_utc + n · step_min = scene_end_utc`. |
| `moon_pos_km` | `[x,y,z][]` | Longitud `n`. Centro de la Luna respecto al centro de la Tierra, en `frame`. |
| `sun_dir` | `[x,y,z][]` | Longitud `n`. Vector unitario de la Tierra al Sol, en `frame` (norma 1 ± 1e-6). |
| `moon_frame` | string | Igual a `params.moon_frame`. |
| `moon_quat` | `[x,y,z,w][]` | Longitud `n`. Rotación de vectores de `moon_frame` a `frame`. Norma 1 ± 1e-6. |
| `earth_frame` | string | Marco fijo a la Tierra usado (se decide en T2.1.a, según el kernel disponible o la fórmula documentada). |
| `earth_quat` | `[x,y,z,w][]` | Longitud `n`. Rotación de vectores de `earth_frame` a `frame`. Norma 1 ± 1e-6. |

**Cuaterniones:** orden `[x, y, z, w]` (el de three.js). SPICE (`m2q`) devuelve `[w, x, y, z]`: el pipeline reordena. Un vector `v` en el marco origen se lleva a `frame` con `q · v · q⁻¹`. Entre muestras se interpola con slerp (T2.1.b).

## 11. `trajectory/{trajectory_id}.json`

Trayectoria del plan (spec 5.8, 7.2).

| Campo | Tipo | Regla |
|---|---|---|
| `id` | string | Igual al nombre del archivo y al `trajectory_id` de los planes. |
| `site_id` | string | Existe en `sites.json`. |
| `mode` | `"REAL"` \| `"ILLUSTRATIVE"` | Igual a `params.trajectory_mode`. La interfaz etiqueta ILLUSTRATIVE (regla 2). |
| `frame` | string | Igual a `params.scene_frame`. |
| `t0_utc` | instante | Instante de referencia (= `phases.launch_utc`). |
| `t_s` | number[] | Segundos desde `t0_utc`, estrictamente crecientes, empezando en 0. |
| `pos_km` | `[x,y,z][]` | Misma longitud que `t_s`. Posición del vehículo respecto al centro de la Tierra, en `frame`. |
| `phases.launch_utc` | instante | Despegue. Igual a `launch_utc` del plan. |
| `phases.injection_utc` | instante | Inyección translunar. |
| `phases.lunar_arrival_utc` | instante | Inicio de la aproximación a la Luna. |
| `phases.landing_utc` | instante | Aterrizaje = `arrival_utc` del plan = último instante de `t_s`. |

**Desviación de 7.2:** 7.2 dice `t_utc: []`. Se usa `t0_utc` + `t_s` (segundos) porque con D6 hay ~1 825 trayectorias y las cadenas ISO multiplicarían el tamaño (8.7, D13). El significado es el mismo: `t_utc[k] = t0_utc + t_s[k]`.

Orden de fases: `launch_utc ≤ injection_utc ≤ lunar_arrival_utc ≤ landing_utc`, todas dentro de `[t0_utc, t0_utc + t_s[-1]]`.

## 12. `site_features/{site}.json`

Atributos de 5.10 con su fuente. Las métricas de ventana (sun_pct, horas por día, enlace) no se repiten aquí: el panel del sitio (8.6) las lee de `windows/` y `daily/`.

```json
{
  "site_id": "malapert",
  "attributes": [
    { "key": "slope_mean_deg", "label": "Mean slope", "value": 4.2, "unit": "deg", "status": "available", "source": "LOLA DEM ...", "method": "Gradient within 1 km radius" },
    { "key": "nearest_named_crater", "label": "Nearest named crater", "value": null, "unit": null, "status": "not available", "source": null, "method": null }
  ],
  "nearby_features": [
    { "name": "...", "type": "crater", "lat": -85.0, "lon": 0.0, "distance_km": 12.3, "source": "..." }
  ]
}
```

| Campo | Tipo | Regla |
|---|---|---|
| `attributes[].key` | string | Único en el archivo. Claves esperadas: `lat`, `lon`, `elevation_m`, `slope_mean_deg`, `slope_max_deg`, `slope_radius_m` (D10). |
| `attributes[].label` | string | Texto en inglés para la interfaz. |
| `attributes[].value` | number \| string \| null | `null` si y solo si `status = "not available"`. |
| `attributes[].unit` | string \| null | Unidad mostrada. |
| `attributes[].status` | `"available"` \| `"not available"` | Regla 1 y 5.10: nunca se rellena un valor sin fuente. |
| `attributes[].source` | string \| null | Obligatorio y no vacío si `available`. |
| `attributes[].method` | string \| null | Cómo se calculó (para el tooltip de 8.6). |
| `nearby_features[]` | objeto[] | Puede estar vacío. Cada rasgo: `name`, `type` (`"crater"`, `"ridge"`, `"massif"`, `"other"`), `lat`, `lon`, `distance_km` ≥ 0 y `source` no vacío. |

## 13. `terrain/{site}/lod{n}.json` + `lod{n}.bin`

Terreno por niveles de detalle (spec 5.9, 8.3). Cabecera JSON + alturas binarias. `n = 0` es el más grueso.
El contexto polar de baja resolución (T2.3.e) usa la misma estructura en `terrain/_polar/lod0.*`.

| Campo | Tipo | Regla |
|---|---|---|
| `site_id` | string | Sitio, o `"_polar"` para el contexto polar. |
| `lod` | int ≥ 0 | Igual a `n` del nombre. |
| `frame` | `"ENU_SITE"` \| `"POLAR_STEREO"` | `ENU_SITE`: metros en el plano local del sitio (x = Este, y = Norte), origen en el sitio. `POLAR_STEREO`: metros en la proyección del DEM (parámetros en `projection`). |
| `origin` | `{lat, lon, elevation_m}` | Punto de origen. |
| `projection` | string \| null | Definición del CRS si `frame = POLAR_STEREO`; `null` si no. |
| `grid.nx`, `grid.ny` | int ≥ 2 | Columnas y filas. |
| `grid.spacing_m` | number > 0 | Distancia entre nodos. |
| `grid.x0_m`, `grid.y0_m` | number | Coordenadas del nodo de la fila 0, columna 0 (esquina noroeste: x mínima, y máxima). |
| `height_encoding` | `"int16"` | Enteros con signo de 16 bits, little-endian. |
| `height_scale_m`, `height_offset_m` | number | Altura (m, respecto a `origin.elevation_m`) = entero × escala + offset. |
| `bin_file` | string | Nombre del binario (`lod{n}.bin`), en la misma carpeta. |
| `byte_length` | int | Igual a `nx · ny · 2` y al tamaño real del binario. |

Los nodos van fila a fila (row-major), de norte a sur y, en cada fila, de oeste a este.

## 14. Comprobaciones entre archivos

`python -m pipeline.validate <dir>` y el cargador del front end aplican:

1. `manifest.json` existe, su `contract_version` tiene la misma versión mayor que el código, y `sites` coincide con los `id` de `sites.json`.
2. Para cada sitio existen `horizon/`, `timeseries/`, `daily/`, `site_features/` y un `windows/{site}_{L}d.json` por cada L de `params.window_days`.
3. Los `site_id` internos coinciden con el nombre del archivo.
4. Series: todos los arrays miden `n`; `start_utc` y el fin cuadran con `date_range`; `step_min` coincide con el manifiesto.
5. Horizonte: longitud de `elev_deg` = `360 / az_step_deg`; `h_obs_m` y `r_max_km` coinciden con el manifiesto; sin negativos si `clip_negative`.
6. `daily`: días consecutivos cubriendo las series.
7. `windows`: una fila por día de llegada, consecutivas, de `arrival_start` a `arrival_end`.
8. Planes: ids únicos; `site_id` existe; `launch_utc = arrival_utc − transit_days`; `window_days` en `params.window_days`; el archivo de `trajectory_id` existe; con D6, número de planes = sitios × días de llegada × número de L.
9. Trayectorias: `mode` coincide con `params.trajectory_mode`; `phases.launch_utc` y `phases.landing_utc` coinciden con `launch_utc` y `arrival_utc` de sus planes; `t_s` estrictamente creciente.
10. Escena: arrays de longitud `n`; vectores y cuaterniones normalizados; el rango cubre desde el primer despegue hasta el final de las series.
11. Terreno: `byte_length` = `nx · ny · 2` = tamaño del binario.
12. `data_status = "SYNTHETIC"` ⇒ todos los `name` de sitios contienen `"SYNTHETIC"` y su `source` es `"SYNTHETIC"`. `data_status = "REAL"` ⇒ ningún sitio es `syn_*` y `params.spice_kernels` no está vacío.

Las comprobaciones científicas (rangos de 5.7, comparación con Horizons) no son parte del contrato: viven en `pipeline/tests/test_sanity.py` y `test_vs_horizons.py`.

## 15. Desviaciones y añadidos respecto a 7.2

| Cambio | Motivo |
|---|---|
| `manifest.data_status` | Regla 1: la interfaz debe poder avisar siempre de los datos SYNTHETIC. |
| `site_id` dentro de horizon, timeseries, daily, windows, site_features y terrain | Comprobación cruzada sin depender del nombre del archivo. |
| `horizon.r_max_km` | Hace explícito el parámetro de 5.2. |
| `timeseries.n` y `timeseries.angle_scale` | Validar longitudes y hacer explícita la cuantización a 0.01° que permite 7.2. |
| `windows.rows[].longest_comm_gap_h` | Métrica de 5.5 que muestran los paneles (8.1). |
| `trajectory.t0_utc` + `t_s` en lugar de `t_utc` | Tamaño (D6, D13); misma información. |
| `trajectory.site_id`, `phases.*` con nombres fijos | Las «marcas de fase» de 7.2: despegue, inyección, llegada (`lunar_arrival_utc`) y aterrizaje (`landing_utc`). |
| Marcos `moon_frame`, `earth_frame` y cuaterniones `[x,y,z,w]` | Hace explícitas las convenciones para evitar errores de marco (riesgo de la sección 14). |
| Terreno como cabecera JSON + `int16` | Concreta `lod{n}.*` de 7.2 con un formato compacto. |
