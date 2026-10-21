# PolePlanner v2.0 · Bitácora de progreso

Una entrada por subtarea (o por sesión si no se cerró ninguna), **la más reciente al final**.
Las trayectorias ILLUSTRATIVE, los datos SYNTHETIC y toda desviación de la spec se documentan aquí (reglas 1 a 3).

## Plantilla de entrada

```markdown
## AAAA-MM-DD · T#.#.x · Título corto

- **Tarea:** ID y título de la subtarea (estado final: [x], [!] o [~]).
- **Qué se hizo:** cambios principales y archivos tocados.
- **Cómo se verificó:** comando o prueba ejecutada y su salida real:
  ```
  (salida pegada tal cual, recortada si es larga)
  ```
- **Decisiones tomadas:** decisiones de DECISIONS.md confirmadas o elecciones técnicas documentadas (y su porqué).
- **Desviaciones de la spec / cambios en la guía:** qué y por qué (o «ninguno»).
- **Problemas abiertos:** bloqueos, dudas, deuda técnica.
- **Siguiente tarea:** ID de la siguiente subtarea elegible (o qué la bloquea).
```

---

## 2026-10-20 · SETUP · Sistema de trabajo del agente

- **Tarea:** sesión de arranque (no es una subtarea de la guía). Sin código del producto.
- **Qué se hizo:**
  - `CLAUDE.md`: producto, principio 2D/3D, pila, comandos (casi todos "por definir"), 12 reglas, protocolo de sesión y mapa de archivos.
  - `docs/DEVELOPMENT_GUIDE.md`: 108 subtareas de 1 a 3 h (T0.1.a a T7.4.a), con la tarea añadida T0.4 (contrato de datos), la Pista S (datos SYNTHETIC), la tarea añadida T3.5 (paso a datos reales), diagrama Mermaid, ruta crítica, hitos de demo y plan de recorte.
  - `docs/DECISIONS.md`: las 13 decisiones de la sección 13 con su valor propuesto; D2 (inglés) y A1 (entrega 2026-11-13) confirmadas; D1 parcial (3 personas).
  - `.claude/commands/siguiente.md`: comando `/siguiente` con el protocolo.
  - `.gitignore`, `data/README.md` (plantilla vacía de fuentes) y las carpetas vacías de 7.1 con `.gitkeep`.
- **Cómo se verificó:**
  - Script de comprobación de la guía (IDs únicos, campos obligatorios, estimaciones de 1 a 3 h, dependencias existentes y anteriores en el documento, ruta crítica):
    ```
    Subtareas por fase:
      Fase 0:  16 subtareas,  29.0 h
      Fase 1:  21 subtareas,  39.5 h
      Fase S:   3 subtareas,   8.0 h
      Fase 2:  13 subtareas,  27.0 h
      Fase 3:  16 subtareas,  36.5 h
      Fase 4:  13 subtareas,  29.5 h
      Fase 5:  10 subtareas,  18.5 h
      Fase 6:  11 subtareas,  23.0 h
      Fase 7:   5 subtareas,   8.0 h
      TOTAL: 108 subtareas, 219.0 h
    Ruta crítica al MVP (57.0 h, 25 subtareas)
    Horas totales del MVP (cierre de dependencias): 178.0 h en 85 subtareas
    Errores: 0
    ```
  - `grep -cE '^##### \[ \]' docs/DEVELOPMENT_GUIDE.md` → `108`.
  - `wc -l < CLAUDE.md` → `94` (límite: 150).
  - `.gitignore` probado con `git check-ignore -v` sobre archivos de prueba:
    ```
    .gitignore:3:data/*	data/kernels/x.bsp
    .gitignore:23:node_modules/	web/node_modules/x
    .gitignore:7:.venv/	.venv/x
    .gitignore:4:!data/README.md	data/README.md
    ```
    (la última línea es la regla de excepción: `data/README.md` sí se versiona).
- **Decisiones tomadas:** D2 = inglés (interfaz); entrega 2026-11-13. Decisiones de diseño de la guía listadas al final de `docs/DECISIONS.md` (contrato pydantic + zod con fixtures compartidas, `data_status` en el manifiesto, datos SYNTHETIC en `web/public/data_synthetic/`, panel del sitio en la Fase 3).
- **Desviaciones de la spec / cambios en la guía:**
  - Se añade `data_status: "REAL" | "SYNTHETIC"` al manifiesto (extensión de 7.2 para cumplir la regla 1).
  - El panel de características (8.6) se construye en la Fase 3 (T3.4.c) en lugar de en T4.3, para que no se pierda si se recorta el 3D (regla 6).
  - Regla de fases: las subtareas marcadas **Adelantable** pueden empezar antes de cerrar la fase anterior (apoyado en la sección 14); el resto sigue el orden de la sección 10.
  - El bloque T0.4 va antes de T0.2 en el documento porque T0.3.b depende de él.
- **Problemas abiertos:**
  - Decisiones pendientes que bloquean las Fases 0 y 1: D3, D4, D5, D6, D7, D12, D13.
  - D1: faltan habilidades y horas del equipo (el calendario de la guía es provisional).
  - D5: falta saber si la trayectoria es ilustrativa o real; A2: otras decisiones ya tomadas.
  - Esfuerzo estimado del MVP (178 h) alto para 24 días: el plan de recorte se revisa en cada cierre de fase.
- **Siguiente tarea:** T0.1.a (no depende de ninguna decisión). Después, T0.1.b y T0.1.c; T0.4.a espera a D6 y D7.

## 2026-10-21 · DECISIONES · Confirmación de D3, D4, D5, D6, D7, D12 y D13

- **Tarea:** registro de decisiones (no es una subtarea de la guía).
- **Qué se hizo:** el humano aceptó en el chat los valores por defecto de D3, D4, D5 (ilustrativa, `transit_days` = 3 días), D6, D7, D12 y D13. Se marcaron como **confirmada** (2026-10-21) en `docs/DECISIONS.md`, con su respuesta.
- **Cómo se verificó:** estados en `docs/DECISIONS.md` tras la edición:
  ```
  D1 pendiente (parcial) · D2 confirmada (2026-10-20)
  D3, D4, D5, D6, D7 confirmada (2026-10-21)
  D8, D9, D10, D11 pendiente
  D12, D13 confirmada (2026-10-21)
  ```
  Todas las decisiones que citan las subtareas de las Fases 0 y 1 (D2, D3, D4, D5, D6, D7, D12, D13) están confirmadas.
- **Decisiones tomadas:** las 7 anteriores. Consecuencia de D5: T2.2.a se cerrará como «no aplica (D5)» cuando llegue su turno.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** D1 (habilidades y horas del equipo) y A2 (otras decisiones) siguen pendientes, pero no bloquean subtareas. D8, D9, D10 y D11 se necesitan antes de las Fases 2, 4 y 7.
- **Siguiente tarea:** T0.1.a.

## 2026-10-21 · T0.1.a · README.md raíz

- **Tarea:** T0.1.a — README.md raíz ([x]).
- **Qué se hizo:** `README.md` en inglés: qué es (5 puntos), estructura del repositorio, requisitos, tablas de comandos de Pipeline y Front end (marcados TBD salvo crear el venv), sección "What is real and what is not" (SPICE y LOLA reales, trayectorias ILLUSTRATIVE, datos SYNTHETIC) y "Data sources & credits" provisional (NASA/LRO LOLA, NAIF/SPICE, JPL Horizons).
- **Cómo se verificó:**
  ```
  == Carpetas de 7.1 en git:
  .claude/commands       1 archivo(s)
  data                   1 archivo(s)
  pipeline/tests         1 archivo(s)
  web/public/data        1 archivo(s)
  web/src/store          1 archivo(s)
  web/src/views          1 archivo(s)
  web/src/components     1 archivo(s)
  web/src/lib            1 archivo(s)
  web/src/styles         1 archivo(s)
  web/src/scene3d        1 archivo(s)
  web/src/panels2d       1 archivo(s)
  web/tests              1 archivo(s)
  docs                   3 archivo(s)
  == Secciones del README:
  38:## Pipeline
  51:## Front end
  68:## Data sources & credits
  ```
- **Decisiones tomadas:** ninguna nueva.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** los comandos TBD se completan en T0.1.b, T0.1.c y T0.1.d.
- **Siguiente tarea:** T0.1.b.

## 2026-10-21 · T0.1.b · Entorno Python del pipeline con versiones fijadas

- **Tarea:** T0.1.b — Entorno Python del pipeline con versiones fijadas ([x]).
- **Qué se hizo:** `pipeline/requirements.in` (dependencias directas), `pipeline/requirements.txt` (todas fijadas con `==`, de `pip freeze`), `pipeline/__init__.py`, `pyproject.toml` en la raíz solo con la configuración de pytest (`testpaths`, `pythonpath = ["."]`), `pipeline/tests/test_smoke.py` (importa las 8 dependencias y comprueba CSPICE). Venv local en `.venv/` (ignorado por git).
- **Cómo se verificó:** venv nuevo en el scratchpad, instalación desde `requirements.txt` y pytest:
  ```
  pip exit: 0
  .........                                                                [100%]
  9 passed in 1.34s
  ```
  Versiones clave: numpy 2.5.4, spiceypy 8.3.0, rasterio 1.5.2, pyproj 3.8.0, pandas 3.0.6, pydantic 2.14.1, matplotlib 3.11.2, pytest 9.1.1. Todas instalaron desde wheels en Python 3.13 / Windows (no hizo falta alternativa a rasterio).
- **Decisiones tomadas:** pytest se ejecuta desde la raíz con `pythonpath = ["."]`, así los tests importan `pipeline.*`.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** `requirements.txt` se congeló en Windows; incluye `colorama` (dependencia de Windows de click/pytest), que es inofensiva en Linux.
- **Siguiente tarea:** T0.1.c.

## 2026-10-21 · T0.1.c · Esqueleto del front end (Vite + React + TypeScript + Vitest)

- **Tarea:** T0.1.c — Esqueleto del front end ([x]).
- **Qué se hizo:** `web/` escrito a mano (la carpeta ya tenía subcarpetas, y `npm create vite` habría pedido confirmación interactiva): `package.json` con scripts `dev`, `typecheck`, `build` (typecheck + vite build), `preview` y `test` (vitest run); `.npmrc` con `save-exact=true`; `package-lock.json`; `tsconfig.json` estricto; `vite.config.ts` con la configuración de Vitest; `index.html` (`lang="en"`), `src/main.tsx`, `src/App.tsx` (página provisional "PolePlanner" en inglés) y `tests/smoke.test.ts`.
  Versiones exactas: react 19.3.1, react-dom 19.3.1, vite 8.3.5, @vitejs/plugin-react 6.1.2, vitest 5.0.5, typescript 7.0.2, @types/react 19.3.0, @types/react-dom 19.3.0.
- **Cómo se verificó:** con `web/node_modules` borrado antes:
  ```
  ci exit: 0
  typecheck exit: 0
   Test Files  1 passed (1)
        Tests  1 passed (1)
  test exit: 0
  dist/index.html                  0.32 kB │ gzip:  0.23 kB
  dist/assets/index-D35HH_bC.js  219.73 kB │ gzip: 68.68 kB
  ✓ built in 154ms
  build exit: 0
  ```
  Servidor de desarrollo (`npm --prefix web run dev -- --port 5199`):
  ```
  HTTP 200
  <title>PolePlanner</title>
  ```
- **Decisiones tomadas:** D2 aplicada (interfaz en inglés). Zustand, D3, three.js y zod se instalarán en las subtareas que los usen (T0.4.c, T3.1, T3.2, T4.1), para no añadir dependencias sin uso.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** git avisa de conversión LF→CRLF en Windows (`core.autocrlf`); no afecta al funcionamiento.
- **Siguiente tarea:** T0.1.d.

## 2026-10-21 · T0.1.d · Comandos definitivos y prueba desde un clon limpio

- **Tarea:** T0.1.d — Comandos definitivos y prueba desde un clon limpio ([x]).
- **Qué se hizo:** la tabla de comandos de `CLAUDE.md` y las tablas de `README.md` marcan como disponibles la instalación y los tests del pipeline y todos los comandos del front end. Siguen "por definir"/TBD los comandos que crean tareas futuras (`fetch_data`, `validate`, `synthetic`, `build_all`). El README indica que todo se ejecuta desde la raíz.
- **Cómo se verificó:** `git clone` del repositorio (HEAD 6986915) a una carpeta temporal y ejecución desde cero:
  ```
  clone: 6986915 T0.1.c: esqueleto del front end con Vite, React, TypeScript y Vitest
  pip install exit: 0
  9 passed in 1.70s
  found 0 vulnerabilities
  typecheck exit: 0
        Tests  1 passed (1)
  ✓ built in 185ms
  build exit: 0
  ```
- **Decisiones tomadas:** ninguna nueva.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** ninguno. T0.1 completa.
- **Siguiente tarea:** T0.4.a.

## 2026-10-21 · T0.4.a · docs/DATA_CONTRACT.md

- **Tarea:** T0.4.a — docs/DATA_CONTRACT.md ([x]).
- **Qué se hizo:** contrato de datos v1.0.0: convenciones (UTC, ISO 8601 con `Z`, azimut N→E en [0, 360), latitud planetocéntrica y longitud este en [-180, 180), ids de sitio, plan y trayectoria), los tres rangos de fechas (llegadas, series, escena), `manifest.json` con todos los parámetros de 7.2 más `data_status`, una sección por cada archivo de 7.2 con tipo, unidad, rango y obligatoriedad, convención de cuaterniones `[x, y, z, w]`, formato del terreno (cabecera JSON + int16), 12 comprobaciones entre archivos y la tabla de desviaciones respecto a 7.2.
- **Cómo se verificó:**
  ```
  manifest.json                      ## 3. `manifest.json`
  sites.json                         ## 4. `sites.json`
  plans.json                         ## 5. `plans.json`
  horizon/{site}.json                ## 6. `horizon/{site}.json`
  timeseries/{site}.json             ## 7. `timeseries/{site}.json`
  daily/{site}.json                  ## 8. `daily/{site}.json`
  windows/{site}_{L}d.json           ## 9. `windows/{site}_{L}d.json`
  scene/ephemeris.json               ## 10. `scene/ephemeris.json`
  trajectory/{trajectory_id}.json    ## 11. `trajectory/{trajectory_id}.json`
  site_features/{site}.json          ## 12. `site_features/{site}.json`
  terrain/{site}/lod{n}              ## 13. `terrain/{site}/lod{n}.json` + `lod{n}.bin`
  == Campos de 7.2 (faltan):
    ninguno (36 campos encontrados)
  ```
- **Decisiones tomadas (técnicas, documentadas en el contrato):**
  - `arrival_utc` = 00:00:00Z del día de llegada; ventana semiabierta `[t0, t0 + L días)`.
  - Las series cubren las llegadas + 1 día + 14 días, para que las 365 llegadas tengan ventana completa en las tres L (con D6: 5 × 365 × 3 = 5 475 planes).
  - Series cuantizadas a enteros de 0.01° (`angle_scale`), como permite 7.2.
  - `score` normalizado sobre todas las filas de todos los sitios con la misma L.
  - `trajectory_id` = `{site_id}_{YYYYMMDD}` (D6).
  - Marco de escena propuesto: J2000 con centro en la Tierra (se confirma en T2.1.a).
- **Desviaciones de la spec / cambios en la guía:** añadidos y cambios respecto a 7.2 listados en la sección 15 del contrato. El único cambio de forma es `trajectory.t0_utc` + `t_s` (segundos) en lugar de `t_utc`, por tamaño (D6, D13); la información es la misma.
- **Problemas abiertos:** `params.scale_mode` depende de D8 (pendiente); el contrato solo exige un string.
- **Siguiente tarea:** T0.4.b.

## 2026-10-21 · T0.4.b · Validación en Python

- **Tarea:** T0.4.b — Validación en Python ([x]).
- **Qué se hizo:**
  - `pipeline/contract.py`: modelos pydantic v2 (estrictos, `extra="forbid"`) para los 11 tipos de archivo del contrato, con validación de formatos de fecha, rangos, longitudes de arrays (numpy), normas de vectores y cuaterniones, ids derivados y fórmulas (`launch_utc = arrival_utc − transit_days`).
  - `pipeline/validate.py`: CLI `python -m pipeline.validate <dir>` o `--file <archivo> [--kind K]` con las 12 comprobaciones entre archivos de la sección 14 del contrato; código de salida 0/1; salida en UTF-8.
  - `pipeline/tests/fixtures/make_contract_fixtures.py`: generador determinista de fixtures SYNTHETIC: `valid/` (2 sitios, 2 días de llegada, paso de 6 h, 33 archivos) e `invalid/` (un caso por tipo, nombre `{kind}__{caso}.json`).
  - `pipeline/tests/test_contract.py`: 49 pruebas.
- **Cómo se verificó:**
  ```
  $ python -m pytest pipeline/tests/test_contract.py -v
  ...
  49 passed in 1.83s
  $ python -m pipeline.validate pipeline/tests/fixtures/contract/valid
  OK: pipeline/tests/fixtures/contract/valid cumple el contrato 1.0.0     (exit 0)
  ```
  Motivo de rechazo de cada fixture inválida (`python -m pipeline.validate --file ...`, exit 1):
  ```
  daily__pct_out_of_range: days.0.sun_pct: Input should be less than or equal to 100
  horizon__wrong_length: elev_deg tiene 359 valores, se esperaban 360
  manifest__bad_status: data_status: Input should be 'REAL' or 'SYNTHETIC'
  plans__launch_mismatch: launch_utc debe ser arrival_utc - transit_days = 2026-12-29T00:00:00Z
  scene_ephemeris__quat_not_normalized: moon_quat no normalizado (norma fuera de 1 ± 1e-06)
  site_features__available_without_source: elevation_m: un atributo disponible necesita source (regla 1, spec 5.10)
  sites__missing_source: 0.source: Field required
  terrain_header__byte_length: byte_length debe ser nx · ny · 2
  timeseries__length_mismatch: sun_vis tiene 63 valores, se esperaban n = 64
  trajectory__time_not_increasing: t_s debe ser estrictamente creciente
  windows__score_out_of_range: rows.0.score: Input should be less than or equal to 1
  ```
  Suite completa: `58 passed in 4.10s`.
- **Decisiones tomadas:** las fixtures se generan con un script y una prueba comprueba que las versionadas están al día. Las comprobaciones científicas (5.7) quedan fuera del contrato, como dice su sección 14.
- **Desviaciones de la spec / cambios en la guía:** se añadieron `pipeline/tests/__init__.py` y `pipeline/tests/fixtures/__init__.py` para poder ejecutar el generador con `python -m`.
- **Problemas abiertos:** ninguno.
- **Siguiente tarea:** T0.4.c.

## 2026-10-21 · T0.4.c · Tipos TypeScript y validación en el front end

- **Tarea:** T0.4.c — Tipos TypeScript y validación en el front end ([x]).
- **Qué se hizo:**
  - `web/src/lib/contract.ts`: esquemas zod (`strictObject`) de los 11 tipos de archivo, con las mismas reglas que `pipeline/contract.py`, tipos inferidos (`Manifest`, `Plan`, `Timeseries`, ...), registro `SCHEMAS`, `kindForPath` (mismas reglas que en Python) y utilidades de tiempo (`parseInstant`, `parseDay`, `formatInstant`).
  - `web/tests/contract.test.ts`: prueba de paridad sobre las fixtures compartidas de `pipeline/tests/fixtures/contract/`.
  - Dependencias exactas nuevas: `zod` 4.6.7 y `@types/node` 26.6.5 (dev, para leer las fixtures en las pruebas); `tsconfig.json` añade los tipos de Node.
- **Cómo se verificó:**
  ```
  $ npm --prefix web test -- contract
   Test Files  1 passed (1)
        Tests  36 passed (36)
  $ npm --prefix web run typecheck
  typecheck exit: 0
  ```
  Las 23 fixtures válidas se aceptan y las 11 inválidas se rechazan por el mismo motivo que en Python, por ejemplo:
  ```
  plans__launch_mismatch.json: 0: launch_utc must be arrival_utc - transit_days = 2026-12-29T00:00:00Z
  timeseries__length_mismatch.json: : sun_vis has 63 values, expected n = 64
  site_features__available_without_source.json: attributes.0: elevation_m: an available attribute needs a source (rule 1, spec 5.10)
  ```
  Suite completa del front end: `Tests 37 passed (37)`; build correcto.
- **Decisiones tomadas:** los mensajes del front end van en inglés (D2). Las comprobaciones entre archivos se harán en el cargador (T3.1.a), como indica la sección 14 del contrato.
- **Desviaciones de la spec / cambios en la guía:** corrección en T0.4.b (commit 04e28de): `.gitattributes` con `* text=auto eol=lf`. Un clon limpio en Windows extraía las fixtures con CRLF y fallaba `test_committed_fixtures_are_up_to_date`; tras el cambio pasan las 58 pruebas del pipeline en un clon limpio.
- **Problemas abiertos:** diferencia menor e inevitable: en JSON/JS, `3.0` y `3` son el mismo número, así que zod no distingue un entero escrito como float (pydantic estricto sí). No afecta a datos generados por el pipeline.
- **Siguiente tarea:** T0.2.a.

## 2026-10-21 · T0.2.a · Identificar los kernels SPICE (verificación)

- **Tarea:** T0.2.a — Identificar los kernels SPICE ([x]).
- **Qué se hizo:** listados reales del servidor de NAIF (`generic_kernels/`, `lsk/`, `spk/planets/`, `pck/`, `fk/satellites/`, `fk/planets/`) y lectura de `aa_summaries.txt`, `aa_checksums.txt` y los `.cmt`. Tabla en `data/README.md` con 5 kernels: `de440s.bsp`, `naif0012.tls`, `pck00011.tpc`, `moon_pa_de440_200625.bpc` y `moon_de440_250416.tf`. Alternativa ITRF93 para la Tierra documentada, sin descargar.
- **Cómo se verificó:** `curl -I` sobre cada URL:
  ```
  spk/planets/de440s.bsp                 HTTP 200  32726016 bytes
  lsk/naif0012.tls                       HTTP 200  5257 bytes
  pck/pck00011.tpc                       HTTP 200  131226 bytes
  pck/moon_pa_de440_200625.bpc           HTTP 200  12863488 bytes
  fk/satellites/moon_de440_250416.tf     HTTP 200  19478 bytes
  pck/earth_1962_260806_2126_combined.bpc  HTTP 200  31318016 bytes   (alternativa, no se descarga)
  fk/planets/earth_assoc_itrf93.tf       HTTP 200  7522 bytes        (alternativa, no se descarga)
  ```
  Coberturas publicadas: de440s 1849-12-26 a 2150-01-22 (aa_summaries); moon_pa_de440 1549-12-31 a 2650-01-25 (.cmt). Ambas cubren D4 (2027) y su margen. MD5 publicado de de440s: `3917ee56769db332790c751e2168843d`. `cmp naif0012.tls latest_leapseconds.tls` → idénticos.
  FK (`moon_de440_250416.tf`): `MOON_PA → MOON_PA_DE440 (PCK 31008)`, `MOON_ME → MOON_ME_DE440_ME421 (FIXED 31009)`.
- **Decisiones tomadas:** `de440s.bsp` en lugar de `de440.bsp` (mismo modelo DE440, 33 MB frente a 120 MB). Serie DE440 y no DE442, para mantener la coherencia con la orientación lunar publicada. IAU_EARTH (`pck00011.tpc`) para la rotación de la Tierra en la escena, salvo que T2.1.a pida más.
- **Desviaciones de la spec / cambios en la guía:** ninguno (la spec sugiere DE440 «por ejemplo»).
- **Problemas abiertos:** leer `AACLEARANCE_STATEMENT.pdf` de NAIF y resumir las condiciones de uso antes de la entrega (regla 12; se hará en T5.3.b). Total a descargar en T0.2.b: ~45.7 MB.
- **Siguiente tarea:** T0.2.b.

## 2026-10-21 · T0.2.b · Descarga reproducible y meta-kernel

- **Tarea:** T0.2.b — Descarga reproducible y meta-kernel ([x]).
- **Qué se hizo:**
  - `pipeline/data_sources.json`: registro de fuentes (url, ruta en `data/`, tamaño, MD5 publicado, SHA-256).
  - `pipeline/fetch_data.py`: descarga idempotente (solo si falta, vía `.part`) con verificación de tamaño, MD5 publicado y SHA-256. El SHA-256 se registra en la primera descarga y se exige después. Grupos `--kernels`, `--dem`, `--textures`. Solo usa la biblioteca estándar.
  - `pipeline/spice/poleplanner.tm`: meta-kernel con rutas relativas a la raíz (`data/kernels`).
  - `pipeline/tests/test_fetch_data.py`: detecta tamaño, MD5 y SHA-256 alterados.
  - `data/README.md`: SHA-256 y fecha de descarga de los 5 kernels.
- **Cómo se verificó:**
  ```
  === 1ª ejecución
  [de440s] downloaded, checksum registrado: sha256 c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2
  [naif0012] downloaded, checksum registrado: sha256 678e32bdb5a744117a467cd9601cd6b373f0e9bc9bbde1371d5eee39600a039b
  [pck00011] downloaded, checksum registrado: sha256 3dff7b1dbeceaa01f25467767d3fa25816051c85d162d1edf04acb310ee28bb1
  [moon_pa_de440] downloaded, checksum registrado: sha256 60cd55aa401ea2ea97360636f567554bfe4e37bb829f901b4460a455dfaf783f
  [moon_de440_fk] downloaded, checksum registrado: sha256 a47c71e9c9f33796bdafb2c9d69a7ee447b6016ecad80f71cd6f3e479f9cf768
  exit: 0
  === 2ª ejecución
  [de440s] present, checksum OK (kernels/de440s.bsp)
  [naif0012] present, checksum OK (kernels/naif0012.tls)
  [pck00011] present, checksum OK (kernels/pck00011.tpc)
  [moon_pa_de440] present, checksum OK (kernels/moon_pa_de440_200625.bpc)
  [moon_de440_fk] present, checksum OK (kernels/moon_de440_250416.tf)
  exit: 0
  ```
  El MD5 de `de440s.bsp` coincide con el publicado por NAIF (`3917ee56…843d`); si no, `check()` habría dado error. `pytest pipeline/tests/test_fetch_data.py`: `2 passed`. `git status` no muestra `data/kernels/` (ignorado).
- **Decisiones tomadas:** el meta-kernel usa rutas relativas a la raíz, y `spice_utils` (T0.2.c) hará el `furnsh` desde la raíz (SPICE limita la longitud de las rutas y las resuelve respecto al directorio de trabajo).
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** ninguno.
- **Siguiente tarea:** T0.2.c.

## 2026-10-21 · T0.2.c · Carga SPICE y cobertura temporal

- **Tarea:** T0.2.c — Carga SPICE y cobertura temporal ([x]).
- **Qué se hizo:**
  - `pipeline/spice_utils.py`: `load_kernels()` (furnsh del meta-kernel desde la raíz, una sola vez, con error claro si faltan kernels), `utc_to_et`, `spk_coverage`, `pck_coverage`, `covers` y `loaded_kernel_names` (para el manifiesto).
  - `pipeline/config.py` (**archivo añadido**, no estaba en la guía): parámetros confirmados (D4 llegadas 2027-01-01 a 2027-12-31; D5 ILLUSTRATIVE, 3 días; D12 3 m y 0.5°; paso de 30 min; L = 3, 7, 14; pesos del score) y los rangos derivados del contrato §2. Es la única fuente de estos valores para el pipeline.
  - `pipeline/tests/test_spice_load.py`.
- **Cómo se verificó:**
  ```
  $ python -m pytest pipeline/tests/test_spice_load.py -v -s
  Distancia Tierra-Luna en 2027-01-01: 391,499.4 km
  test_earth_moon_distance_is_plausible PASSED
  test_lunar_frame_rotation_is_proper[MOON_ME] PASSED
  test_lunar_frame_rotation_is_proper[MOON_PA] PASSED
  Rango comprobado: 2026-12-28 a 2028-01-15 (ET 851688069 a 884779269)
  test_kernels_cover_the_whole_mission_range PASSED
  4 passed in 0.25s
  ```
  La cobertura se comprobó con `spkcov` para el Sol (10), el baricentro Tierra-Luna (3), la Luna (301) y la Tierra (399) en `de440s.bsp`, y con `pckcov` para MOON_PA_DE440 (31008). El rango cubre desde el primer despegue (2027-01-01 − 3 días − 1 día de margen) hasta el fin de las series (2027-12-31 + 1 + 14 días). Suite completa: `64 passed`.
- **Decisiones tomadas:** las cadenas UTC se pasan a `str2et` como ISO sin sufijo (CSPICE no acepta `...T00:00:00 UTC`; el ISO sin zona se interpreta como UTC).
- **Desviaciones de la spec / cambios en la guía:** se añade `pipeline/config.py`.
- **Problemas abiertos:** ninguno.
- **Siguiente tarea:** T0.2.d.

## 2026-10-21 · T0.2.d · Identificar el producto DEM LOLA del polo sur (verificación)

- **Tarea:** T0.2.d — Identificar el producto DEM LOLA del polo sur ([x]).
- **Qué se hizo:** revisión del listado de productos polares de PGDA (NASA GSFC, producto 90) y de la documentación ODE/PDS; lectura de la cabecera del COG remoto con rasterio (`/vsicurl/`). Elegido `LDEM_80S_40MPP_ADJ.TIF` y registrado en `data/README.md` con proyección, referencia de alturas, tamaño y cita.
- **Cómo se verificó:**
  ```
  === LDEM_80S_40MPP_ADJ.TIF  HTTP 200 716299920 bytes
  === LDEM_80S_80MPP_ADJ.TIF  HTTP 200 189158392 bytes
  driver GTiff | size 15200 x 15200 | dtype ('float32',) | nodata nan
  res (40.0, 40.0) | bounds BoundingBox(left=-304000.0, bottom=-304000.0, right=304000.0, top=304000.0)
  overviews [2, 4, 8, 16, 32] | blocks [(512, 512)]
  band1 tags {'actual_range': '{-7296.54248046875,7026.8134765625}', ...}
  PROJ: +proj=stere +lat_0=-90 +lat_ts=-90 +lon_0=0 +x_0=0 +y_0=0 +R=1737400 +units=m +no_defs=True
  ```
  Referencia de alturas: Barker et al. 2023 («elevation above the reference sphere»; «projection radius of 1737.4 km»; «MOON_ME frame of DE421»). La página ODE GDRDEM indica que HEIGHT es relativa a una esfera de referencia (`OFFSET`).
- **Decisiones tomadas:** DEM de 40 m de PGDA (alternativa de respaldo: el de 80 m). Radio de referencia de las alturas: 1 737 400 m. MOON_ME recomendado para T1.1.b, porque el DEM está en MOON_ME de DE421 y nuestro MOON_ME es `MOON_ME_DE440_ME421`.
- **Desviaciones de la spec / cambios en la guía:** la spec sugiere el PDS Geosciences Node como fuente; se usa PGDA (archivo del equipo LOLA en NASA GSFC, producto más reciente y con DOI). Motivo en `data/README.md`.
- **Problemas abiertos:** la página PGDA no declara una licencia explícita, solo pide citar el artículo. Si hiciera falta, se consulta al humano antes de la entrega.
- **Siguiente tarea:** T0.2.e (descarga de 716 MB).

## 2026-10-21 · T1.2.b · DEM sintético de prueba (cráter conocido) — adelantada

- **Tarea:** T1.2.b — DEM sintético de prueba ([x]). Marcada **Adelantable**. Se hizo mientras se descargaba el DEM real (T0.2.e en curso): T0.2.f tenía que esperar porque `fetch_data` reescribe `data_sources.json` al terminar, y T0.3.a está bloqueada (ver la entrada de T0.3.a).
- **Qué se hizo:**
  - `pipeline/tests/synthetic_dem.py` (SYNTHETIC, solo para pruebas): cráter anular centrado en el observador, de cima plana entre D − w/2 y D + w/2, con altura constante o función del azimut, en el mismo formato que el DEM real (GeoTIFF float32, estereográfica polar sur con R = 1 737 400 m, nodata NaN). Solución analítica `expected_horizon_deg` con la fórmula de 5.2 (`atan2(z − z0 − h_obs − d²/2R, d)`), con y sin recorte.
  - `pipeline/tests/test_synthetic_dem.py` (7 pruebas) y `pipeline/tests/conftest.py` (salida UTF-8 en Windows para las pruebas que imprimen evidencia).
- **Cómo se verificó:**
  ```
  $ python -m pytest pipeline/tests/test_synthetic_dem.py -v -s
  Borde en x ∈ [9850, 10150] m (esperado 10 000 ± 200 m), altura 500 m          PASSED
  test_rim_height_can_vary_with_azimuth                                           PASSED
  test_geotiff_has_the_real_dem_format                                            PASSED
  test_curvature_formula_matches_5_2                                              PASSED
  borde 500 m a 10 km: horizonte = +2.7420° (sin recortar), +2.7420° (recortado)   PASSED
  borde 2 km a 40 km: horizonte = +2.2175° (sin recortar), +2.2175° (recortado)    PASSED
  llano (sin borde): horizonte = -0.1065° (sin recortar), +0.0000° (recortado)     PASSED
  7 passed in 0.54s
  ```
  Comprobación a mano: 500 m de borde con borde interior a 9 800 m → atan((500 − 3 − 27.6)/9 800) = 2.742°. Llano con h_obs = 3 m → −atan(√(2·3/1 737 400)) = −0.1065°, con el máximo en d* = √(2·R·h_obs) ≈ 3.2 km.
- **Decisiones tomadas:** el azimut del DEM sintético se mide sobre la cuadrícula del mapa (0° = +y). La conversión al Norte local real en el polo es trabajo de T1.2.a; para validar el algoritmo basta con que generador y solución usen la misma convención.
- **Desviaciones de la spec / cambios en la guía:** se añade `pipeline/tests/conftest.py`.
- **Problemas abiertos:** ninguno en esta subtarea. Un valor de referencia que calculé a mano (2 878,1 m) estaba mal; el correcto es 2 877,86 m y la prueba lo detectó.
- **Siguiente tarea:** cerrar T0.2.e cuando termine la descarga del DEM.

## 2026-10-21 · T1.3.a · Visibilidad del Sol (borde superior) — adelantada

- **Tarea:** T1.3.a — Visibilidad del Sol ([x]). **Adelantable**; hecha mientras se descarga el DEM.
- **Qué se hizo:** `pipeline/visibility.py` con `horizon_at` (interpolación lineal de la máscara entre bins, con paso circular de 359° a 0°, y error si la máscara no cubre 360°) y `sun_visible` = `(sun_el + 0.265°) > horizon_el[sun_az]` (spec 5.3), que devuelve 0/1 en uint8. Parámetros por defecto tomados de `pipeline/config.py`. Pruebas en `pipeline/tests/test_visibility.py`.
- **Cómo se verificó:**
  ```
  $ python -m pytest pipeline/tests/test_visibility.py -v
  test_upper_limb_just_above_and_below_mask PASSED
  test_centre_below_mask_but_limb_above_is_visible PASSED
  test_azimuth_wraps_between_359_and_0 PASSED
  test_negative_mask PASSED
  test_linear_interpolation_between_bins PASSED
  test_mask_must_cover_360_degrees PASSED
  6 passed in 0.16s
  ```
  Casos límite: el borde a ±1e-6° de la máscara da 1/0, y justo en la máscara da 0 (comparación «>» estricta, como en la spec); azimuts 359.9° y 0.1° interpolan entre los bins 359 y 0; máscara negativa (−0.8°).
- **Decisiones tomadas:** interpolación lineal entre bins (lo documenta el contrato §6). Tocar exactamente la máscara cuenta como no visible.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** ninguno.
- **Siguiente tarea:** T1.3.b (adelantable) o cerrar T0.2.e cuando termine la descarga.

## 2026-10-21 · T1.3.b · Visibilidad de la Tierra con margen de antena — adelantada

- **Tarea:** T1.3.b — Visibilidad de la Tierra con margen de antena ([x]). **Adelantable**.
- **Qué se hizo:** en `pipeline/visibility.py`, `earth_visible` = `earth_el > horizon_el[earth_az] + margen_antena` (centro de la Tierra, margen 0.5° por defecto, D12) y la bandera opcional `earth_partial`. `EARTH_RADIUS_DEG = 0.95` añadido a `pipeline/config.py` (spec 5.4).
- **Cómo se verificó:**
  ```
  $ python -m pytest pipeline/tests/test_visibility.py -v
  test_earth_needs_mask_plus_antenna_margin PASSED
  test_antenna_margin_is_a_parameter[0.0] / [0.5] / [1.0] / [2.0] PASSED
  test_earth_uses_interpolated_mask_across_north PASSED
  test_partial_visibility_when_only_the_limb_clears_the_mask PASSED
  13 passed in 0.14s   (incluye las 6 de T1.3.a)
  ```
- **Decisiones tomadas:** **visibilidad parcial** = sin enlace por el criterio del centro pero con el borde superior de la Tierra (el + 0.95°) sobre la máscara, **sin margen**. Es solo informativa y nunca cuenta como enlace. La spec la deja abierta («cuando solo el borde supera la máscara»). Se mostrará en la interfaz con ese texto.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** el contrato v1 no tiene un campo para la bandera parcial (`timeseries` solo lleva `earth_vis`). Si la interfaz la necesita, se añadirá `earth_partial` como campo opcional (cambio menor del contrato, 1.1.0).
- **Siguiente tarea:** cerrar T0.2.e cuando termine la descarga; mientras, la siguiente adelantable (T1.3.c).

## 2026-10-21 · T1.3.c · Fracción visible del disco solar — adelantada

- **Tarea:** T1.3.c — Fracción visible del disco solar ([x]). **Adelantable**, recortable.
- **Qué se hizo:** en `pipeline/visibility.py`, `sun_disk_fraction`: integra el disco (r = 0.265°) por 41 columnas verticales, evaluando la máscara en el azimut de cada columna, así cuenta una máscara inclinada dentro del disco. `sun_day_from_fraction` aplica el umbral (0.5 por defecto). En `config.py`: `SUN_CRITERION = "upper_limb"` (sigue siendo el criterio por defecto de 5.3) y `SUN_FRACTION_THRESHOLD = 0.5`.
- **Cómo se verificó:**
  ```
  $ python -m pytest pipeline/tests/test_visibility.py -v -s
  test_fraction_0_half_1_on_flat_mask[0.275-1.0] / [0.0-0.5] / [-0.275-0.0] PASSED
  Error máximo frente al segmento circular: 7.04e-04
  Pendiente: fracción 0.4763, exacta 0.4761, modelo plano 0.2656
  test_day_threshold_is_a_parameter PASSED
  19 passed in 0.17s
  ```
- **Decisiones tomadas:** la integración por columnas en lugar de la fórmula del segmento con la máscara del centro: con relieves abruptos la diferencia es grande (0.476 frente a 0.266 en la prueba).
- **Desviaciones de la spec / cambios en la guía:** ninguno. El criterio activo se escribirá en `manifest.params.sun_criterion`.
- **Problemas abiertos:** primera versión de la prueba de pendiente mal planteada (una recta por el centro siempre da 0.5); corregida con una recta desplazada y su solución exacta.
- **Siguiente tarea:** cerrar T0.2.e cuando termine la descarga; mientras, T1.4.a (adelantable).

## 2026-10-21 · T1.4.a · Agregados diarios — adelantada

- **Tarea:** T1.4.a — Agregados diarios ([x]). **Adelantable**.
- **Qué se hizo:** `pipeline/windows.py` con `longest_run` (racha más larga, vectorizada), `samples_per_day` y `daily_aggregates`, que por día UTC calcula `sun_pct`, `earth_h`, `longest_dark_h` y `longest_comm_gap_h` en el formato del contrato §8. Exige series que empiecen a las 00:00Z, con días completos y un paso que divida 1440 min.
- **Cómo se verificó:**
  ```
  $ python -m pytest pipeline/tests/test_windows.py -v
  test_longest_run PASSED
  test_full_sun_and_link PASSED
  test_known_day PASSED                 (Sol 06-18 → 50 %, oscuridad máx 6 h; sin Tierra 02:00-05:30 → 20.5 h, hueco 3.5 h)
  test_dark_streak_crossing_midnight_is_cut_per_day PASSED   (22:00→04:00 da 2 h y 4 h)
  test_step_10_min PASSED
  test_rejects_bad_series[start|partial|step] PASSED
  8 passed in 0.16s
  ```
- **Decisiones tomadas:** las rachas diarias se cortan en la medianoche UTC (contrato §8). Las de ventana (T1.4.b) sí cruzan días.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** ninguno.
- **Siguiente tarea:** cerrar T0.2.e cuando termine la descarga; mientras, T1.4.b (adelantable).

## 2026-10-21 · T1.4.b · Ventanas deslizantes eficientes (L = 3, 7, 14) — adelantada

- **Tarea:** T1.4.b — Ventanas deslizantes ([x]). **Adelantable**.
- **Qué se hizo:** en `pipeline/windows.py`, `window_metrics` calcula para cada día de llegada `sun_pct` (suma acumulada), `earth_h_min` y `earth_h_mean` (horas diarias y ventana deslizante por días), y `longest_dark_h` y `longest_comm_gap_h` (rachas globales recortadas a cada ventana, vectorizado ventanas × rachas, de modo que cruzan días). También `zero_runs` y `longest_run_in_windows`. Opción `ndigits=None` para comparar sin redondeo.
- **Cómo se verificó:**
  ```
  $ python -m pytest pipeline/tests/test_windows.py -v -s
  test_dark_streak_crosses_days_inside_a_window PASSED   (6 h que cruzan medianoche cuentan enteras en la ventana)
  test_streak_is_clipped_to_the_window PASSED
  201 ventanas comparadas con el cálculo ingenuo
  test_matches_naive_on_200_random_windows PASSED        (|diferencia| < 1e-9 en las 5 métricas, L = 3, 7 y 14)
  test_rows_are_daily_from_arrival_start PASSED
  test_rejects_series_too_short PASSED
  14 passed in 0.17s
  ```
- **Decisiones tomadas:** las llegadas empiezan a las 00:00Z de cada día (contrato §1). `earth_h_min` y `earth_h_mean` usan los días UTC completos de la ventana.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** el primer intento comparó solo 159 ventanas (pocas llegadas para L = 14 con 60 días); ahora son 100 días y 201 ventanas.
- **Siguiente tarea:** cerrar T0.2.e cuando termine la descarga; mientras, T1.4.c (adelantable).
