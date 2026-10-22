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

## 2026-10-21 · T1.4.c · Puntuación y restricciones — adelantada

- **Tarea:** T1.4.c — Puntuación y restricciones ([x]). **Adelantable**.
- **Qué se hizo:** en `pipeline/windows.py`, `normalize` (norm de 5.6 sobre el rango observado), `add_scores` (score de 5.6 normalizado sobre todas las filas de todos los sitios para una misma L, pesos de `config.SCORE_WEIGHTS`) y `meets_constraints` (X, Y, Z opcionales, límites incluidos). Servirá de referencia para la paridad con el front end (T3.5.a).
- **Cómo se verificó:**
  ```
  $ python -m pytest pipeline/tests/test_windows.py -v
  test_normalize PASSED
  test_best_and_worst_scores PASSED                         (mejor = 1.0, peor = 0.0, medio = 0.5)
  test_score_in_unit_interval_and_normalized_across_sites PASSED
  test_more_sun_never_lowers_the_score PASSED
  test_weights_need_not_sum_to_one PASSED
  test_constraints_optional_and_inclusive PASSED
  20 passed in 0.21s
  ```
- **Decisiones tomadas (no definidas por la spec):** una métrica con valor constante en todas las filas se normaliza a 0.5 (neutra). El score se divide por w1 + w2 + w3, para que quede en [0, 1] con cualquier peso positivo (con los pesos por defecto, que suman 1, no cambia nada).
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** ninguno.
- **Siguiente tarea:** cerrar T0.2.e (descarga terminada).

## 2026-10-21 · T0.2.e · Descargar el DEM y verificar su lectura

- **Tarea:** T0.2.e — Descargar el DEM y verificar su lectura ([x]).
- **Qué se hizo:** DEM añadido al registro (`pipeline/data_sources.json`, grupo `dem`) y descargado con `fetch_data --dem` (716 299 920 bytes, en segundo plano mientras se hacían T1.2.b, T1.3.a–c y T1.4.a–c). `pipeline/inspect_dem.py` imprime CRS, tamaño, resolución, extensión, rango de alturas (con una muestra 1/8 para no leer 0,9 GB) y el valor junto al polo, y comprueba que coinciden con la cabecera leída en T0.2.d. SHA-256 y fecha en `data/README.md`.
- **Cómo se verificó:**
  ```
  [lola_dem_80s_40m] downloaded, checksum registrado: sha256 b7f3567bfa405dbcb42f867f6cd3c9932ca9752b4363ce1eef835f9115c1dd76
  === 2ª ejecución
  [lola_dem_80s_40m] present, checksum OK (dem/LDEM_80S_40MPP_ADJ.TIF)
  === python -m pipeline.inspect_dem
  CRS (PROJ)  : +proj=stere +lat_0=-90 +lat_ts=-90 +lon_0=0 +x_0=0 +y_0=0 +R=1737400 +units=m +no_defs=True
  Tamaño      : 15200 x 15200 píxeles, 1 banda(s), float32, nodata=nan
  Resolución  : 40.0 x 40.0 m/píxel
  Extensión   : x [-304000, 304000] m, y [-304000, 304000] m
  Alturas     : min -7292.0 m, max 7024.5 m, media -1500.6 m (sobre la esfera de 1737400 m; muestra 1/8, 3,610,000 píxeles)
  Sin datos   : 0.00 % de la muestra
  Polo (0, 0) : 1285.9 m; ventana de 1 km: 1085.7 a 1343.8 m
  OK   (exit 0, 1.4 s)
  ```
  El rango coincide con el `actual_range` de la cabecera (−7 296.5 a +7 026.8 m; la muestra 1/8 no ve los extremos exactos).
- **Decisiones tomadas:** ninguna nueva.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** ninguno.
- **Siguiente tarea:** T0.2.f (texturas).

## 2026-10-21 · T0.2.f · Texturas de la Tierra y la Luna (verificación de licencia)

- **Tarea:** T0.2.f — Texturas ([x]).
- **Qué se hizo:** texturas identificadas en NASA SVS y registradas en `pipeline/data_sources.json` (grupo `textures`) y `data/README.md` (URL, resolución, licencia, crédito, tamaño, SHA-256): Luna `lroc_color_poles_4k.tif` (SVS 4720) y Tierra `flat_earth_Largest_still.0330.jpg` (SVS 3615, Blue Marble NG con nubes). Créditos añadidos al README.
- **Cómo se verificó:**
  ```
  [moon_color_lroc_poles_4k] downloaded, checksum registrado: sha256 918649a7f8ed2f1329b2cd95bb0d25483befdcb60ae1a66db681a637cc21344f
  [earth_bmng_clouds_8k] downloaded, checksum registrado: sha256 5ea6b68a4412421cae11711ae4fec1a7b1f2dbd7265c0c3004d487a03c43be9a
  [moon_color_lroc_poles_4k] present, checksum OK (textures/lroc_color_poles_4k.tif)
  [earth_bmng_clouds_8k] present, checksum OK (textures/flat_earth_Largest_still.0330.jpg)
  data/textures/lroc_color_poles_4k.tif: 4096x2048 modo RGB
    -> prueba web 4096x2048 JPEG q85: 1.55 MB
  data/textures/flat_earth_Largest_still.0330.jpg: 8192x4096 modo RGB
    -> prueba web 4096x2048 JPEG q85: 1.54 MB
  Total texturas web (prueba): 3.09 MB
  ```
  Licencia: la página de ayuda de SVS dice «All of our content is in the public domain (unless otherwise noted)».
- **Decisiones tomadas:** reserva de 10 MB para texturas web dentro de los 50 MB de D13 (la prueba usa 3,1 MB). Versión «poles» de la Luna por el zoom al polo sur. La textura lunar es solo visual («optimized for aesthetics, not science», según SVS).
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** el servidor clásico de Blue Marble (Visible Earth, NEO) ya no publica listados; por eso se usa SVS 3615.
- **Siguiente tarea:** T0.3.a (sitios); ver el bloqueo en la siguiente entrada.

## 2026-10-21 · T0.3.a · Fuentes oficiales de los sitios — BLOQUEADA

- **Tarea:** T0.3.a — Fuentes oficiales de los sitios ([!]).
- **Qué se hizo (investigación):**
  - Los comunicados de NASA (13 regiones en 2022, 9 en octubre de 2024) y SVS 5013 nombran regiones de ~15 × 15 km, pero **no dan coordenadas ni contornos**.
  - Las 9 regiones de 2024: Peak near Cabeus B, Haworth, Malapert Massif, Mons Mouton Plateau, Mons Mouton, Nobile Rim 1, Nobile Rim 2, de Gerlache Rim 2, Slater Plain. Las 13 de 2022 (SVS 5013) incluyen además Connecting Ridge, Connecting Ridge Extended, de Gerlache Rim 1, Peak Near Shackleton, Leibnitz Beta Plateau, Amundsen Rim, Faustini Rim A y de Gerlache-Kocher Massif.
  - **Fuente oficial con geometría:** USGS, «Down Selected Artemis III Candidate Landing Site Navigational Grids» (ScienceBase, item `671a6fa8d34efed5620f89f8`, licencia CC0 según Astropedia), con shapefiles de las 9 regiones de 2024 (LGRS 1 km / 100 m / 10 m, proyecciones LPS/LTM). Astropedia enlaza un segundo item más amplio (`67168797d34ebf903f48b6fc`, LGRS en formato ACC), que podría incluir las regiones de 2022; no se ha podido comprobar.
  - Alternativa verificada para rasgos con nombre (no para puntos de aterrizaje): el nomenclátor IAU/USGS (planetarynames.wr.usgs.gov) responde HTTP 200 para Malapert, Haworth, Nobile, de Gerlache y Shackleton. Servirá en T2.3.b.
- **Bloqueo:** `sciencebase.gov` responde con un desafío anti-bots de Cloudflare (HTTP 403, `__cf_chl_*`) a cualquier petición automática. No se sortea (está prohibido); hace falta la descarga manual.
- **Acción del humano:**
  1. Abrir en el navegador https://www.sciencebase.gov/catalog/item/671a6fa8d34efed5620f89f8 y descargar los archivos adjuntos (zip o shapefiles).
  2. Si es posible, hacer lo mismo con https://www.sciencebase.gov/catalog/item/67168797d34ebf903f48b6fc (por si incluye Connecting Ridge / Shackleton, de 2022).
  3. Dejar los archivos tal cual en `data/regions/` y avisar en el chat. El agente registra URLs y SHA-256 en `data/README.md`.
- **Método propuesto una vez descargados (para confirmar con el humano):** por región, el punto del DEM LOLA de máxima elevación dentro del polígono oficial (los nombres de D3 son bordes, macizos y crestas), documentado en `docs/sites.md`. Nombres concretos propuestos para D3: Connecting Ridge (borde de Shackleton; lista de 2022), Haworth, Nobile Rim 1, Malapert Massif y de Gerlache Rim 2 (2024). Si el item de 2022 no tiene Connecting Ridge, se sustituye por otra región de 2024 (por ejemplo Mons Mouton) o se baja a 4 sitios.
- **Problemas abiertos:** T0.3.b y T0.3.c dependen de esta subtarea, y con ellas el cierre de la Fase 0 y casi toda la Fase 1 (T1.1.a, T1.1.b, T1.2.e y T1.3.d necesitan los sitios).
- **Siguiente tarea:** tras el desbloqueo, T0.3.a → T0.3.b → T0.3.c. Elegibles mientras tanto: la Pista S (TS.1.a–c) y las adelantables de las Fases 1 y 3.

## 2026-10-21 · T0.3.a · Fuentes oficiales de los sitios (verificación) — desbloqueada y cerrada

- **Tarea:** T0.3.a — Fuentes oficiales de los sitios ([x]).
- **Desbloqueo:** el humano descargó a mano los zips de ScienceBase a `data/regions/`. Antes se hizo `git push` de los 23 commits pendientes a `origin/master` (`a5dd822..f0aebb8`), a petición del humano.
- **Qué se hizo:**
  - `docs/sites.md`: fuentes oficiales (dos data releases de USGS, McClernan 2024, con DOI), la región elegida para cada sitio de D3 con su extensión en lat/lon tal como la da la fuente, y el método para elegir el punto: **la cota más alta del DEM LOLA dentro del polígono oficial**, con su motivo y limitaciones.
  - `pipeline/regions.py`: lee los zips tal cual (GeoJSON de las 9 regiones; rejilla LGRS de 1 km para Connecting Ridge, que no está entre las 9) y lo reproyecta todo al CRS del DEM.
  - `pipeline/tests/test_regions.py` (se omite si faltan los zips).
  - `fetch_data.py`: nuevo grupo `regions` y soporte `"manual": true`. Esas fuentes no se descargan: se verifica su SHA-256 o se explica cómo obtenerlas.
  - `data_sources.json` y `data/README.md`: los dos zips usados, con DOI, tamaño, SHA-256 y cita.
  - `pyshp==3.1.6` (MIT) añadido y fijado en `requirements.txt`.
- **Cómo se verificó:**
  ```
  $ python -m pipeline.regions
  Malapert Massif     1 polígono(s)  441.0 km²  lat [-86.326, -85.634]  lon [-5.66, 5.15]
  de Gerlache Rim 2   1 polígono(s)  400.0 km²  lat [-88.660, -87.785]  lon [-77.47, -49.40]
  Nobile Rim 1        1 polígono(s)  400.0 km²  lat [-85.897, -84.975]  lon [31.64, 43.21]
  Haworth             1 polígono(s)  888.0 km²  lat [-87.394, -86.112]  lon [-34.98, -12.36]
  Connecting Ridge  289 polígono(s)  292.5 km²  lat [-89.880, -89.085]  lon [-174.29, -98.97]
  (+ las otras 4 regiones de 2024)
  $ python -m pytest pipeline/tests/test_regions.py -v
  test_nine_regions_area_matches_usgs_attribute PASSED   (área reproyectada = Area_km2 de USGS, ±0.1 %)
  test_connecting_ridge_footprint PASSED
  $ python -m pipeline.fetch_data --regions
  [usgs_a3_9regions] present, checksum OK
  [usgs_connecting_ridge] present, checksum OK          (con el zip retirado: "FALTA ... descarga manual ...", exit 1)
  ```
  Los dos DOI resuelven a los items de ScienceBase de los que se descargaron los archivos (`P1MEQ6UK → 671a6fa8…`, `P13FD9ZD → 67168797…`).
- **Decisiones tomadas:** regiones concretas para D3: Connecting Ridge, Haworth, Nobile Rim 1 (más cerca del polo que Rim 2), Malapert Massif y de Gerlache Rim 2. Método del punto: cota máxima del DEM dentro del polígono. El `.qmd` del zip dice WGS 84, pero es un residuo de QGIS; manda el `.prj` (esfera Moon 2000, R = 1 737 400 m) y las áreas lo confirman.
- **Desviaciones de la spec / cambios en la guía:** archivos añadidos fuera de la lista de T0.3.a: `pipeline/regions.py`, `pipeline/tests/test_regions.py`, cambios en `fetch_data.py` y dependencia `pyshp`.
- **Problemas abiertos:** confirmar con el humano las 5 regiones y el método (propuestos y documentados; cambiarlos es barato). Quien clone el repo tiene que bajar estos zips a mano (indicado en `data/README.md` y en el mensaje de `fetch_data`).
- **Siguiente tarea:** T0.3.b.

## 2026-10-21 · T0.3.b · Generar pipeline/sites.json

- **Tarea:** T0.3.b — Generar `pipeline/sites.json` ([x]).
- **Qué se hizo:** `pipeline/sites_source.json` (sitio → región USGS → DOI) y `pipeline/make_sites.py`. Para cada región lee solo la ventana del DEM que la cubre, marca los píxeles cuyo centro cae dentro del polígono oficial y elige el de mayor altura (método de `docs/sites.md` §3). Convierte a lat/lon planetocéntricas con longitud este en [−180, 180). En `regions.py`, `is_dem_crs` compara el CRS por sus parámetros. Prueba nueva: `pipeline/tests/test_sites.py`.
- **Cómo se verificó:**
  ```
  $ python -m pipeline.make_sites
  connecting_ridge   lat -89.43904  lon -137.09641  z   1958.6 m  (183,184 píxeles en la región)
  haworth            lat -86.36367  lon  -23.20405  z   2841.8 m  (554,280 píxeles en la región)
  nobile_rim_1       lat -85.23264  lon   36.58945  z   6799.8 m  (250,000 píxeles en la región)
  malapert_massif    lat -85.98827  lon    2.06255  z   5173.2 m  (275,625 píxeles en la región)
  de_gerlache_rim_2  lat -88.58729  lon  -67.92540  z   1764.1 m  (250,086 píxeles en la región)
  $ python -m pipeline.validate --file pipeline/sites.json
  OK: pipeline/sites.json cumple el contrato 1.0.0
  $ python -m pytest pipeline/tests/test_sites.py
  2 passed   (contrato, lat ≤ −80°, campos no vacíos, cada sitio dentro de su polígono oficial)
  ```
  Comprobaciones: las cuentas de píxeles cuadran con las áreas oficiales (183 184 × 0,0016 km² ≈ 293 km²; 250 000 → 400 km²; 275 625 → 441 km²; 554 280 → 887 km²). Ningún punto está pegado al contorno ni es una ladera que sube hacia fuera: distancia al contorno ≥ 3,9 km en cuatro sitios, y en esos cuatro el punto es el más alto en ±3 km.
- **Decisiones tomadas:** ninguna nueva (se aplica el método de T0.3.a).
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** **de Gerlache Rim 2** queda a 1,2 km del contorno y hay terreno algo más alto (1 814,5 m) a menos de 3 km, probablemente fuera de la región. Se revisa en el mapa (T0.3.c). **Nobile Rim 1** sale a 6 799,8 m, cerca del máximo del DEM (7 026,8 m); es una cumbre interior de la región (que linda con Mons Mouton), no un artefacto del contorno, pero conviene confirmarlo en el mapa.
- **Siguiente tarea:** T0.3.c.

## 2026-10-21 · T0.3.c · Mapa de verificación de los sitios

- **Tarea:** T0.3.c — Mapa de verificación de los sitios ([x]).
- **Qué se hizo:** `pipeline/plots/sites_map.py` genera `docs/figures/sites_map.png` (sombreado del DEM a ±170 km del polo, mostrado a 320 m, con las regiones USGS en naranja y los sitios en azul, con lat, lon y altura) y `docs/figures/sites_zoom.png` (±12 km por sitio a 40 m, con curvas de nivel y el contorno oficial).
- **Cómo se verificó:**
  ```
  $ python -m pipeline.plots.sites_map
  escrito docs\figures\sites_map.png (1354 kB)
  escrito docs\figures\sites_zoom.png (1490 kB)
  ```
  **Revisión visual (agente):**
  - Malapert Massif: meseta alta del macizo, en el interior de la región. ✓ macizo.
  - Haworth: terreno elevado del borde, por encima de la curva de 2 200 m, a ~4 km del contorno. ✓ borde.
  - Nobile Rim 1: cumbre interior rodeada por curvas de ≥ 6 000 m; no es un artefacto del contorno. ✓ terreno alto del borde (zona que linda con Mons Mouton).
  - Connecting Ridge: terreno alto entre Shackleton (cráter oscuro junto al polo) y de Gerlache. ✓ cresta.
  - de Gerlache Rim 2: sobre la cresta del borde, junto al contorno este de la región; la cresta sigue subiendo fuera (1 814,5 m a < 3 km). ✓ borde, con esa nota.
- **Decisiones tomadas:** se mantienen los 5 puntos y el método de T0.3.a.
- **Desviaciones de la spec / cambios en la guía:** se añade `pipeline/plots/__init__.py`.
- **Problemas abiertos:** conviene que el humano compare `docs/figures/sites_map.png` con un mapa oficial de las regiones (por ejemplo, el de NASA de octubre de 2024) como segunda revisión. Las pendientes en los puntos se comprueban en T2.3.a.
- **Siguiente tarea:** **Fase 0 cerrada** → hito de demo y parada (paso g del protocolo). Después, T1.1.a.

## 2026-10-21 · HITO FASE 0 · Preparación cerrada

- **Estado de la guía:** Fase 0 completa (16/16). Adelantadas de la Fase 1: T1.2.b, T1.3.a, T1.3.b, T1.3.c, T1.4.a, T1.4.b y T1.4.c (7). Total: 23 [x], 85 [ ], 0 [!].
- **Comprobación del hito:**
  ```
  $ python -m pytest pipeline/tests -q                         → 114 passed in 3.35s
  $ python -m pipeline.validate pipeline/tests/fixtures/contract/valid → OK: cumple el contrato 1.0.0
  $ python -m pipeline.validate --file pipeline/sites.json      → OK: cumple el contrato 1.0.0
  $ python -m pipeline.fetch_data                               → 10 fuentes "present, checksum OK"
  $ npm --prefix web test                                       → Tests 37 passed (37)
  $ npm --prefix web run build                                  → ✓ built
  $ npm --prefix web run dev                                    → HTTP 200
  ```
  Figuras: `docs/figures/sites_map.png`, `docs/figures/sites_zoom.png`.
- **Pendiente para el humano:** confirmar los 5 sitios y el método (docs/sites.md); D1 (habilidades y horas); D8, D9 y D10 antes de la Fase 2; D11 antes de la Fase 7.
- **Siguiente tarea:** T1.1.a (referencias de JPL Horizons).

## 2026-10-21 · DECISIONES · D3 concretada y confirmada

- **Qué:** el humano confirmó en el chat los 5 sitios (Connecting Ridge, Haworth, Nobile Rim 1, Malapert Massif y de Gerlache Rim 2) y el método (cota máxima del DEM dentro de la región oficial USGS). Anotado en la fila de D3 de `docs/DECISIONS.md`. También autorizó el push de los commits del hito de la Fase 0.
- **Siguiente tarea:** T1.1.a.

## 2026-10-21 · T1.1.a · Referencias de JPL Horizons (verificación)

- **Tarea:** T1.1.a — Referencias de JPL Horizons ([x]).
- **Qué se hizo:**
  - Documentación de la API de Horizons revisada y una consulta de prueba para comprobar `CENTER='coord@301'` y leer las convenciones de la cabecera y el pie.
  - `pipeline/horizons_fetch.py`: consulta OBSERVER (QUANTITIES=4, AIRLESS, DEG, CSV) por sitio y objetivo; guarda la respuesta cruda con sus parámetros; `parse` y `--check` para releerlas sin red.
  - 10 referencias en `pipeline/tests/reference/` (5 sitios × Sol y Tierra × 7 instantes de 2027).
  - `docs/validation.md` §1 (método y convenciones) y §2 (hallazgo del rango del Sol).
  - `pipeline/tests/test_horizons_refs.py` (10 pruebas).
- **Cómo se verificó:**
  ```
  $ python -m pipeline.horizons_fetch
  connecting_ridge   sun   7 filas  el [ -1.988,  +1.323]°  centro: MEAN_ME (high precision) | Sun (10) {source: DE441}
  connecting_ridge   earth 7 filas  el [ -6.732,  +5.879]°  ...
  haworth            sun   7 filas  el [ -2.944,  +5.140]°  ...
  nobile_rim_1       sun   7 filas  el [ -4.817,  +3.682]°  ...
  malapert_massif    sun   7 filas  el [ -3.031,  +5.040]°  ...
  malapert_massif    earth 7 filas  el [ -2.283, +10.244]°  ...
  de_gerlache_rim_2  sun   7 filas  el [ -2.585,  +2.562]°  ...
  $ python -m pytest pipeline/tests/test_horizons_refs.py   → 10 passed
  $ python -m pytest -q                                      → 124 passed
  ```
  Convenciones leídas en la propia respuesta: marco del sitio «MEAN_ME (high precision)»; esfera «1737.4, 1737.4, 1737.4 km»; azimut «clockwise from north: North(0) → East(90)»; «Compensated for light-time, the gravitational deflection of light, stellar aberration»; efemérides «DE441».
- **Decisiones tomadas:** altitud de la consulta = (elevación del DEM + h_obs) / 1000 km, porque Horizons y el DEM usan la misma esfera de 1737.4 km. T1.1.b usará **MOON_ME**, el marco de Horizons y del DEM. Las diferencias DE440 (nuestro) / DE441 (Horizons) se medirán en T1.1.d.
- **Desviaciones de la spec / cambios en la guía:** ⚠️ **el rango ±1.6° de la elevación del Sol (spec 5.7 y aceptación de T1.1) solo vale en el polo exacto.** Horizons da hasta |el| = 5.14° en Haworth y 4.82° en Nobile Rim 1, y los 5 sitios lo superan. Explicación: el horizonte local de un sitio a latitud φ está inclinado (90° − |φ|), así que |el| ≤ (90° − |φ|) + ~1.6°; los 5 sitios cumplen ese límite. Criterio adoptado: Sol |el| ≤ colat + 1.6°, Tierra |el| ≤ colat + 7.0° (`docs/validation.md` §2). Corregidas la aceptación de T1.1.c, T1.1.e y T1.5.b en la guía y la referencia a 5.7 en el protocolo de `CLAUDE.md`. El espíritu de 5.7 (fuera de rango = error de marcos o signos) se mantiene.
- **Problemas abiertos:** avisar al humano de esta corrección de la spec (paso h; también afecta al guion de la demo, que dice que el Sol «apenas roza el horizonte»: sigue siendo cierto, con ±2 a ±5° según el sitio).
- **Siguiente tarea:** T1.1.b.

## 2026-10-21 · T1.1.b · Observador y marco ENU

- **Tarea:** T1.1.b — Observador y marco ENU ([x]).
- **Qué se hizo:** `pipeline/ephemeris.py` con `MOON_FRAME = "MOON_ME"`, `observer_position_km` (radio = 1737.4 km + elevación del DEM + h_obs; latitud planetocéntrica y longitud este), `enu_basis` (filas E, N, U en MOON_ME; U radial, N hacia el polo norte a lo largo del meridiano, E × N = U) y `az_el_deg` (azimut N→E en [0, 360) y elevación).
- **Cómo se verificó:**
  ```
  $ python -m pytest pipeline/tests/test_enu.py -v
  test_basis_is_orthonormal_and_right_handed[×5 puntos] PASSED   (|M·Mᵀ − I| < 1e-12, |E×N − U| < 1e-12)
  test_up_is_radial_and_north_points_to_the_pole[×5] PASSED       (U = r̂, N = proyección del eje polar, E·ẑ = 0)
  test_known_point_on_the_equator PASSED                          (lat 0, lon 0 → E=ŷ, N=ẑ, U=x̂)
  test_observer_radius_and_spice_agreement PASSED                 (coincide con spiceypy.latrec, < 1e-9 km)
  test_az_el_conventions PASSED                                   (N=0°, E=90°, S=180°, O=270°, como Horizons)
  13 passed in 0.30s
  ```
  Puntos de prueba: los sitios reales Malapert Massif (−85.99°) y Connecting Ridge (−89.44°), más puntos generales.
- **Decisiones tomadas:** **MOON_ME** (spec 5.1 pide documentar la elección): es el marco del DEM LOLA (MOON_ME de DE421) y el que usa Horizons para los sitios («MEAN_ME»). Cenit = radial sobre la esfera de 1737.4 km, igual que Horizons.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** ninguno.
- **Siguiente tarea:** T1.1.c.

## 2026-10-21 · T1.1.c · Az/el del Sol y la Tierra, vectorizado

- **Tarea:** T1.1.c — Az/el del Sol y la Tierra ([x]).
- **Qué se hizo:** en `pipeline/ephemeris.py`:
  - `et_grid`: rejilla ET uniforme; comprueba que no hay un segundo intercalar en el rango.
  - `target_enu_km`: vector sitio → Sol/Tierra con LT+S, vía `spiceypy.spkcpo` (observador de posición constante en MOON_ME, centro MOON), rotado a ENU.
  - `target_az_el`.
  - `elevation_bounds_deg`: límites por latitud de `docs/validation.md` §2.
  Pruebas en `pipeline/tests/test_ephemeris.py`.
- **Cómo se verificó:**
  ```
  $ python -m pytest pipeline/tests/test_ephemeris.py -v -s
  test_grid_has_30_days_at_30_min PASSED
  malapert_massif sun: el [-3.103, +4.519]°, límite ±5.61°; az recorre 1.01 vueltas
  malapert_massif earth: el [-3.097, +10.473]°, límite ±11.51°; az recorre 0.04 vueltas
  connecting_ridge sun: el [+0.039, +1.529]°, límite ±2.16°; az recorre 1.01 vueltas
  connecting_ridge earth: el [-7.545, +6.143]°, límite ±8.06°; az recorre 0.04 vueltas
  test_sun_goes_around_the_sky_once_per_lunar_day PASSED   (1.01 vueltas en 30 días)
  test_earth_stays_in_a_small_patch_of_sky PASSED          (la Tierra oscila, no recorre el cielo)
  5 passed
  ```
- **Decisiones tomadas:** `spkcpo` en lugar de `spkpos` (spec 5.1). Es la forma de SPICE de calcular estados con LT+S para un observador fijo en la superficie: el tiempo de luz se calcula desde el sitio y no desde el centro de la Luna. Mismo tipo de corrección que pide la spec.
- **Desviaciones de la spec / cambios en la guía:** **límite de la Tierra corregido de colat + 7.0° a colat + 7.5°**. Connecting Ridge dio −7.545° frente a un límite de 7.56°, porque en T1.1.a no conté la paralaje topocéntrica de la Tierra (~0.26°). Actualizados `ephemeris.py`, `test_horizons_refs.py`, `docs/validation.md` §2 y la aceptación de T1.1.c en la guía.
- **Problemas abiertos:** el bucle sobre `spkcpo` es escalar. Se medirá el tiempo de un año completo en T1.1.e.
- **Siguiente tarea:** T1.1.d.

## 2026-10-21 · T1.1.d · Comparación contra Horizons

- **Tarea:** T1.1.d — Comparación contra Horizons ([x]).
- **Qué se hizo:** `pipeline/tests/test_vs_horizons.py` compara az/el de PolePlanner (DE440, MOON_ME, LT+S, `spkcpo`) con las 70 referencias de Horizons (5 sitios × Sol y Tierra × 7 instantes). Mide Δaz·cos(el), Δel y la separación angular (`atan2(|u×h|, u·h)`), y regenera la tabla de `docs/validation.md` §3 entre marcadores.
- **Cómo se verificó:**
  ```
  $ python -m pytest pipeline/tests/test_vs_horizons.py -v -s
  test_matches_horizons[sun-×5 sitios] PASSED
  test_matches_horizons[earth-×5 sitios] PASSED
  test_wrong_frame_would_be_detected PASSED
  Peor separación: 0.0016″
  12 passed
  $ python -m pytest -q   → 154 passed
  ```
  Valores en bruto (Malapert, Sol, 2027-01-15 06:00): PolePlanner 87.556374315 / 0.912966891, Horizons 87.556374305 / 0.912966892.
  Controles negativos (Malapert, Sol): MOON_PA → 101.6″; sin corrección (NONE) → 21.2″; solo LT → 21.2″.
- **Decisiones tomadas:** además del criterio de la spec (< 0.05°), la prueba exige < 1″. Un error de marco (MOON_PA) da ~0.028°, que pasaría el criterio de la spec sin ser detectado. El control negativo lo deja demostrado.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** la primera versión calculaba la separación con `arccos` (precisión limitada a ~0.004″); se cambió a `atan2`. La tabla queda coherente: Δ = 0 ⇒ separación = 0.
- **Siguiente tarea:** T1.1.e.

## 2026-10-21 · T1.1.e · Series de un año para todos los sitios

- **Tarea:** T1.1.e — Series de un año ([x]).
- **Qué se hizo:** en `pipeline/ephemeris.py`, `site_series` (az/el del Sol y la Tierra en el rango de series del contrato §2, 2027-01-01 → 2028-01-15, cada 30 min; `--step-min 10` opcional), `save_series` y `load_series` (intermedio `pipeline/out/ephem_{sitio}.npz`, no versionado), `plot_series` y la línea de comandos `python -m pipeline.ephemeris`. Figuras en `docs/figures/ephemeris_{sitio}.png`. Comando añadido a `CLAUDE.md`.
- **Cómo se verificó:**
  ```
  $ python -m pipeline.ephemeris
  connecting_ridge   n=18192  Sol el [-2.086, +2.073]° (lím ±2.16, OK)  Tierra el [-7.553, +6.215]° (lím ±8.06, OK)    1.4 s
  haworth            n=18192  Sol el [-5.154, +5.144]° (lím ±5.24, OK)  Tierra el [-3.972, +10.074]° (lím ±11.14, OK)   1.4 s
  nobile_rim_1       n=18192  Sol el [-6.302, +6.309]° (lím ±6.37, OK)  Tierra el [-2.978, +10.037]° (lím ±12.27, OK)   1.3 s
  malapert_massif    n=18192  Sol el [-5.536, +5.528]° (lím ±5.61, OK)  Tierra el [-3.104, +10.538]° (lím ±11.51, OK)   1.3 s
  de_gerlache_rim_2  n=18192  Sol el [-2.924, +2.919]° (lím ±3.01, OK)  Tierra el [-6.741, +7.268]° (lím ±8.91, OK)    1.3 s
  Total 8.3 s; todo dentro de los límites
  ```
  n = 18 192 = 379 días × 48. El máximo del Sol ≈ colatitud + 1.54° en todos los sitios (inclinación del eje lunar), como predice §2. Figura de Malapert revisada: el Sol oscila con el día lunar (~29.5 d) y su amplitud varía a lo largo del año; la Tierra oscila con la libración (~27 d) entre −3° y +10.5°, sobre el horizonte geométrico la mayor parte del tiempo (sitio en la cara visible, lon 2°E).
- **Decisiones tomadas:** los intermedios se guardan en `.npz` comprimido. El formato del contrato (`timeseries/{site}.json`, cuantizado) lo escribe `build_all` (T2.4.a).
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** ninguno.
- **Siguiente tarea:** T1.2.a (T1.1 completa).

## 2026-10-21 · T1.2.a · Utilidades de DEM y proyección

- **Tarea:** T1.2.a — Utilidades de DEM y proyección ([x]).
- **Qué se hizo:** `pipeline/dem.py` con:
  - `latlon_to_xy` y `xy_to_latlon` (CRS del DEM).
  - `ray_points_xy`: rayos del horizonte como círculos máximos sobre la esfera de 1 737 400 m con azimut local N→E (`pyproj.Geod`), proyectados después al mapa.
  - `DemWindow` (lectura de una ventana y muestreo bilineal respecto a centros de píxel, con NaN fuera).
- **Cómo se verificó:**
  ```
  $ python -m pytest pipeline/tests/test_dem.py -q
  37 passed
  ```
  - Ida y vuelta lat/lon → x/y → lat/lon < 1 m en 4 puntos (incluidos el borde del DEM y la antimeridiana).
  - Punto de referencia del label: el polo (lat_0 = −90°) cae en (0, 0); meridiano 0° → +y y 90°E → +x (convención de `sites_map.png`); escala real en el polo (1° ≈ 30.32 km).
  - Rayos en los 5 sitios: distancia exacta (< 1 m hasta 100 km) y azimut de salida exacto (< 1e-6°); az = 0 aumenta la latitud y az = 90 la longitud.
  - **Coherencia horizonte ↔ efemérides:** en los 5 sitios × 5 azimuts, el azimut de un rayo coincide con el de `ephemeris.az_el_deg` (< 0.01°). Sol, Tierra y máscara comparten convención.
  - Bilineal exacto en un plano; en el DEM real, el valor en el punto de Malapert es su `elevation_m`.
- **Decisiones tomadas:** los rayos se trazan sobre la esfera y no en el plano del mapa: en el polo el «norte del mapa» no es el norte local, y la escala de la estereográfica varía (~0.1–0.3 % a 100 km).
- **Desviaciones de la spec / cambios en la guía:** ninguno (5.2 pide «convertir coordenadas con cuidado»).
- **Problemas abiertos:** ninguno.
- **Siguiente tarea:** T1.2.c.

## 2026-10-21 · T1.2.c · Algoritmo de la máscara de horizonte

- **Tarea:** T1.2.c — Algoritmo de la máscara de horizonte ([x]).
- **Qué se hizo:** `pipeline/horizon.py` con `compute_mask`: un rayo por bin (az = i · 1°, N→E) trazado sobre la esfera hasta R_max = 100 km, con paso = tamaño de píxel (configurable); fórmula de 5.2 con h_obs y la caída por curvatura d²/(2R); los azimuts se procesan en bloques para limitar la memoria; error si la ventana del DEM no cubre R_max. `DemWindow` guarda las alturas en float32 (±100 km a 40 m son 5 000² píxeles). `is_dem_crs` silencia el aviso informativo de pyproj.
- **Cómo se verificó:** DEM sintético de T1.2.b con el sitio a 150 km del polo (lat ≈ −85.05°), píxel de 50 m, paso del rayo de 10 m, R_max = 50 km:
  ```
  $ python -m pytest pipeline/tests/test_horizon.py -v -s
  borde 500 m a 10 km (clip=False): esperado +2.7420°, error máx 0.0155°, medio 0.0063°   PASSED
  borde 2 km a 40 km  (clip=False): esperado +2.2175°, error máx 0.0071°, medio 0.0034°   PASSED
  llano               (clip=False): esperado -0.1065°, error máx 0.0000°                  PASSED
  (los mismos con clip=True)                                                                PASSED
  test_azimuth_dependent_rim PASSED   (pared 300 + 200·cos(az) m: N > E ≈ O > S, error máx 0.023°)
  test_window_too_small_is_an_error PASSED
  8 passed
  $ python -m pytest -q   → 199 passed
  ```
  Tolerancia de 0.05° en los 360 bins: el error viene de rasterizar la pared (píxel de 50 m) y la interpolación bilineal en su borde interior; cuesta ~1/d rad por metro (0.006° por metro a 10 km).
- **Decisiones tomadas:** **sin recorte de negativos** (`CLIP_NEGATIVE = False`, 5.2 paso 3): en cumbres como Malapert o Nobile el horizonte real está por debajo de 0°, y recortarlo marcaría como oscuro un Sol visible. Irá al manifiesto (`clip_negative: false`). Un solo rayo por bin, en su azimut central (contrato §6).
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** la primera versión de la prueba del borde variable exigía el argmax exacto; el pico del coseno es plano, así que ahora se comprueba la forma.
- **Siguiente tarea:** T1.2.d (rendimiento con el DEM real).

## 2026-10-21 · T1.2.d · Rendimiento de la máscara

- **Tarea:** T1.2.d — Rendimiento de la máscara ([x]).
- **Qué se hizo:** en `pipeline/horizon.py`, `site_mask` (lee la ventana del DEM real de ±101 km y calcula la máscara) y `main` (`python -m pipeline.horizon [--site ID]`) con tiempos por sitio. No hizo falta optimizar: el cálculo de T1.2.c ya está vectorizado (rayos por bloques de 45 azimuts, muestreo bilineal en numpy).
- **Cómo se verificó:**
  ```
  $ python -m pipeline.horizon
  connecting_ridge   lectura 0.7 s  cálculo 0.6 s  ventana 5054×5054 px  z0 1958.6 m  máscara [-3.85, -0.71]°
  haworth            lectura 0.6 s  cálculo 0.5 s  ...                    z0 2841.8 m  máscara [-3.59, +2.19]°
  nobile_rim_1       lectura 0.5 s  cálculo 0.5 s  ...                    z0 6799.8 m  máscara [-3.76, +0.38]°
  malapert_massif    lectura 0.5 s  cálculo 0.5 s  ...                    z0 5173.2 m  máscara [-3.08, -0.09]°
  de_gerlache_rim_2  lectura 0.5 s  cálculo 0.5 s  ...                    z0 1764.1 m  máscara [-3.51, +1.10]°
  Total 5.5 s para 5 sitio(s)
  ```
  ~1.1 s por sitio con 360 × 2 500 muestras (paso de 40 m hasta 100 km), muy por debajo del objetivo propuesto de 2 min. Las pruebas de T1.2.c siguen pasando (8 passed).
- **Decisiones tomadas:** ninguna nueva. Con este margen se podría usar un paso de 20 m o varios rayos por bin si hiciera falta más rigor.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** ninguno. Los valores de la máscara se revisan en T1.2.e.
- **Siguiente tarea:** T1.2.e.

## 2026-10-21 · T1.2.e · Máscaras de los sitios reales y gráficos

- **Tarea:** T1.2.e — Máscaras de los sitios reales ([x]).
- **Qué se hizo:** en `pipeline/horizon.py`, `save_mask` y `load_mask` (intermedio `pipeline/out/horizon_{sitio}.npz` con los parámetros) y `plot_mask`: silueta lineal con las trayectorias de un año del Sol y la Tierra (de T1.1.e) y vista polar. `python -m pipeline.horizon` lo genera todo. Figuras en `docs/figures/horizon_{sitio}.png`.
- **Cómo se verificó:**
  ```
  $ python -m pipeline.horizon
  connecting_ridge   z0 1958.6 m  máscara [-3.85, -0.71]°  (máx en az 182°)
  haworth            z0 2841.8 m  máscara [-3.59, +2.19]°  (máx en az 83°)
  nobile_rim_1       z0 6799.8 m  máscara [-3.76, +0.38]°  (máx en az 25°)
  malapert_massif    z0 5173.2 m  máscara [-3.08, -0.09]°  (máx en az 90°)
  de_gerlache_rim_2  z0 1764.1 m  máscara [-3.51, +1.10]°  (máx en az 188°)
  Total 7.2 s
  ```
  Máximos plausibles (pocos grados; negativos en las cumbres).
  **Revisión visual (agente) de las 5 figuras:**
  - Sol: onda anual, más alto hacia el Norte local (dirección del ecuador). ✓
  - **Control independiente de azimuts:** en sitios cerca del polo la Tierra debe estar en az ≈ −longitud del sitio. Malapert (+2°) → ~358°; Haworth (−23°) → ~23°; de Gerlache (−68°) → ~68°; Connecting Ridge (−137°) → ~137°; Nobile Rim 1 (+37°) → ~323°. Coincide en los 5. ✓ (las convenciones de horizonte y efemérides coinciden en datos reales).
  - Malapert: silueta ≤ −0.09°; el Sol solo roza el terreno hacia el Sur → muy iluminado (coherente con su fama).
  - Haworth: pico de +2.19° al Este que tapa el Sol en parte de sus pasos bajos.
  - de Gerlache Rim 2: macizo de +1.10° al Sur.
  - Connecting Ridge: el Sol se mueve a ±2° y el horizonte está en ≤ −0.71°.
- **Decisiones tomadas:** ninguna nueva.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** ninguno. T1.2 completa.
- **Siguiente tarea:** T1.3.d.

## 2026-10-21 · T1.3.d · Banderas de todos los sitios y control de fondo de cráter

- **Tarea:** T1.3.d — Banderas de todos los sitios y control de fondo de cráter ([x]).
- **Qué se hizo:** en `pipeline/visibility.py`, `control_point` (fondo de Shackleton: centro oficial del nomenclátor IAU/USGS, Feature ID 5450, −89.67°, 129.78°E; píxel más bajo del DEM a ≤ 3 km), `site_flags` (Sol por borde superior 5.3 y Tierra con margen 5.4) y `main` (`python -m pipeline.visibility`). Banderas en `pipeline/out/flags_{id}.npz`; control documentado en `docs/sites.md` §4.
- **Cómo se verificó:**
  ```
  $ python -m pipeline.visibility
  Control: CONTROL: Shackleton crater floor en -89.62485°, 118.68281°, z = -2871.9 m
  connecting_ridge           Sol visible  95.12 %   Tierra visible  60.06 %   (máscara máx -0.71°)
  haworth                    Sol visible  78.57 %   Tierra visible  71.59 %   (máscara máx +2.19°)
  nobile_rim_1               Sol visible  71.09 %   Tierra visible  74.27 %   (máscara máx +0.38°)
  malapert_massif            Sol visible  76.54 %   Tierra visible  77.03 %   (máscara máx -0.09°)
  de_gerlache_rim_2          Sol visible  87.85 %   Tierra visible  53.13 %   (máscara máx +1.10°)
  control_shackleton_floor   Sol visible   0.00 %   Tierra visible   0.00 %   (máscara máx +26.93°)
  Sanity 5.7: control ≈ 0 % de Sol → 0.00 %; todos los sitios > control → True     (exit 0)
  ```
  Periodo: 2027-01-01 → 2028-01-15 cada 30 min (n = 18 192), criterio del borde superior del Sol y margen de antena de 0.5°.
- **Decisiones tomadas:** Shackleton como control: el centro sale del nomenclátor oficial y el punto, del DEM. El control no entra en `sites.json` ni en los datos del front end.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** ninguno. El % de Sol es geométrico (máscara de 100 km a 40 m), sin sombras de relieve más allá de R_max ni del propio módulo.
- **Siguiente tarea:** T1.4.d.

## 2026-10-21 · T1.4.d · Ejecución con datos reales y rendimiento

- **Tarea:** T1.4.d — Ejecución con datos reales ([x]).
- **Qué se hizo:** `main` en `pipeline/windows.py` (`python -m pipeline.windows`): daily de los 5 sitios (379 días) y windows para L = 3, 7 y 14 (365 llegadas), con el score normalizado sobre todos los sitios para cada L. Formato del contrato §8-§9 en `pipeline/out/daily/` y `pipeline/out/windows/`, validado con `pipeline.validate`.
- **Cómo se verificó:**
  ```
  $ python -m pipeline.windows
  L= 3 connecting_ridge   sun_pct medio  94.94 %  oscuridad máx   72.0 h  Tierra h/día media 14.17
  L= 7 haworth            sun_pct medio  78.15 %  oscuridad máx  168.0 h  Tierra h/día media 17.12
  L=14 malapert_massif    sun_pct medio  75.73 %  oscuridad máx  325.0 h  Tierra h/día media 18.55
  ... (15 líneas, una por sitio y L)
  20 archivos escritos en 0.2 s; validación del contrato: OK      (exit 0; objetivo < 1 min)
  ```
  Comprobación del score: los 1 190 valores de score = 1.0 son todos ventanas «perfectas» (100 % de Sol, 0 h de oscuridad, Tierra 24 h/día). L=3: 667 de 1 825; L=7: 413; L=14: 110. Mínimo de score 0.000 / 0.201 / 0.269 y mediana ~0.80. El sun_pct medio coincide con el de T1.3.d (p. ej. Connecting Ridge 94.94 % frente a 95.12 % anual).
- **Decisiones tomadas:** ninguna nueva.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** ⚠️ **el score de 5.6 se satura**: hasta el 37 % de las ventanas de 3 días empatan a 1.0 (todas las métricas en su mejor valor posible). Es correcto según la spec, pero el calendario (T3.2) y la insignia «best» (T3.3.d) necesitarán un desempate (por ejemplo, el menor `longest_comm_gap_h`) o mostrar «perfect window». Anotado para la Fase 3; no se cambia la fórmula sin consultar.
- **Siguiente tarea:** T1.5.a.

## 2026-10-21 · T1.5.a · Generar plans.json

- **Tarea:** T1.5.a — Generar `plans.json` ([x]).
- **Qué se hizo:** `pipeline/plans.py` (`python -m pipeline.plans`): un plan por sitio × día de llegada × L (D6), indexado por llegada (D7), con `transit_days` = 3 (D5), `launch_utc` derivado y `trajectory_id` por sitio y día. Comprobaciones cruzadas (`check`). Salida `pipeline/plans.json` (versionado, JSON compacto). Prueba `pipeline/tests/test_plans.py`.
- **Cómo se verificó:**
  ```
  $ python -m pipeline.plans
  5475 planes = 5 sitios × 365 llegadas × 3 L; 1.15 MB → pipeline\plans.json
  primero: {'id': 'connecting_ridge_20270101_3d', 'site_id': 'connecting_ridge', 'arrival_utc': '2027-01-01T00:00:00Z',
            'window_days': 3, 'transit_days': 3, 'launch_utc': '2026-12-29T00:00:00Z', 'trajectory_id': 'connecting_ridge_20270101'}
  contrato + comprobaciones cruzadas: OK     (exit 0)
  $ python -m pytest pipeline/tests/test_plans.py → 2 passed
  ```
- **Decisiones tomadas:** ninguna nueva (D5, D6 y D7 ya confirmadas).
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** 1.15 MB entra en el presupuesto de series (< 15 MB). Si la carga inicial (< 3 s) lo pidiera, el front end podría generar los planes a partir de `sites` y `date_range`, que son deterministas.
- **Siguiente tarea:** T1.5.b.

## 2026-10-21 · T1.5.b · Suite automática de sanity checks (5.7)

- **Tarea:** T1.5.b — Sanity checks ([x]).
- **Qué se hizo:** `pipeline/tests/test_sanity.py` sobre las salidas reales de `pipeline/out/` (se omite si faltan):
  - Elevación del Sol y la Tierra dentro de los límites por latitud (`docs/validation.md` §2).
  - La Tierra oscila en una franja de azimut < 40°.
  - Máscaras finitas y de pocos grados (|el| < 10°).
  - Control en el fondo de Shackleton < 1 % de Sol, y cada sitio supera al control en más de 50 puntos.
  - Banderas 0/1; porcentajes, horas y score en rango; 365 filas por L.
- **Cómo se verificó:**
  ```
  $ python -m pytest pipeline/tests/test_sanity.py -v
  test_sun_and_earth_elevation_within_latitude_bounds[×5] PASSED
  test_horizon_mask_is_plausible[×5] PASSED
  test_ridges_have_more_sun_than_the_crater_floor PASSED
  test_flags_and_percentages_in_range[×5] PASSED
  16 passed in 0.22s
  ```
- **Decisiones tomadas:** ninguna nueva.
- **Desviaciones de la spec / cambios en la guía:** los límites del Sol y la Tierra son los corregidos por latitud de T1.1.a, en lugar del ±1.6° literal.
- **Problemas abiertos:** ninguno.
- **Siguiente tarea:** T1.5.c.

## 2026-10-21 · T1.5.c · Informe de sitio para el hito

- **Tarea:** T1.5.c — Informe de sitio ([x]).
- **Qué se hizo:** `pipeline/report_site.py` (`python -m pipeline.report_site --site ID --arrival AAAA-MM-DD --window L [--out ruta]`): imprime las métricas de 5.5 del plan y genera una figura con los colores de la spec 9: silueta del horizonte con las trayectorias del Sol y la Tierra en la ventana, y cinta de tiempo (ambos / solo Sol / solo Tierra / ninguno) con la racha de oscuridad más larga rayada. Comprueba que sun_pct y longest_dark_h del JSON coinciden con las banderas. Es un prototipo de lo que mostrarán el panel 2D y el panorama. Ejemplo versionado: `docs/figures/report_haworth_20270310_7d.png`.
- **Cómo se verificó:**
  ```
  $ python -m pipeline.report_site --site haworth --arrival 2027-03-10 --window 7
  sun_pct (%) 38.1 | longest_dark_h (h) 65.5 | earth_h_per_day_min (h) 24.0 | earth_h_per_day_mean (h) 24.0 | longest_comm_gap_h (h) 0.0 | score 0.6354
  $ python -m pipeline.report_site --site malapert_massif --arrival 2027-10-15 --window 14
  sun_pct (%) 100.0 | longest_dark_h (h) 0.0 | earth_h_per_day_min (h) 0.0 | earth_h_per_day_mean (h) 20.46 | longest_comm_gap_h (h) 49.5 | score 0.9535
  ```
  Revisión visual (Haworth): los primeros 2.7 días el Sol está tapado por el pico de +2.2° al Este (racha de 65.5 h, rayada); al pasar al Sur del pico hay Sol y Tierra (verde); al final el Sol baja por debajo del horizonte. La Tierra está alta (8–10°) toda la ventana → 24 h/día. Coherente con las métricas.
  El ejemplo de Malapert muestra el compromiso que la herramienta debe hacer visible: 100 % de Sol pero un día sin Tierra (hueco de 49.5 h).
- **Decisiones tomadas:** ninguna nueva.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** ninguno.
- **Siguiente tarea:** cierre de la Fase 1 → hito de demo y parada.

## 2026-10-21 · HITO FASE 1 · Núcleo científico del sitio cerrado

- **Estado de la guía:** Fases 0 y 1 completas (16 + 21 subtareas). Total: 37 [x], 71 [ ], 0 [!].
- **Comprobación del hito** (con `pipeline/out/` borrado antes):
  ```
  $ python -m pipeline.ephemeris     → Total 6.5 s; todo dentro de los límites
  $ python -m pipeline.horizon       → Total 6.0 s para 5 sitio(s)
  $ python -m pipeline.visibility    → Sanity 5.7: control ≈ 0 % de Sol → 0.00 %; todos los sitios > control → True
  $ python -m pipeline.windows       → 20 archivos escritos en 0.2 s; validación del contrato: OK
  $ python -m pipeline.plans         → contrato + comprobaciones cruzadas: OK
  Cadena completa desde cero: 23 s      (plans.json idéntico byte a byte: git sin cambios)
  $ python -m pytest pipeline/tests -q → 217 passed (0 skipped)
  $ python -m pipeline.report_site --site connecting_ridge --arrival 2027-06-01 --window 7 → sun 100 %, dark 0 h, Earth 24 h/día, score 1.0
  ```
- **Resultados científicos clave:**
  - Az/el del Sol y la Tierra validados contra JPL Horizons en 70 comparaciones: peor error **0.0016″** (criterio < 0.05°), con controles negativos (MOON_PA ≈ 100″; sin aberración ≈ 21″).
  - Sol visible en el año: Connecting Ridge 95.1 %, de Gerlache Rim 2 87.9 %, Haworth 78.6 %, Malapert 76.5 %, Nobile Rim 1 71.1 %; control en el fondo de Shackleton 0.0 %.
  - Tierra visible: Malapert 77.0 %, Nobile 74.3 %, Haworth 71.6 %, Connecting Ridge 60.1 %, de Gerlache 53.1 %.
  - Hallazgo documentado: el rango ±1.6° de la spec solo vale en el polo; los límites dependen de la latitud (`docs/validation.md` §2).
- **Pendiente para el humano:** confirmar la corrección de los límites de 5.7. Decisiones que bloquean parte de la Fase 2: **D8** (escala 3D y despegue, T2.4.a), **D9** (terreno Nivel B, T2.3.d-e), **D10** (características y radio de pendiente, T2.3.a-c). D1 y D11 siguen pendientes.
- **Siguiente tarea:** Fase 2 (T2.1.a no depende de decisiones pendientes).

## 2026-10-21 · DECISIONES · D8, D9, D10 y corrección de 5.7 confirmadas

- **Qué:** el humano aceptó en el chat los valores por defecto de **D8** (escala 3D: cuerpos exagerados, distancias comprimidas y direcciones exactas; despegue mínimo), **D9** (MVP con panorama 2D y terreno simplificado; Nivel B solo como extra) y **D10** (lista completa de 5.10; radio de pendiente de 1 km), y la **corrección de los límites de 5.7** por latitud (A3 en `docs/DECISIONS.md`). También autorizó el push.
- **Pendientes:** D1 (equipo) y D11 (requisitos de entrega); no bloquean la Fase 2.
- **Siguiente tarea:** T2.1.a.

## 2026-10-21 · T2.1.a · Efemérides de escena

- **Tarea:** T2.1.a — Efemérides de escena ([x]).
- **Qué se hizo:** en `pipeline/ephemeris.py`, `scene_ephemeris` y `write_scene` (`python -m pipeline.ephemeris --scene` → `pipeline/out/scene/ephemeris.json`): cada 60 min en el rango de escena del contrato §2 (2026-12-28 → 2028-01-15), con:
  - posición de la Luna respecto a la Tierra en J2000 (km);
  - dirección unitaria Tierra → Sol;
  - cuaternión MOON_ME → J2000;
  - cuaternión IAU_EARTH → J2000.
  Cuaterniones en orden `[x, y, z, w]` y con el signo forzado a ser continuo (`make_continuous`) para slerp. Contrato §10 actualizado (`frame` = J2000 y `earth_frame` = IAU_EARTH, ya confirmados). Comando en `CLAUDE.md`.
- **Cómo se verificó:**
  ```
  $ python -m pipeline.ephemeris --scene
  escrito pipeline\out\scene\ephemeris.json (1.58 MB) en 0.8 s
  $ python -m pipeline.validate --file pipeline/out/scene/ephemeris.json
  OK: pipeline/out/scene/ephemeris.json cumple el contrato 1.0.0
  n 9192 | start 2026-12-28T00:00:00Z | step 60 | marcos J2000 MOON_ME IAU_EARTH
  distancia Tierra-Luna min/max (km): 357283 406607
  min producto escalar entre cuaterniones consecutivos (Luna): 0.999989
  ```
  Convención de `m2q` comprobada numéricamente antes de escribir: `‖M·v − q·v·q⁻¹‖ = 1.1e-16` reordenando `[w,x,y,z]` → `[x,y,z,w]`, frente a 0.59 con el conjugado.
- **Decisiones tomadas:**
  - Escena en J2000 centrado en la Tierra.
  - Estados **geométricos** (sin LT+S). Frente a los aparentes del sitio, la diferencia es de ~20″ de aberración y 1.3 s de tiempo de luz, invisible en 3D. La ciencia del sitio sigue usando LT+S.
  - Rotación de la Tierra con IAU_EARTH (pck00011), como se previó en T0.2.a.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** 1.58 MB solo para la escena; se revisará el presupuesto en T2.4.b (series < 15 MB).
- **Siguiente tarea:** T2.1.b.

## 2026-10-21 · T2.1.b · Convención del cuaternión

- **Tarea:** T2.1.b — Convención del cuaternión ([x]).
- **Qué se hizo:** `pipeline/tests/test_scene.py`:
  - Comprobación independiente: la posición Tierra → sitio reconstruida desde el archivo (`moon_pos_km` + `q·sitio·q⁻¹`) frente a SPICE `spkcpo` con observador en el sitio, para los 5 sitios.
  - Error de interpolación a mitad de intervalo (Catmull-Rom + slerp, y lineal como comparación).
  - Cuaterniones unitarios y continuos; cuaternión de la Tierra frente a `pxform`.
  El contrato §10 documenta la convención (`q·v·q⁻¹`, orden `[x,y,z,w]`) y la interpolación obligatoria.
- **Cómo se verificó:**
  ```
  $ python -m pytest pipeline/tests/test_scene.py -v -s
  En las muestras: error máx 66.2 m (redondeo de moon_pos_km a 0.1 km)            PASSED
  A mitad de intervalo: Catmull-Rom + slerp 67.2 m; lineal + slerp 5.08 km         PASSED
  test_quaternions_are_continuous_and_unit PASSED
  test_earth_quaternion_matches_spice PASSED
  4 passed
  ```
  Criterio de la guía: < 0.1 km en las muestras (66 m) y < 1 km interpolado (67 m). ✓
- **Decisiones tomadas:** **interpolación cúbica de Catmull-Rom obligatoria para posiciones** en el front end (T4.1.c). La lineal da 5 km de error a mitad de intervalo, porque la órbita es curva en 60 min. Rotaciones con slerp.
- **Desviaciones de la spec / cambios en la guía:** contrato §10 ampliado con la regla de interpolación (no cambia el formato).
- **Problemas abiertos:** ninguno.
- **Siguiente tarea:** T2.1.c.

## 2026-10-21 · T2.1.c · Fase lunar y dirección del Sol frente a una referencia

- **Tarea:** T2.1.c — Fase lunar y dirección del Sol ([x]).
- **Qué se hizo:**
  - `pipeline/horizons_fetch.py --scene`: 3 referencias de Horizons desde el geocentro en 5 fechas que coinciden con muestras de la escena. Son la fase de la Luna (Illu% y S-T-O) y los vectores ICRF sin corrección del Sol y de la Luna; se guardan crudas en `pipeline/tests/reference/horizons_scene_*.txt`.
  - En `pipeline/tests/test_scene.py`, la comparación, que escribe la tabla de `docs/validation.md` §4.
- **Cómo se verificó:**
  ```
  $ python -m pytest pipeline/tests/test_scene.py -v -s
  Peor: iluminada 0.134 puntos; dirección del Sol 0.000000°; posición de la Luna 0.07 km
  5 passed
  | 2027-01-15T06:00:00Z | 43.734 | 43.599 | 0.134 | 97.200 | 97.355 | 0.000000 | 0.06 |
  | 2027-04-20T03:00:00Z | 99.082 | 99.077 | 0.005 | 10.992 | 11.025 | 0.000000 | 0.07 |
  | 2027-07-04T12:00:00Z |  0.249 |  0.247 | 0.002 | 174.282 | 174.300 | 0.000000 | 0.04 |
  | 2027-09-30T18:00:00Z |  0.732 |  0.727 | 0.005 | 170.190 | 170.219 | 0.000000 | 0.05 |
  | 2027-12-24T23:00:00Z |  8.408 |  8.373 | 0.036 | 146.283 | 146.361 | 0.000000 | 0.04 |
  ```
  Criterios: < 0.5 puntos de fracción iluminada ✓ y < 0.1° en la dirección del Sol ✓. Las fechas cubren creciente, casi llena, casi nueva y menguante.
- **Decisiones tomadas:** la escena ilumina la Luna con `sun_dir` (Tierra → Sol); la diferencia con la geometría vista desde la Luna (≤ 0.15°) explica los ~0.1 puntos de fracción y está documentada en `docs/validation.md` §4.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** ninguno. T2.1 completa.
- **Siguiente tarea:** T2.2.a (no aplica por D5) → T2.2.b.

## 2026-10-21 · T2.2.a · Kernel de misión publicado — no aplica

- **Tarea:** T2.2.a ([x], **no aplica**).
- **Motivo:** D5 = trayectoria ilustrativa (confirmada el 2026-10-21). Como indica la guía, la subtarea se cierra sin buscar kernels de misión. Todas las trayectorias serán `mode: "ILLUSTRATIVE"`.
- **Cómo se verificó:** `docs/DECISIONS.md`, fila D5: «**confirmada** (2026-10-21) | Ilustrativa (ILLUSTRATIVE); `transit_days` = 3 días».
- **Siguiente tarea:** T2.2.b.

## 2026-10-21 · T2.2.b · Trayectoria ILLUSTRATIVE de un plan

- **Tarea:** T2.2.b — Trayectoria ILLUSTRATIVE ([x]).
- **Qué se hizo:** `pipeline/trajectory.py` con `build(site, arrival)` en J2000 centrado en la Tierra (marco de la escena) y `mode: "ILLUSTRATIVE"`. Es una curva por tramos con la Luna y su orientación reales (SPICE):
  1. despegue radial desde una plataforma genérica (0°, 0°; no es un puerto espacial real) que gira con IAU_EARTH, hasta 200 km en 10 min, interpolando dirección y radio por separado;
  2. órbita de espera circular hasta la inyección (+2 h);
  3. transferencia con una curva de Hermite tangente a la órbita, hasta 8 000 km de la Luna (lado de la Tierra) en `lunar_arrival_utc` = llegada − 12 h;
  4. aproximación y descenso en el marco de la Luna hasta el sitio, exactamente en `arrival_utc`.
  123 muestras, más densas en el despegue, la salida y el descenso. Todos los parámetros son de diseño y están documentados en el módulo.
- **Cómo se verificó:**
  ```
  $ python -m pytest pipeline/tests/test_trajectory.py -q        (5 sitios × 4 llegadas: ene, mar, ago, dic)
  20 passed
  Malapert, llegada 2027-03-10: muestras 123 | radio min 6378.2 km | vel. máx 7.71 km/s | final vs sitio (km): 0.0565
  ```
  Comprobaciones: contrato §11 (tiempos estrictamente crecientes, fases en orden, aterrizaje = último instante, id); duración = 3 días; ningún salto (velocidad implícita < 12 km/s); nunca dentro de la Tierra ni de la Luna; último punto a < 1 km de la posición SPICE del sitio en la llegada.
- **Decisiones tomadas:** plataforma de lanzamiento genérica en (0°, 0°), sin asociarla a ningún puerto real (spec 5.8: «plataforma genérica»). Curva de Hermite en lugar de cónicas empalmadas (la spec lo deja «por ejemplo»): es suave, continua y fácil de anclar a la Luna real; queda declarada ILLUSTRATIVE.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** la primera versión bajaba a 6 331 km durante el despegue (mezcla lineal de dos puntos sobre esferas); corregido y cubierto por la prueba.
- **Siguiente tarea:** T2.2.c.

## 2026-10-21 · T2.2.c · Generación por lotes, tamaño y documentación ILLUSTRATIVE

- **Tarea:** T2.2.c — Trayectorias por lotes ([x]).
- **Qué se hizo:** `main` y `plot_examples` en `pipeline/trajectory.py` (`python -m pipeline.trajectory [--plot]`): una trayectoria por `trajectory_id` de `plans.json` (D6: sitio × día de llegada, compartida por las tres L) en `pipeline/out/trajectory/`. Figura `docs/figures/trajectory_examples.png`. Comando en `CLAUDE.md`.
- **Documentación ILLUSTRATIVE (exigida por 5.8):**
  - Ninguna trayectoria es real: todas llevan `mode: "ILLUSTRATIVE"` y el manifiesto llevará `trajectory_mode: "ILLUSTRATIVE"` (T2.4.a).
  - Construcción: despegue desde una plataforma genérica (0°, 0°), órbita de espera de 200 km, inyección a +2 h, arco de Hermite hasta 8 000 km de la Luna real (SPICE) 12 h antes de llegar, y descenso hasta el sitio exactamente en la hora de llegada. Parámetros de diseño, no datos de misión.
  - Texto de la etiqueta para la interfaz (README): *«ILLUSTRATIVE trajectory — simplified, computed with the real Moon position; not a real mission trajectory.»* Estela punteada (spec 9).
- **Cómo se verificó:**
  ```
  $ python -m pipeline.trajectory --plot
  1825 trayectorias (ILLUSTRATIVE) en 14.0 s; tamaño total 8.62 MB (4.7 kB cada una); validadas 25 al azar: OK
  figura: docs\figures\trajectory_examples.png
  ```
  Revisión visual de la figura: 3 trayectorias (enero, mayo y septiembre) salen de la Tierra y terminan en la posición SPICE de la Luna en la llegada, con curvas suaves. Las pruebas de T2.2.b (20 casos) siguen pasando.
- **Decisiones tomadas:** sin compactación extra. 8.62 MB caben en D13 (< 50 MB), se cargan de una en una bajo demanda (~4.7 kB) y el hosting estático suele servirlas comprimidas (gzip).
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** el total se revisará en T2.4.b junto al resto. Si hiciera falta reducirlo, la opción es cuantizar las posiciones de la fase de transferencia a 1 km.
- **Siguiente tarea:** T2.3.a.

## 2026-10-21 · T2.3.a · Pendiente desde el DEM

- **Tarea:** T2.3.a — Pendiente desde el DEM ([x]).
- **Qué se hizo:** `pipeline/site_features.py` con `polar_scale_factor` (k = 2/(1 + sen|φ|)), `slope_deg_grid` (gradiente central sobre la malla; pendiente real = atan(k·|∇z|)) y `slope_stats` (media y máximo en un círculo de radio real de 1 km, que mide k·1 km en el mapa). `SLOPE_RADIUS_M = 1000` en `config.py` (D10).
- **Cómo se verificó:**
  ```
  $ python -m pytest pipeline/tests/test_site_features.py -v
  test_scale_factor PASSED
  test_tilted_plane_known_slope[lat −90 y −85 × 2°, 5°, 15°, 30°] PASSED   (media y máx con error < 0.1°)
  test_cone PASSED                                                          (cono de 20°: máx 20 ± 0.1°)
  test_radius_scales_with_projection PASSED
  11 passed
  ```
  Pendientes reales en un radio de 1 km alrededor de cada sitio (informativo; se publicarán en T2.3.c):
  ```
  connecting_ridge   media  8.58°  máx 20.20°
  haworth            media  8.12°  máx 19.22°
  nobile_rim_1       media  7.70°  máx 23.59°
  malapert_massif    media  7.14°  máx 25.30°
  de_gerlache_rim_2  media 12.99°  máx 24.17°
  ```
- **Decisiones tomadas:** corrección de escala explícita aunque k ≤ 1.002 en los sitios. Los planos de prueba se construyen con el gradiente del mapa = tan(pendiente)/k, así la prueba comprueba la corrección.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** de Gerlache Rim 2 tiene la pendiente media más alta (13°), coherente con estar en la cresta del borde junto al contorno (nota de T0.3.c). La spec no define un umbral de pendiente para aterrizar, así que no se califica a ningún sitio de apto o no apto.
- **Siguiente tarea:** T2.3.b.

## 2026-10-21 · T2.3.b · Rasgos cercanos con fuente oficial (verificación)

- **Tarea:** T2.3.b — Rasgos cercanos ([x]).
- **Qué se hizo:** en `pipeline/site_features.py`, `great_circle_km` (haversine en la esfera de 1737.4 km), `parse_gazetteer` (tabla del nomenclátor IAU/USGS), `nearby_features` (rasgos **aprobados** a ≤ 50 km, máximo 8, ordenados por distancia; tipos IAU traducidos a los del contrato) y `fetch_feature_sources` (`python -m pipeline.site_features` → `pipeline/feature_sources.json`, versionado, con fuente, URL, fecha y Feature ID de cada rasgo). Parámetros `NEARBY_RADIUS_KM` y `NEARBY_MAX` en `config.py`. Contrato §12 aclarado (distancia al centro del rasgo) y fuente registrada en `data/README.md`.
- **Cómo se verificó:**
  ```
  $ python -m pipeline.site_features
  9202 rasgos de la Luna en el nomenclátor; sistemas ['Planetographic, +East, -180 - 180']
  connecting_ridge   Spudis (crater, 14.2 km); Marvin (20.0); Shackleton (20.2); Henson (26.5); Haynes (31.6); Sverdrup (34.9); de Gerlache (37.1); Brill (41.8)
  haworth            Haworth (crater, 43.8 km); Mons Malapert (massif, 44.8 km); Lhamu (crater, 45.7 km)
  nobile_rim_1       Masina (12.3); Dawa (13.8); Jaci (14.4); Mons Mouton (massif, 24.3); Floss (32.9); Stose (36.1); Nobile (41.7); Scott M (42.0)
  malapert_massif    Mons Malapert (massif, 7.9 km); Lhamu (8.1); Malapert (37.2); Whitaker (40.1); Haworth (46.0)
  de_gerlache_rim_2  de Gerlache (crater, 16.1 km); Marvin (20.1); Bay (22.1); Brill (23.0); Spudis (28.9); Cartwright (34.8); Henson (44.9)
  $ python -m pytest pipeline/tests/test_site_features.py → 14 passed
  ```
  Casos conocidos: (0°, 0°)–(0°, 90°) = π·R/2; desde el polo, 1° = R·π/180 sea cual sea la longitud. Coherencia: Malapert Massif a 7.9 km de «Mons Malapert»; Connecting Ridge a 20 km del centro de Shackleton (D = 21 km), es decir, fuera del cráter, en la cresta.
- **Decisiones tomadas:** solo rasgos con estado «Approved». Los «Satellite Feature» de la IAU (cráteres con letra, p. ej. «Scott M») se tipan como `crater`. Las coordenadas planetográficas +Este de la IAU equivalen a planetocéntricas en la Luna esférica.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** las distancias son al centro de cada rasgo, no a su borde (se indicará en el tooltip de la interfaz).
- **Siguiente tarea:** T2.3.c.

## 2026-10-21 · T2.3.c · site_features/{site}.json

- **Tarea:** T2.3.c — `site_features/{site}.json` ([x]).
- **Qué se hizo:** en `pipeline/site_features.py`, `site_features` y `main`. `python -m pipeline.site_features` escribe `pipeline/out/site_features/{id}.json`; `--fetch-gazetteer` reconsulta el nomenclátor (T2.3.b). Atributos, todos `available` con fuente y método: `region` (USGS), `lat`, `lon`, `elevation_m`, `slope_mean_deg`, `slope_max_deg` y `slope_radius_m`. Rasgos cercanos de `feature_sources.json`. Comando en `CLAUDE.md`.
- **Cómo se verificó:**
  ```
  $ python -m pipeline.site_features
  connecting_ridge   7 atributos, 8 rasgos | pendiente 8.58° / 20.2° | OK
  haworth            7 atributos, 3 rasgos | pendiente 8.12° / 19.22° | OK
  nobile_rim_1       7 atributos, 8 rasgos | pendiente 7.7° / 23.59° | OK
  malapert_massif    7 atributos, 5 rasgos | pendiente 7.14° / 25.3° | OK
  de_gerlache_rim_2  7 atributos, 7 rasgos | pendiente 12.99° / 24.17° | OK
  ```
  (OK = `validate_file` sin errores; el contrato exige `source` no vacío en los atributos `available`). Ejemplo: `nearby[0]` de Malapert = Mons Malapert, massif, 7.93 km, «IAU/USGS Gazetteer…, Feature ID 16338 (Mons, montes), accessed 2026-10-21».
- **Decisiones tomadas:** las métricas de ventana y las horas por día (5.10) no se repiten aquí: el panel del sitio (T3.4.c) las lee de `windows/` y `daily/` (contrato §12). Se añade el atributo `region`, que aclara que el sitio es un punto representativo y no un lugar real de aterrizaje.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** ninguno.
- **Siguiente tarea:** T2.3.d.

## 2026-10-21 · T2.3.d · Terreno del sitio en niveles de detalle

- **Tarea:** T2.3.d — Terreno en LOD ([x]).
- **Qué se hizo:** `pipeline/terrain_lod.py` (`python -m pipeline.terrain_lod`). Por sitio, 3 niveles en ENU_SITE: lod0 ±20 km cada 400 m (101²), lod1 ±10 km cada 80 m (251²) y lod2 ±3 km cada 40 m (151²). Los nodos se colocan por distancia y azimut geodésicos desde el sitio; la altura es la coordenada Arriba del ENU, con la caída por curvatura incluida. int16 × 0.25 m, con cabecera JSON del contrato §13 (convenciones ENU_SITE añadidas). Comando en `CLAUDE.md`.
- **Cómo se verificó:**
  ```
  $ python -m pipeline.terrain_lod
  malapert_massif    lod0: 101×101 nodos cada 400 m (±20 km)    20.8 kB
  malapert_massif    lod1: 251×251 nodos cada 80 m (±10 km)   126.4 kB
  malapert_massif    lod2: 151×151 nodos cada 40 m (±3 km)    46.0 kB
  ... (5 sitios)
  Total 0.97 MB en 0.9 s; contrato: OK
  $ python -m pytest pipeline/tests/test_terrain_lod.py -q
  16 passed     (ida y vuelta int16 ≤ 0.125 m; por sitio y LOD: binario = byte_length, nodo central = sitio con z ≈ 0,
                 50 nodos al azar frente al DEM − h0 − d²/2R: error < 1 m)
  ```
- **Decisiones tomadas:** terreno simplificado del MVP (D9). La curvatura va en la altura para que el zoom final a escala real (5.9) muestre el horizonte curvo. Número impar de nodos (nodo en el sitio): la primera versión de lod0 (cada 320 m) tenía 126 nodos sin nodo central; la prueba lo detectó y pasó a 400 m.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** ninguno (≈ 0.2 MB por sitio; presupuesto en T2.4.b).
- **Siguiente tarea:** T2.3.e.

## 2026-10-21 · T2.3.e · Contexto polar de baja resolución para el zoom

- **Tarea:** T2.3.e — Contexto polar ([x]).
- **Qué se hizo:** en `pipeline/terrain_lod.py`, `build_polar` → `terrain/_polar/lod0`: frame POLAR_STEREO (proyección del DEM en `projection`), 303×303 nodos cada 2 km (±302 km, casi todo 80–90°S), a partir del DEM promediado a 2 km. Alturas sobre la esfera de 1737.4 km, relativas a la altura del polo (`origin.elevation_m` = 1026.7 m), en int16 × 0.5 m; sin curvatura añadida (coordenadas de mapa). `plot_polar` genera la vista previa `docs/figures/polar_context.png`. `write_lod` y `encode` aceptan ahora la escala por nivel.
- **Cómo se verificó:**
  ```
  $ python -m pipeline.terrain_lod
  _polar             lod0: 303×303 nodos cada 2000 m (±302 km, origen en el polo z = 1026.7 m)   184.1 kB
  Total 1.15 MB en 2.5 s; contrato: OK
  $ python -m pytest pipeline/tests/test_terrain_lod.py -q → 17 passed   (incluye test_polar_context)
  ```
  Vista previa revisada: los 5 sitios y la región polar (Shackleton junto al centro, Malapert y Nobile al norte del mapa) se reconocen igual que en `sites_map.png`.
- **Decisiones tomadas:** escala de 0.5 m en el nivel polar (rango de ±7.3 km respecto al polo); los niveles de los sitios siguen con 0.25 m. La altura del polo en el nivel de 2 km (1026.7 m) es menor que la del píxel de 40 m (1285.9 m) porque el promedio mezcla el borde de Shackleton con su interior; es esperable y queda en la cabecera.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** ninguno. T2.3 completa.
- **Siguiente tarea:** T2.4.a.

## 2026-10-21 · T2.4.a · build_all.py y manifest.json

- **Tarea:** T2.4.a — `build_all.py` y `manifest.json` ([x]).
- **Qué se hizo:** `pipeline/build_all.py` (`python -m pipeline.build_all`). Ejecuta los 9 pasos del pipeline (efemérides → horizontes → banderas → ventanas → planes → escena → trayectorias → características → terreno) y ensambla `web/public/data/` en el formato del contrato:
  - series cuantizadas a 0.01° con las banderas;
  - máscaras a 3 decimales;
  - el resto copiado de `pipeline/out/`.
  `manifest.json` lleva todos los parámetros (D4, D5, D8, D12, criterio del Sol, horizonte con `clip_negative: false`, kernels cargados, DEM), `data_status: "REAL"` y `files` con bytes y sha256. `data_version` y `generated_utc` salen del commit de git (deterministas). `--assemble` solo reensambla. `terrain_lod` admite `--no-plots`. Comandos en `CLAUDE.md` y `README.md`.
- **Cómo se verificó:** con `web/public/data/` vacío (solo `.gitkeep`):
  ```
  $ python -m pipeline.build_all
  == efemérides de los sitios (6.5 s) | == máscaras de horizonte (11.2 s) | == banderas (0.2 s) | == ventanas (0.6 s)
  == planes (0.4 s) | == escena (0.8 s) | == trayectorias ILLUSTRATIVE (14.3 s) | == características (0.2 s) | == terreno (1.2 s)
  == ensamblado de web/public/data
  1895 archivos, 15.69 MB; data_version 455c37685b-dirty; validación del contrato: OK
  Total 42.7 s     (exit 0)
  $ python -m pipeline.validate web/public/data
  OK: web/public/data cumple el contrato 1.0.0
  ```
  Manifiesto: `data_status` REAL, 5 sitios; llegadas 2027-01-01 → 2027-12-31; series hasta 2028-01-15; escena desde 2026-12-28; `trajectory_mode` ILLUSTRATIVE; `scale_mode` `exaggerated_bodies_compressed_distances` (D8); MOON_ME / J2000; 5 kernels; DEM LDEM_80S_40MPP_ADJ.
- **Decisiones tomadas:** manifiesto determinista (versión del commit; `-dirty` si hay cambios sin commit en `pipeline/`). El punto de control de Shackleton no se publica.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** decidir en T2.4.b si se versiona `web/public/data/` (15.7 MB).
- **Siguiente tarea:** T2.4.b.

## 2026-10-21 · T2.4.b · Reproducibilidad y presupuesto de tamaño

- **Tarea:** T2.4.b — Reproducibilidad y presupuesto ([x]).
- **Qué se hizo:** dos ejecuciones completas de `build_all` desde cero (con `pipeline/out/` borrado), comparación de los sha256 de todos los archivos de `web/public/data/` e informe de tamaños por categoría. **Decisión: `web/public/data/` se versiona** (ya no lo excluye `.gitignore`).
- **Cómo se verificó:**
  ```
  ejecución 1: 1895 archivos, 15.69 MB; data_version 2c2f11dad7; validación del contrato: OK   (40.7 s)
  ejecución 2: 1895 archivos, 15.69 MB; data_version 2c2f11dad7; validación del contrato: OK   (37.5 s)
  sha256 de 1896 archivos (incluido manifest.json): DIFF VACÍO, las dos ejecuciones producen archivos idénticos

  series y ventanas (8.7: < 15 MB)            4.33 MB  (gzip 0.62 MB)   → OK
  escena 3D                                   1.58 MB  (gzip 0.64 MB)
  trayectorias (bajo demanda)                 8.62 MB  (gzip 3.99 MB)
  terreno (bajo demanda)                      1.15 MB  (gzip 0.98 MB)
  manifest.json                               0.28 MB
  TOTAL datos                                15.97 MB  (gzip 6.23 MB)
  D13 < 50 MB: datos 15.97 + texturas web estimadas 3.09 = 19.06 MB → OK
  ```
- **Decisiones tomadas:** **versionar `web/public/data/`**. Sin estos archivos, el hosting estático (T7.1) y el trabajo en el front end exigirían ejecutar el pipeline, con ~760 MB de datos externos, Python y descargas manuales. Para no inflar el historial, solo se regenera cuando cambie la ciencia o el contrato.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** cada regeneración añade ~16 MB al historial de git. Si llegara a ser un problema, se movería a Git LFS o a un artefacto de release.
- **Siguiente tarea:** cierre de la Fase 2 → hito de demo.

## 2026-10-21 · HITO FASE 2 · Datos de la escena y del viaje cerrados

- **Estado de la guía:** Fases 0, 1 y 2 completas (16 + 21 + 13 subtareas). Total: 50 [x], 58 [ ], 0 [!].
- **Comprobación del hito:**
  ```
  $ python -m pytest -q                            → 273 passed
  $ python -m pipeline.validate web/public/data    → OK: web/public/data cumple el contrato 1.0.0
  $ python -m pipeline.build_all                   → 1895 archivos, 15.69 MB; validación del contrato: OK (31.7 s)
    regenerar sobre el commit siguiente solo cambia manifest.json (data_version y generated_utc): datos idénticos
  $ npm --prefix web test                          → Tests 37 passed
  ```
  Figuras: `docs/figures/trajectory_examples.png` y `docs/figures/polar_context.png`.
- **Resultados clave de la Fase 2:**
  - Escena (J2000, cada hora, 2026-12-28 → 2028-01-15): cuaterniones verificados contra SPICE; fase lunar frente a Horizons con un error ≤ 0.134 puntos; dirección del Sol 0.000000°; posición de la Luna ≤ 0.07 km. **Interpolación cúbica de posiciones obligatoria** (la lineal da 5 km de error).
  - 1 825 trayectorias ILLUSTRATIVE (14 s), continuas, que aterrizan en el sitio a la hora (< 1 km).
  - Características: pendientes (7–13° de media en 1 km) y rasgos IAU cercanos con Feature ID.
  - Terreno: 3 niveles por sitio + contexto polar de 2 km (1.15 MB).
  - Build reproducible byte a byte; 15.97 MB de datos (6.2 MB con gzip), dentro de D13.
- **Siguiente tarea:** Fase 3. T3.1.a depende de la Pista S (TS.1.c); con los datos reales ya disponibles se propone omitir esa pista (pendiente de confirmación del humano).

## 2026-10-21 · DECISIONES · A4: Pista S omitida (cambio en la guía)

- **Qué:** el humano decidió omitir la Pista S (generador de datos SYNTHETIC) porque los datos reales del pipeline ya existen (Fase 2) y están versionados en `web/public/data/`. También autorizó el push.
- **Cambios en la guía (paso h):**
  - TS.1.a–c marcadas `[x] (OMITIDA)` con nota.
  - T3.1.a y T4.1.c dependen ahora de **T2.4.b** en lugar de TS.1.c.
  - La introducción de la Fase 3 dice que se desarrolla sobre los datos reales; T3.5.a queda como verificación final (paridad Python ↔ TS y tiempo de carga).
  - La aceptación de T3.1.a prueba el aviso SYNTHETIC con las fixtures del contrato y la ausencia de aviso con los datos REAL.
  - `CLAUDE.md`: comando SYNTHETIC «omitido (A4)» y mapa de archivos actualizado. `docs/DECISIONS.md`: fila A4. `README.md`: estado actualizado.
  - Comprobación de la guía (IDs, dependencias, campos): 0 errores.
- **Por qué no se desvía de la spec:** la sección 14 propone los datos sintéticos como *mitigación* para no esperar al pipeline; ese riesgo ya no existe. La regla 1 (marcar lo SYNTHETIC) se mantiene en el cargador.
- **Siguiente tarea:** T3.1.a.

## 2026-10-21 · T3.1.a · Carga de datos validada y aviso SYNTHETIC

- **Tarea:** T3.1.a — Carga de datos validada ([x]).
- **Qué se hizo:**
  - `web/src/lib/data.ts`: `DataStore` con `loadCore` (manifest + sites + plans, para el shell inicial) y carga bajo demanda de horizon, timeseries, daily, windows, site_features, trajectory, scene y terrain (cabecera + int16 → Float32Array en metros). Valida con zod, guarda en caché (con reintento si falla), aplica las comprobaciones cruzadas del contrato §14 que dependen del archivo cargado y lanza errores tipados `DataError` (`network`, `parse`, `validation`, `consistency`).
  - Carpeta de datos `data` por defecto, o `?data=<carpeta>` saneado.
  - `web/src/components/SyntheticBanner.tsx`: aviso permanente («SYNTHETIC DATA», `role="alert"`) si `data_status` es SYNTHETIC.
  - `App.tsx`: estados de carga, error y listo, con un resumen del conjunto de datos.
  - `web/tests/data.test.ts` (8 pruebas).
  - `.claude/launch.json` para abrir el servidor de desarrollo en el navegador integrado.
- **Cómo se verificó:**
  ```
  $ npm --prefix web test -- data   → Tests 8 passed (8)
    loads the core shell and it is REAL (no SYNTHETIC banner)          (5 sitios, 5475 planes)
    loads per-site files on demand and validates them                  (timeseries n=18192, windows 365, horizon 360, trayectoria ILLUSTRATIVE, terreno con nodo central ≈ 0)
    caches: a second request does not refetch
    rejects an invalid file with a validation error                    («elev_deg has 3 values…»)
    reports a missing file as a network error
    applies the cross-file checks of contract §14                      (site_id interno distinto → consistency)
    raises the permanent SYNTHETIC banner                              (fixtures del contrato)
    defaults to data and accepts a safe override                       (?data=../secret → data)
  $ npm --prefix web run typecheck  → exit 0
  $ npm --prefix web test           → Tests 45 passed
  ```
  En el navegador integrado (servidor de desarrollo): «5 sites, 5475 mission plans, arrivals 2027-01-01 to 2027-12-31 (REAL data, version 2c2f11dad7).»; sin aviso SYNTHETIC; sin errores en consola; `manifest.json`, `sites.json` y `plans.json` devuelven 200.
- **Decisiones tomadas:** las pruebas renderizan el aviso con `react-dom/server` (sin jsdom). La carga de `terrain` decodifica el int16 en el cliente.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:**
  - En desarrollo cada archivo se pide dos veces porque React StrictMode monta el efecto dos veces y crea dos `DataStore`. Se resuelve en T3.1.b con un único store en el estado global; en producción no ocurre.
  - Durante la revisión apareció `web/public/data/manifest.json` regenerado sobre un commit posterior (solo cambiaban `data_version` y `generated_utc`; los datos eran idénticos). No se identificó qué ejecución lo produjo. Se restauró la versión con commit.
- **Siguiente tarea:** T3.1.b.

## 2026-10-21 · T3.1.b · Estado global (Zustand)

- **Tarea:** T3.1.b — Estado global ([x]).
- **Qué se hizo:**
  - `web/src/store/appStore.ts`: store vanilla de zustand (`createAppStore`) con el estado de la spec 8 (`plans`, `comparePlans` hasta 5, `selectedPlanId`, `selectedSite`, `selectedWindow`, `constraints` {X, Y, Z} opcionales, `missionPhase`, `missionTime` en ms UTC, `compareTime` en horas desde la llegada), estado de carga y `notice` para mensajes al usuario.
  - Acciones: `loadCore` idempotente, `selectPlan` (fija sitio, ventana y reloj de misión), `pinPlan` (máximo 5, con aviso), `unpinPlan`, `setConstraints`, `setWindow`, `setMissionPhase`, `setMissionTime`, `setCompareTime` (limitado a 14 días).
  - Un único `appStore` con un único `DataStore` y el hook `useApp`. `App.tsx` usa el store. Dependencia `zustand` 5.0.15 (exacta).
- **Cómo se verificó:**
  ```
  $ npm --prefix web test   → Tests 51 passed (6 nuevas en store.test.ts)
    loads the core data once
    selecting a plan updates site, window and mission clock
    the tray holds at most 5 plans; a sixth is rejected with a notice
    compareTime and missionTime are independent clocks
    constraints are optional and patchable
    window length must be one of the manifest values
  $ npm --prefix web run typecheck → exit 0
  ```
  En el navegador: una sola petición por archivo (manifest, sites, plans), frente a dos antes (StrictMode); el resumen de los datos REAL se muestra correctamente.
- **Decisiones tomadas:** `selectedWindow` es la L del calendario (3, 7, 14). `compareTime` se mide en horas desde la llegada (spec 8.1: «día y hora desde la llegada»). `missionTime` es un instante absoluto (ms UTC).
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** el problema de T3.1.a (peticiones duplicadas en desarrollo) queda resuelto.
- **Siguiente tarea:** T3.1.c.

## 2026-10-21 · T3.1.c · Tokens visuales, disposición base y textos en inglés

- **Tarea:** T3.1.c — Tokens, disposición y textos ([x]).
- **Qué se hizo:**
  - `web/src/styles/tokens.ts`: **fuente única** de colores (los 7 de la spec 9 tal cual, más tonos de UI derivados), espaciado, tipografía para proyector y duraciones de transición (200/400 ms). `applyTokens()` los publica como variables CSS al arrancar; la escena 3D usará las mismas constantes.
  - `tokens.css`: estilos base sin un solo color hexadecimal, foco visible, `prefers-reduced-motion` y disposición responsive.
  - `web/src/lib/strings.ts`: todos los textos en inglés (D2), centralizados para poder traducirlos.
  - `web/src/views/CompareView.tsx`: modo comparar (spec 8.0) con restricciones, calendario y bandeja como huecos para T3.2 y T3.3. Cabecera con insignia de datos y pie con créditos.
  - `web/tests/tokens.test.ts`.
- **Cómo se verificó:**
  ```
  $ npm --prefix web test           → Tests 55 passed
    keeps the seven spec colours | no hex colour appears outside styles/tokens.ts | exposes every colour as a CSS custom property | UI strings are centralised and in English
  $ grep -rnE "#[0-9a-fA-F]{3,8}" web/src (sin styles/tokens.ts) → ningún resultado
  $ npm --prefix web run typecheck  → exit 0
  ```
  Captura a 1920×1080 en el navegador integrado, revisada: tema oscuro tipo centro de control; cabecera «PolePlanner — Lunar south pole landing planner» con la insignia «REAL data · 2c2f11dad7»; fila de «Mission constraints» y «Arrival calendar (365 arrival days × 5 sites)»; «Comparison tray» con su estado vacío; pie con los créditos de NASA/LOLA, NAIF/SPICE, Horizons y USGS y la nota ILLUSTRATIVE.
- **Decisiones tomadas:** los tonos derivados (borde, texto atenuado, foco, peligro…) son de diseño. Si el humano quiere ajustar la paleta, solo se toca `tokens.ts`.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** la revisión visual definitiva con el humano es T5.2.e.
- **Siguiente tarea:** T3.1.d.

## 2026-10-21 · T3.1.d · Filtrado por restricciones e índice de métricas

- **Tarea:** T3.1.d — Filtrado e índice ([x]).
- **Qué se hizo:** `web/src/lib/constraints.ts` con funciones puras:
  - `meetsConstraints`: regla de 5.6, igual que `pipeline/windows.py` (límites incluidos; `null` = control desactivado).
  - `buildWindowIndex`: un `Float32Array` por métrica, ordenado [sitio][día].
  - `validMask`: máscara Uint8 de celdas válidas, reutilizable sin crear memoria nueva.
  - `lookup`, `dayIndex` y `countValid`.
  Pruebas en `web/tests/constraints.test.ts`.
- **Cómo se verificó:**
  ```
  $ npm --prefix web test -- constraints
  validMask: 0.039 ms per update (5 sites × 365 days × 3 L = 5475 cells)
  Tests 4 passed
    is optional and inclusive, like pipeline/windows.py
    indexes every cell and looks up known values           (Haworth, L=7, 2027-03-10 frente al JSON)
    the mask agrees with meetsConstraints cell by cell     (3 L × 5 sitios × 365 días)
    re-filters all 5 sites × 365 days × 3 L in under 10 ms
  $ npm --prefix web test → 59 passed;  typecheck → exit 0
  ```
  0.039 ms por actualización, frente al objetivo de < 10 ms (8.7 pide < 100 ms para todo el repintado).
- **Decisiones tomadas:** almacenamiento Float32. La máscara compara contra el límite redondeado a Float32 (`Math.fround`), para que la igualdad en el límite se mantenga.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** ninguno. T3.1 completa.
- **Siguiente tarea:** T3.2.a.

## 2026-10-21 · T3.2.a · Mapa de calor del calendario en canvas

- **Tarea:** T3.2.a — Mapa de calor ([x]).
- **Qué se hizo:**
  - `web/src/views/Calendar.tsx`: canvas 2D (sin WebGL, regla 7) con un mapa de calor de llegadas; modo de color *Combined score* / *Energy* / *Comms*; selector de L (3, 7, 14) ligado a `selectedWindow`; leyenda con rampa y dominio; tooltip por celda (sitio, llegada, sol, oscuridad, Tierra, score).
  - `web/src/lib/calendar.ts`: geometría pura (celda ↔ píxel, filas separadas 2 px, meses) e índices de color.
  - `web/src/lib/colorScale.ts`: rampas secuenciales interpoladas en OKLab desde los tokens; cada modo usa el color de la spec 9 (combinado = verde «ambos», energía = naranja Sol, comunicaciones = azul Tierra), del fondo hasta el color puro; dominios fijos (score 0–1, sol 0–100 %, Tierra 0–24 h/día).
  - En el store: `loadWindows(L)` construye y guarda el `WindowIndex` (lo compartirá la bandeja).
  - Textos en `strings.ts` y estilos (`.segmented`, `.legend`, `.tooltip`) con tokens.
  Se siguió la guía de visualización (forma: mapa de calor secuencial de una tonalidad; color al final; hover por celda; leyenda).
- **Cómo se verificó:**
  ```
  $ npm --prefix web test           → Tests 66 passed
    calendar.test.ts: changing the mode changes the colour source | changing L changes the colour source |
    combined/energy/comms ramp gets lighter monotonically | maps cells to pixels and back | labels months and dates
  $ npm --prefix web run typecheck  → exit 0
  ```
  En el navegador a 1920×1080: 5 filas de sitios × 365 columnas con los meses arriba, 162 px de alto; el canvas (1 422 px) cabe en su panel y no hay scroll horizontal. Tooltip sobre Haworth, 10/03/2027, L = 7: «Sunlight 38.1 % · Longest dark 65.5 h · Earth 24.0 h/day (min 24.0) · Score 0.64», idéntico al informe del pipeline de T1.5.c. En el modo *Energy* se ven claramente las noches lunares como bandas oscuras.
- **Decisiones tomadas:**
  - **A5 (propuesta, revisable): calendario transpuesto**, con una fila por sitio y una columna por día. La spec 8.5 dice filas = días, pero 365 filas no caben en el calendario compacto de arriba (8.0) en 1920×1080. Registrada en `docs/DECISIONS.md`.
  - Primera versión de las rampas con un tinte más claro por encima del color: se salía del gamut sRGB y perdía luminosidad (la prueba lo detectó). Ahora acaban en el color puro del token.
- **Desviaciones de la spec / cambios en la guía:** A5 (orientación del calendario).
- **Problemas abiertos:** el resaltado de celdas válidas y la atenuación son de T3.2.b; la selección, el anclaje y el arrastre, de T3.2.c.
- **Siguiente tarea:** T3.2.b.

## 2026-10-21 · T3.2.b · Controles de restricciones

- **Tarea:** T3.2.b — Controles de restricciones ([x]).
- **Qué se hizo:**
  - `web/src/components/ConstraintControls.tsx`: tres deslizadores nativos (accesibles con teclado, con `aria-valuetext`). X = sol mínimo (0–100 %), Y = oscuridad máxima (0–24·L h) y Z = Tierra mínima (0–24 h/día, paso de 0.5). Cada uno tiene una casilla para activarlo (desactivado = no se evalúa, 5.6), una explicación en una línea y un recuento en vivo («N of M L-day plans meet the constraints», `aria-live`).
  - `Calendar.tsx`: máscara `validMask` memorizada; las celdas que no cumplen se atenúan (alfa 0.22) y se **rayan en diagonal** (patrón además del color, spec 9).
  - Medición del control al dibujo (`performance.mark/measure`; `data-last-update-ms` y `data-last-frame-ms` en el canvas).
  - En el store, `validCount`. Textos y estilos con tokens.
- **Cómo se verificó:** en el navegador integrado, con el panel visible (oculto, el navegador frena el dibujo y `requestAnimationFrame`), moviendo cada deslizador:
  ```
  sun  40→95 %: recuento 1584 → 1110; dibujo 9.5–18.0 ms; siguiente fotograma 13.2–22.9 ms
  dark 100→12 h (con sol ≥ 95 %): 1110 sin cambios (≥ 95 % de sol en 7 días implica ≤ 8.4 h de oscuridad); dibujo 8.8–11.6 ms
  earth 4→12 h/día: 501 → 480; dibujo 9.9–12.1 ms
  máximo: dibujo 18.0 ms, fotograma 22.9 ms  (< 100 ms, spec 8.7) ✓
  ```
  Revisión visual: con las tres restricciones activas, las ventanas válidas se ven como bloques claros y el resto atenuado y rayado. Disposición apilada correcta en un panel estrecho (800 px). `npm test` → 66 passed; typecheck → exit 0.
- **Decisiones tomadas:** valores iniciales al activar un control: 70 % de sol, 48 h de oscuridad (o 24·L si es menor) y 8 h/día de Tierra; son de diseño. La medición es síncrona al dibujar, más el fotograma cuando el navegador lo da.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** la primera medición usaba solo `requestAnimationFrame` y repetía el mismo valor con el panel oculto; corregida.
- **Siguiente tarea:** T3.2.c.

## 2026-10-21 · T3.2.c · Selección, anclaje y rango

- **Tarea:** T3.2.c — Selección, anclaje y rango ([x]).
- **Qué se hizo:** en `web/src/views/Calendar.tsx`:
  - Clic: selecciona el plan (`selectPlan`; contorno blanco con anillo del color de fondo).
  - Doble clic, botón «Pin selected plan» o Enter: anclan el plan (máximo 5; aviso visible si la bandeja está llena; contador «n/5 pinned»; marcador triangular sobre las celdas ancladas, una forma y no solo un color).
  - Arrastre: selecciona un rango (contorno discontinuo; resumen «Range: N arrival days × M sites (K valid)»; «Pin best 3» y «Clear range»).
  - Flechas: mueven la selección; el canvas es enfocable con teclado.
  - Al cambiar L se conservan el sitio y la llegada seleccionados.
  En `lib/calendar.ts`: `planIdFor`, `makeRange` y `bestInRange`, que **diversifica** (primero el mejor plan de cada sitio; repite sitio solo si hay menos sitios que planes pedidos, y con llegadas separadas al menos L días). En el store: `selectedRange`. Dependencias de desarrollo exactas: `jsdom` 29.1.1, `@testing-library/react` 16.3.3 y `@testing-library/dom` 10.4.2.
- **Cómo se verificó:**
  ```
  $ npm --prefix web test   → Tests 72 passed
    calendar.test.tsx (jsdom + Testing Library):
      click selects the plan in the global state                 (Haworth, día 68 → haworth_20270310_7d)
      double-click pins to the tray; the 6th pin is rejected     (aviso «at most 5» visible)
      drag selects a range and 'Pin best' pins its best cells
      arrow keys move the selection and Enter pins it
    calendar.test.ts: takes the best plan of distinct sites first | repeats a site only with arrivals at least L days apart
  $ npm --prefix web run typecheck → exit 0
  ```
  En el navegador integrado, con el ratón real: el arrastre de Connecting Ridge (abril) a Nobile Rim 1 (junio) da «66 arrival days × 3 sites (198 valid)»; «Pin best 3» → «3/5 pinned» con un marcador en cada uno de los 3 sitios.
- **Decisiones tomadas:** «Pin best» diversificado. La primera versión elegía días consecutivos de un mismo sitio, por los empates a score 1.0 de T1.4.d, y eso no sirve para comparar. Acciones accesibles con ratón y con teclado.
- **Desviaciones de la spec / cambios en la guía:** ninguno. La spec dice «Arrastre: selecciona un rango» sin fijar qué hace el rango; se añade «Pin best 3» para el paso 2 del guion de la demo.
- **Problemas abiertos:** ninguno. T3.2 completa.
- **Siguiente tarea:** T3.3.a.

## 2026-10-21 · T3.3.a · Panel y cuadrícula de la bandeja

- **Tarea:** T3.3.a — Panel y cuadrícula de la bandeja ([x]).
- **Qué se hizo:**
  - `web/src/lib/planData.ts`: `loadPlanData` (plan, sitio, máscara, serie recortada a `[llegada, llegada + L)` en grados, fila de métricas) y `sampleAt` (muestra en horas desde la llegada).
  - `web/src/lib/scale.ts`: `sharedElevationScale`, un único rango vertical para todos los paneles visibles (máscaras y trayectorias del Sol y la Tierra).
  - `web/src/panels2d/PlanPanel.tsx`: cabecera (sitio, llegada, L), insignia ILLUSTRATIVE (borde punteado y tooltip con la explicación), botón × para quitarlo, título que selecciona el plan, y huecos para la silueta, la cinta y las métricas.
  - `web/src/panels2d/Tray.tsx`: cuadrícula de columnas iguales (2 a 5), carga los datos de cada plan y comparte la escala. En móvil la bandeja se desliza en horizontal (scroll-snap).
  - `Calendar.tsx`: lee el ancho inicial del contenedor al montarse. Con el panel del navegador oculto, el ResizeObserver no informaba y el calendario no se dibujaba nunca.
- **Cómo se verificó:**
  ```
  $ npm --prefix web test   → Tests 75 passed
    tray.test.tsx: slices the window of a plan from the site series (sun_pct recortado = 38.1 % del JSON)
                   renders one identical panel per pinned plan, all with the same vertical scale
                   the shared scale covers every mask and track
  $ npm --prefix web run typecheck → exit 0
  ```
  En el navegador a 1920×1080, anclando desde el calendario: 2 paneles de 891×377 px, 3 de 589×377 y 5 de 347×377, todos con escala «-5:11», sin scroll horizontal. Captura de 5 paneles revisada. Tras corregir el CSS, la insignia ILLUSTRATIVE queda dentro del panel en los 5 (el nombre largo «Connecting Ridge (Shackleton rim)» se recorta con «…»).
- **Decisiones tomadas:** paneles de 220 px de silueta, 56 px de cinta y métricas debajo, con formato idéntico (spec 9).
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** los botones de Chrome no encogen en filas flex sin `width: 0` (corregido). Robustez del calendario con la página en segundo plano (corregida).
- **Siguiente tarea:** T3.3.b.

## 2026-10-21 · T3.3.b · Silueta del horizonte con el Sol y la Tierra

- **Tarea:** T3.3.b — Silueta del horizonte con el Sol y la Tierra ([x]).
- **Qué se hizo:**
  - `web/src/lib/projection.ts`: proyección az/el → px compartida (la reutilizará el panorama de T3.4): `makeProjection` (ajuste al rango compartido o exageración vertical fija, con recentrado en cualquier azimut), `azToX`, `elToY`, `exaggerationOf`, `angularSizePx`, `silhouettePath` (máscara rellena hasta el borde inferior) y `trackPath` (trayectoria cortada en el salto 0/360°).
  - `web/src/panels2d/HorizonSilhouette.tsx`: solo SVG (regla 7). Rejilla cada 5° con el horizonte 0° punteado, trayectorias del Sol y la Tierra en toda la ventana, terreno encima (un astro detrás del terreno queda tapado, como en la realidad), puntos cardinales, la exageración real en la esquina y los marcadores en `compareTime`: relleno si el astro es visible y hueco si está bloqueado (forma además del color).
  - Estado `exaggeration` en el store y selector «Vertical: Fit / ×10 / ×20 / ×40» en la bandeja. Con exageración, el borde inferior queda anclado al mínimo del rango compartido para que el terreno nunca salga de la vista.
- **Cómo se verificó:**
  ```
  $ npm --prefix web test   → Tests 82 passed
    projection.test.ts: mapa az 0–360 y el; recentrado; exageración configurable y medida (×10 y ×20);
                        0.53° y 1.9° a escala angular; trayectorias cortadas en 0/360
    tray.test.tsx: draws SVG only (no WebGL) with the Sun and Earth at compareTime (muestra 140 = 70 h;
                   0 canvas y 0 llamadas a getContext("webgl*") en la bandeja)
                   marker fill follows the visibility flag of the sample
  $ npm --prefix web run typecheck → exit 0
  ```
  Revisión visual en el navegador integrado (800 px de ancho, 3 planes anclados con «Pin best 3»): siluetas de 577×220 px con la misma escala; en Connecting Ridge (llegada 2027-02-06) el Sol recorre ~90° de azimut rasante al horizonte en 7 días y la Tierra sube y baja casi en vertical (libración), como se espera cerca del polo. En la página solo hay un canvas, el 2D del calendario.
- **Decisiones tomadas:** el botón «Fit» no muestra un número fijo, porque la exageración depende del ancho del panel; cada silueta muestra su valor real («vertical ×N»). Primero se centró la vista exagerada en el rango y a ×20 el terreno salía por abajo; se ancló el borde inferior.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** ninguno.
- **Siguiente tarea:** T3.3.c.

## 2026-10-21 · T3.3.c · Cinta de tiempo

- **Tarea:** T3.3.c — Cinta de tiempo ([x]).
- **Qué se hizo:**
  - `web/src/lib/ribbon.ts` (archivo extra respecto a la guía, para probar la lógica sin DOM): `stateRuns` (rachas Sol / Tierra / ambos / ninguno), `longestZeroRun` (racha más larga sin Sol; en empate gana la primera) y `relativeLabel` («Day 2, 03:30» desde la llegada).
  - `web/src/panels2d/TimeRibbon.tsx`: SVG con dos carriles, Sol arriba y Tierra abajo. Un carril encendido toma el color del estado (naranja = solo Sol, azul = solo Tierra, verde = ambos) y «ninguno» deja los dos carriles en el color de oscuridad, así que el estado se lee por posición además de por color (spec 9). Líneas de cambio de día, la racha de oscuridad más larga con contorno discontinuo y su duración en texto, cursor de `compareTime` y `aria-label` con la duración y el inicio de la racha.
- **Cómo se verificó:**
  ```
  $ npx vitest run tests/ribbon.test.ts --reporter=verbose
  ribbon: 5475 windows checked, max |Δ longest_dark_h| = 0 h
   ✓ groups samples into Sun / Earth / both / none runs
   ✓ finds the longest zero run, including one touching the end; first wins ties
   ✓ labels samples relative to arrival
   ✓ matches windows/{site}_{L}d.json for all plans
  $ npm --prefix web test   → Tests 86 passed
  $ npm --prefix web run typecheck → exit 0
  ```
  La racha resaltada coincide con `longest_dark_h` en las 5 475 ventanas (5 sitios × 3 duraciones × 365 llegadas). En el navegador: Haworth 2027-03-09 (7 d) muestra «Longest dark: 89.5 h» (el JSON da 89.5) al principio de la ventana, con solo Tierra en azul durante la noche, y luego ambos en verde. Los tres planes de «Pin best 3» tienen Sol y Tierra todo el tiempo y muestran «No dark stretch».
- **Decisiones tomadas:** dos carriles en lugar de una franja de cuatro colores, para que el estado no dependa solo del color.
- **Desviaciones de la spec / cambios en la guía:** archivo extra `web/src/lib/ribbon.ts`.
- **Problemas abiertos:** «Pin best 3» elige planes casi idénticos (todo verde), por la saturación del score (T1.4.d). Lo trata el desempate de T3.3.d.
- **Siguiente tarea:** T3.3.d.

## 2026-10-21 · T3.3.d · Cuadro de métricas, texto «why» e insignias de mejor

- **Tarea:** T3.3.d — Cuadro de métricas, texto "why" e insignias de mejor ([x]).
- **Qué se hizo:**
  - `web/src/lib/why.ts`: `METRICS` (las seis de 8.1, en su orden y con su dirección: más es mejor, salvo `longest_dark_h` y `longest_comm_gap_h`), `bestBadges` y `whyText`.
  - Regla de empates: todos los planes que alcanzan el mejor valor llevan la insignia. Si **todos** los paneles visibles empatan en una métrica, nadie la lleva, porque esa métrica no los distingue. Con un solo plan no hay insignias.
  - `whyText`: en inglés y solo con cifras del propio plan. Cita hasta dos puntos fuertes por prioridad (Sol, oscuridad, Tierra mínima, cortes de enlace, Tierra media y, en último lugar, el score, que resume a los demás). Añade un aviso si la oscuridad pasa de 48 h o la Tierra baja de 12 h/día. Sin insignias, describe Sol y oscuridad.
  - `web/src/panels2d/MetricsBox.tsx`: lista con cifras tabulares e insignia «★ Best» (estrella y palabra, además del color) con tooltip. La bandeja calcula las insignias una vez por conjunto de planes visibles.
- **Cómo se verificó:**
  ```
  $ npm --prefix web test   → Tests 93 passed
    why.test.ts: go to the right panel per metric, in the right direction
                 ties share the badge; a metric where everyone ties gets none
                 one plan alone gets no badges
                 follows the spec example → "Best option for 92% sunlight and a longest dark of only 14 h."
                 cites the plan's real figures for every window of the data (≥ 150 textos: cada número del texto es una métrica del plan)
                 warns about long darkness even when the plan is best at something else
    tray.test.tsx: puts each best badge on the right panel (Haworth 2027-03-09 vs Malapert 2027-10-15, datos reales)
  $ npm --prefix web run typecheck → exit 0
  ```
  En el navegador, con 4 planes: los tres de «Pin best 3» (100 % de Sol, 0 h de oscuridad, score 1.00) comparten las insignias de Sol, oscuridad y score con «Best option for 100% sunlight and no dark stretch.»; Haworth 2027-03-09 no lleva ninguna y dice «38.1% sunlight, longest dark 89.5 h.». La Tierra (24 h/día en todos) no lleva insignia.
- **Decisiones tomadas:** la regla de empates descrita arriba. El texto de la spec («Mejor opción por 92% de sol y oscuridad máxima de 14 h») se reproduce tal cual en inglés.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** «Pin best 3» (T3.2.c) tiende a elegir planes con score 1.00 que empatan en todo, por la saturación del score (T1.4.d). Las insignias lo muestran bien (empate compartido), pero la comparación resultante dice poco. Posible mejora fuera de esta subtarea: desempatar en `bestInRange` por `earth_h_mean` o por margen de Sol.
- **Siguiente tarea:** T3.3.e.

## 2026-10-21 · T3.3.e · Scrubber global de compareTime

- **Tarea:** T3.3.e — Scrubber global de compareTime ([x]).
- **Qué se hizo:**
  - `web/src/components/CompareScrubber.tsx`: reloj relativo «Day N, hh:mm» desde la llegada, compartido por todos los paneles. Deslizador con pasos de 30 min (una muestra), hasta la ventana más larga de la bandeja. Botones −1d, −1h, +1h y +1d, reproducción a 6 h por segundo con pausa y `aria-valuetext`. `data-last-update-ms` guarda el tiempo desde el evento hasta el final del commit que redibuja todos los paneles.
  - Rendimiento: `HorizonSilhouette`, `TimeRibbon` y `MetricsBox` con `memo`; los trazados del terreno y de las trayectorias se memorizan (solo dependen del tamaño, la escala y los datos). Al mover el reloj solo cambian los marcadores y el cursor.
  - Si el reloj pasa del final de la ventana de un plan más corto (bandeja con L mezcladas), su silueta muestra «Window over» en lugar de congelar los astros en la última muestra.
  - Seleccionar un panel (título) fija `selectedPlanId` (ya existía desde T3.3.a; ahora tiene prueba).
- **Cómo se verificó:**
  ```
  $ npm --prefix web test   → Tests 95 passed
    tray.test.tsx: moves every panel at once and records the update time (5 paneles, muestra 101 en todos)
                   selecting a panel sets selectedPlanId
  $ npm --prefix web run typecheck → exit 0
  ```
  En el navegador integrado a 1920×1080, con el panel visible y 5 planes de 347 px (uno por sitio):
  ```
  60 movimientos del deslizador: allPanelsMovedTogether = true
    evento → DOM actualizado:  mediana 4.3 ms · p95 20.0 ms · máx 30.1 ms
    commit (data-last-update-ms): mediana 3.8 ms · p95 19.5 ms · máx 28.2 ms
  20 movimientos hasta el fotograma pintado (doble rAF, incluye ~2 × 16.7 ms de espera):
    mediana 33.3 ms · máx 36.7 ms          → < 100 ms
  Reproducción: 70 h → 82 h en 2 s (6 h/s), muestra 164 en los 5 paneles
  ```
  Con el panel del navegador oculto, la medida con rAF da ~1 s (el navegador limita los fotogramas en segundo plano). Por eso se repitió con el panel visible. En la captura de los 5 paneles las diferencias se ven sin leer números: la cinta naranja (solo Sol, sin Tierra) de Nobile, Malapert y de Gerlache frente a la verde de Connecting Ridge, y la noche azul de Haworth al principio.
- **Decisiones tomadas:** velocidad de reproducción de 6 h/s (una ventana de 7 días en 28 s); «Window over» para planes más cortos.
- **Desviaciones de la spec / cambios en la guía:** ninguno. La transición al modo vivir al seleccionar llega con la Fase 4 (la escena 3D aún no existe).
- **Problemas abiertos:** ninguno. T3.3 completa.
- **Siguiente tarea:** T3.4.a.

## 2026-10-21 · T3.4.a · Panorama del horizonte 360° (Nivel A)

- **Tarea:** T3.4.a — Panorama del horizonte 360° (Nivel A) ([x]).
- **Qué se hizo:**
  - `web/src/lib/projection.ts`: la proyección compartida admite un campo de visión (`fov`: 360°, 120° o 60°) y `centredOn(az, fov)`. La silueta pone los puntos en el azimut real de cada celda de la máscara, así que funciona con cualquier azimut inicial, incluido el paso por 0°. Las siluetas de la bandeja siguen igual (fov 360 por defecto).
  - `web/src/views/Panorama.tsx`: X = azimut, centrado en N, E, S, W, el Sol o la Tierra; Y de −3° a 12° (se extiende hacia abajo solo si el terreno baja más), con «Fit», ×10 o ×20. Relleno del terreno, trayectorias del día UTC o de toda la ventana, discos del Sol (0.53°) y de la Tierra (1.9°) a la escala angular horizontal, rellenos si son visibles y huecos si están tapados, más un anillo discontinuo de referencia (no a escala, indicado en la imagen). Siempre se muestran la fecha y hora UTC, el az/el de los dos astros y el estado («Sunlit» / «In shadow», «Earth link» / «No Earth link») con icono y texto.
  - `web/src/views/SiteSection.tsx` (archivo extra): sección «At the site» bajo la bandeja, que carga el plan seleccionado y monta el panorama en `missionTime`. Ahí se montarán también el control de tiempo (T3.4.b) y el panel del sitio (T3.4.c). En la Fase 4 el modo vivir reutiliza las mismas piezas.
  - Corrección de un fallo de T3.2.a y T3.3.b/c, descubierto aquí: el canvas del calendario y los SVG de siluetas y cintas se dimensionan con el ancho medido de su contenedor, y ese ancho mantenía el contenedor ancho. Al encoger la ventana (1920 → 774 px) la página quedaba con 1840 px y scroll horizontal. Ahora llevan `max-width: 100%` y se redibujan al ancho nuevo.
- **Cómo se verificó:**
  ```
  $ npm --prefix web test   → Tests 103 passed
    panorama.test.tsx: Sun 0.53° and Earth 1.9° in px follow the horizontal scale of every field of view
                         (1800 px a 60° → Sol 15.9 px, Tierra 57 px de diámetro)
                       the rendered discs have those radii
                       elevation range −3° to 12°, extended down only if the terrain is lower
                       time → sample of the window, flagged outside it
                       always shows UTC time, az/el of both bodies and the light / link status from the data
                       recentres on the Sun: the Sun disc moves to the middle
                       draws no canvas (SVG only)
    projection.test.ts: a narrower field of view centred on any azimuth (cruce por 0°)
  $ npm --prefix web run typecheck → exit 0
  ```
  En el navegador: Haworth, 2027-03-18 00:00 UTC. El Sol está a az 81.4°, el −0.39°, detrás de una loma de ~2° → «In shadow». La Tierra está a az 22.4°, el +5.61° → «Earth link». Con 60° centrado en el Sol, el disco queda en el centro. Tras encoger la ventana, `scrollWidth` 759 ≤ `innerWidth` 774 y el calendario se redibuja a 709 px.
- **Decisiones tomadas:** los discos usan la escala horizontal, así que son círculos aunque haya exageración vertical. A 360° el Sol mide menos de 3 px, por eso el anillo de referencia y los campos de 120° y 60°. El panorama se ve, de momento, en la vista de comparación para el plan seleccionado.
- **Desviaciones de la spec / cambios en la guía:** la prueba es `panorama.test.tsx` (necesita jsdom), no `.ts`. Archivo extra `SiteSection.tsx`. La corrección del ancho va en este commit porque se encontró aquí y es de 4 líneas de CSS.
- **Problemas abiertos:** ninguno.
- **Siguiente tarea:** T3.4.b.

## 2026-10-21 · T3.4.b · Control de tiempo y coherencia con los paneles

- **Tarea:** T3.4.b — Control de tiempo y coherencia con los paneles ([x]).
- **Qué se hizo:**
  - `web/src/components/TimeControl.tsx`: deslizador de la ventana del plan seleccionado (pasos de 30 min) ligado a `missionTime`, el reloj que compartirá la escena 3D en la Fase 4. Reproducción a 1, 6 o 24 h/s con pausa, etiqueta «Day N, hh:mm» de la muestra en pantalla y botón «Match tray clock», que lleva `missionTime` a la llegada + `compareTime`.
  - Los marcadores de la silueta y los discos del panorama exponen su az/el en `data-az`/`data-el`, para comparar las dos vistas en las pruebas.
  - Botones de texto del scrubber de la bandeja: ancho automático. Con el ancho fijo de 28 px de `icon-btn`, «−1d» y «Match tray clock» se salían y ensanchaban la página.
- **Cómo se verificó:**
  ```
  $ npm --prefix web test   → Tests 105 passed
    panorama.test.tsx: at the same instant the panorama and the panel silhouette use exactly the same az/el
                         (Sol y Tierra, az, el y visibilidad idénticos en 0, 0.5, 13, 50.5, 99 y 167.5 h)
                       the time control moves missionTime within the plan window and can match the tray clock
  $ npm --prefix web run typecheck → exit 0
  ```
  La primera versión de «Match tray clock» leía `compareTime` del último render y la prueba lo detectó (70 h de diferencia); ahora lo lee del store al hacer clic. En el navegador, la reproducción a 6 h/s avanza 23 muestras en 2 s (11.5 h), con el Sol rasante (el −0.05°) detrás de la loma del este de Haworth, «In shadow» y «Earth link». Con 774 px de ancho, `scrollWidth` 759: sin scroll horizontal.
- **Decisiones tomadas:** `missionTime` y `compareTime` son relojes distintos (absoluto del plan elegido y relativo de la bandeja, spec 8.1 y 8.4); se enlazan bajo demanda con «Match tray clock», no siempre, para que la reproducción del sitio no mueva la bandeja.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** ninguno.
- **Siguiente tarea:** T3.4.c.

## 2026-10-21 · T3.4.c · Panel de características del sitio

- **Tarea:** T3.4.c — Panel de características del sitio (componente 2D) ([x]).
- **Qué se hizo:**
  - `web/src/views/SitePanel.tsx`: tarjeta de 8.6 con cinco bloques. (1) Ubicación y terreno: los atributos de `site_features/{site}.json` (región USGS, lat/lon, elevación, pendiente media y máxima, radio de 1 km de D10). (2) Las seis métricas de la ventana (5.5) y el texto «why». (3) Horas de Sol y de Tierra por día de la ventana, desde `daily/{site}.json`, con barras. (4) Rasgos con nombre cercanos del nomenclátor IAU. (5) Si hay otros planes anclados, una tabla compacta con ellos (el plan actual marcado con ▸).
  - Cada valor lleva su fuente o método como tooltip (`title`) y como descripción accesible (`aria-description`), y se puede enfocar con el teclado. Las fuentes de las métricas describen el método real del pipeline (borde superior del Sol + 0.265°, margen de antena de 0.5°, normalización min–max del score sobre todos los sitios con la misma L).
  - Un atributo `not available`, o uno «available» sin fuente (defensivo, aunque el contrato ya lo impide), muestra «Not available» y nunca el valor (regla 1, 5.10).
  - `SiteSection` carga además las características, los agregados diarios y los planes anclados (la caché del DataStore evita repetir descargas) y monta el panel bajo el panorama.
- **Cómo se verificó:**
  ```
  $ npm --prefix web test   → Tests 110 passed
    sitePanel.test.tsx: every shown value has a tooltip with its source or method (34 valores; elevación «2841.8 m» con LOLA; rasgos con el Gazetteer)
                        an attribute without a source shows 'Not available', never a value
                        daily Sun and Earth hours are the window's days from daily/{site}.json
                        compact comparison with the other pinned plans and a why text with the plan's figures
                        no comparison block when nothing else is pinned
  $ npm --prefix web run typecheck → exit 0
  ```
  En el navegador (Haworth, llegada 2027-03-18): día 1 con 1.5 h de Sol (coincide con el panorama: Sol tapado por la loma del este al llegar), Tierra 24 h los días 1–4 y 0 h los días 6–7 (de ahí «Earth drops to 0 h on the worst day»). La tabla compara con los 4 planes anclados. A 774 px de ancho la tabla ocupa todo el panel, con cabeceras cortas y la etiqueta larga en el tooltip, sin scroll horizontal de página.
- **Decisiones tomadas:** tooltips nativos (`title`) más `aria-description`, sin dependencia nueva. El panel vive en la sección «At the site» de la vista de comparación; en la Fase 4 se monta en la fase «sitio» del modo vivir.
- **Desviaciones de la spec / cambios en la guía:** ninguno.
- **Problemas abiertos:** ninguno. T3.4 completa.
- **Siguiente tarea:** T3.5.a.

## 2026-10-21 · T3.5.a · Pasar a los datos reales del pipeline

- **Tarea:** T3.5.a — Pasar a los datos reales del pipeline ([x]).
- **Qué se hizo:**
  - La app ya cargaba `web/public/data/` (REAL, desde T2.4.b; Pista S omitida, A4). Esta subtarea añade la verificación.
  - `pipeline/parity.py` (`python -m pipeline.parity`): 100 celdas al azar (semilla fija), cada una con un conjunto de restricciones. Cada control puede estar desactivado, en un paso del deslizador o **exactamente en el valor de la celda**, que es donde el Float32 del front end podría discrepar. Guarda `meets_constraints` (T1.4.c), el score y el número de celdas válidas de toda la rejilla de esa L en `web/tests/fixtures/parity_sample.json`. `pipeline/tests/test_parity.py` comprueba que la muestra versionada sigue al día con los datos.
  - `web/tests/parity.test.ts`: recalcula con `validMask`/`lookup` (T3.1.d) sobre los mismos archivos.
  - Marca `performance.mark("shell-ready")` en el primer dibujo del calendario, para medir la carga inicial del shell 2D (8.7). Configuración `web-preview` en `.claude/launch.json` para medir sobre el build de producción.
- **Cómo se verificó:**
  ```
  $ .venv/Scripts/python -m pipeline.parity
  100 celdas -> web/tests/fixtures/parity_sample.json  (cumplen 68, con algún umbral exactamente en el valor de la celda 61)
  $ npx vitest run tests/parity.test.ts
  parity: 100 cells, 0 mismatches, 61 at the exact limit
    (además, el recuento de celdas válidas de la rejilla completa coincide en los 100 conjuntos y |Δscore| < 1e-6)
  $ .venv/Scripts/python -m pytest -q  → 275 passed
  $ npm --prefix web test               → Test Files 15 passed · Tests 112 passed
  $ npm --prefix web run typecheck      → exit 0
  $ npm --prefix web run build          → index.js 376 kB (gzip 116 kB), css 10.7 kB
  ```
  Build de producción servido con `vite preview` (puerto 4173), panel del navegador visible:
  ```
  shell-ready (primer dibujo del calendario): 517 ms (primera carga), 436, 405, 356 ms en recargas   → < 3 s
  DOMContentLoaded 259 ms · 10 recursos · 2 045 kB decodificados (272 kB transferidos)
  insignia «REAL data · 2c2f11dad7», sin aviso SYNTHETIC, consola vacía
  ```
  En el servidor de desarrollo, tras recargar y recorrer el flujo (restricciones → «583 of 1825 7-day plans meet the constraints», anclar 3 planes, seleccionar uno, mover los dos relojes) no hay errores en la consola. Los errores que aparecían antes en el registro eran de versiones viejas de los módulos durante la recarga en caliente (marcas de tiempo `?t=` antiguas).
- **Decisiones tomadas:** la paridad se mide sobre los archivos que carga la app (no sobre `pipeline/out/`), para que cubra lo que ve el usuario. Límite conocido: los umbrales a menos de ~1e-6 relativo de un valor podrían diferir por el Float32, pero los pasos de los deslizadores (1 %, 1 h, 0.5 h/día) no llegan ahí y los valores exactos de los datos sí coinciden (61 casos).
- **Desviaciones de la spec / cambios en la guía:** ninguno. La medida de 3 s es en local; sobre la red depende del hosting (T7.1.a). Los JSON pesan 2 MB sin comprimir, y los hostings estáticos los sirven comprimidos.
- **Problemas abiertos:** ninguno. **Fase 3 completa.**
- **Siguiente tarea:** hito de la Fase 3; después, Fase 4 (T4.1.a).

## 2026-10-21 · HITO FASE 3 · Búsqueda y comparación 2D con datos reales

- **Estado de la guía:** Fases 0–3 completas (Pista S omitida, A4). Total: 69 [x], 39 [ ], 0 [!].
- **Comprobación del hito** (pasos 2 y 3 del guion, sección 12):
  ```
  $ .venv/Scripts/python -m pytest -q   → 275 passed
  $ npm --prefix web test                → Test Files 15 passed · Tests 112 passed
  $ npm --prefix web run typecheck       → exit 0
  $ npm --prefix web run build           → OK (376 kB JS, 116 kB con gzip)
  ```
  Recorrido en el navegador con datos REAL: activar y mover los tres controles (el calendario se reilumina en ≤ 20 ms; «583 of 1825 7-day plans meet the constraints»), anclar planes (clic + «Pin selected plan», doble clic, Enter o «Pin best 3» sobre un rango), comparar hasta 5 paneles (silueta, cinta, métricas con insignias y texto «why»), mover el reloj compartido (los 5 paneles en ≤ 30 ms), seleccionar un plan (título del panel) y ver «At the site»: panorama 360°, control de tiempo y panel del sitio con la fuente de cada valor.
- **Resultados clave de la Fase 3:**
  - Calendario en canvas (A5, transpuesto) con rampas OKLab por métrica; restricciones en < 25 ms.
  - Paneles 2D solo en SVG (0 contextos WebGL), escala vertical compartida, exageración configurable.
  - La racha de oscuridad resaltada coincide con `longest_dark_h` en las 5 475 ventanas; el panorama y la silueta usan el mismo az/el en el mismo instante; paridad Python ↔ TS sin discrepancias en 100 celdas (61 en el límite exacto).
  - Carga del shell 2D (build de producción, local): 356–517 ms.
- **Problemas abiertos para el humano:** D1 y D11 siguen pendientes (no bloquean la Fase 4). A5 sigue revisable. «Pin best 3» tiende a elegir planes que empatan en todo (score saturado, T1.4.d): mejora opcional anotada en T3.3.d.
- **Siguiente tarea:** Fase 4 (T4.1.a, escena 3D).

## 2026-10-22 · UI · Rediseño Quantum (decisión A6)

- **Tarea:** rediseño de la capa visual pedido por el humano (fuera de la guía; sin cambios de lógica ni de datos).
- **Proceso:** se propusieron variantes aplicadas solo a la tarjeta «Comparison tray» con un selector temporal: primero Nebula, Aurora y Orbit (demasiado parecidas, según el humano); luego Editorial, Bento y Apollo (gustó la estructura de Apollo); luego Apollo, Nebula y Aurora con esa estructura; por último «Quantum», con una paleta de seis colores dada por el humano. El humano eligió Quantum.
- **Qué se hizo:**
  - `web/src/styles/tokens.ts`: paleta Quantum como tokens base (fondo `#0B0F14`, verde `#3DDC84`, texto `#E6EDF3`, grises `#8E949A` / `#575D62` / `#373B40`), nuevos tokens `accent` y `borderStrong`, y tipografía Geist / Geist Mono (`@fontsource-variable/geist` y `geist-mono` 5.3.0, licencia SIL OFL, autoalojadas: funcionan sin red). Sustituye los colores de la spec 9.
  - Papeles: el Sol se dibuja en blanco (luz) y la Tierra en verde; la cinta de tiempo colorea cada carril (arriba Sol, abajo Tierra), así «ambos» no necesita un tercer color. El gris medio (2.9:1) solo se usa en bordes. `danger` es el único color fuera de la paleta (errores).
  - `web/src/styles/tokens.css`: estilo mínimo en toda la app (paneles con borde fino en vez de relleno, controles activos en verde, foco verde). En la bandeja, la estructura «Apollo»: planes numerados (01, 02…), cabecera con línea fina, Sunlight % y Score como mosaicos grandes y el resto de métricas como filas.
  - Componentes (solo presentación): clases CSS en los elementos SVG de la silueta y la cinta; cinta coloreada por carril; contorno de la racha de oscuridad en gris claro; contorno del rango del calendario en texto claro (el verde desaparecía sobre celdas verdes); borde del terreno en gris medio. Leyenda de la cinta sin mención de color («Top: Sun · Bottom: Earth»).
  - `web/src/lib/colorScale.ts`: la rampa verde perdía 0.0004 de luminosidad en un paso por el redondeo a 8 bits; ahora un paso que saldría más oscuro repite el color anterior (luminosidad siempre creciente).
  - Eliminados el selector temporal, las variantes descartadas y sus fuentes.
- **Cómo se verificó:**
  ```
  $ npm --prefix web test   → Tests 112 passed
    tokens.test.ts: uses the six Quantum colours (decision A6); only `danger` lies outside them
    calendar.test.ts: las tres rampas siguen siendo monótonas en luminosidad
  $ npm --prefix web run typecheck → exit 0
  $ npm --prefix web run build     → OK (JS 377 kB, 116 kB con gzip; fuentes latinas ~52 kB descargadas)
  ```
  Validador de paleta: Sol (blanco) frente a Tierra (verde), ΔE 15.3 con daltonismo y 23.4 normal. Contraste del texto: claro 16.3:1, gris claro 6.3:1, verde 10.8:1; texto oscuro sobre verde (botón activo) 10.8:1.
  En el navegador: cabecera, restricciones, calendario (modos combinado, energía en blanco, comunicaciones; atenuado y rayado con restricciones activas), bandeja con 3 planes, panorama y panel del sitio con el estilo nuevo. Scrubber con 3 paneles: render + layout mediana 8.8 ms, máx. 21.2 ms; redibujado del calendario 6.2 ms. A 774 px de ancho, `scrollWidth` 759 (sin scroll horizontal). Consola sin errores tras recargar.
- **Decisiones tomadas:** A6 en `docs/DECISIONS.md`.
- **Desviaciones de la spec / cambios en la guía:** los colores de la spec 9 se sustituyen por la paleta Quantum (A6). El resto de la spec 9 (Sol y Tierra distinguibles, estado con forma además de color, contraste, movimiento reducido) se mantiene.
- **Problemas abiertos:** en Quantum el verde marca a la vez la Tierra y la selección / «Best»; se distinguen por la forma (insignia con estrella y texto), pero un acento propio requeriría un séptimo color.
- **Siguiente tarea:** Fase 4 (T4.1.a), cuando el humano lo indique.

## 2026-10-22 · T4.1.a · Gestor del único contexto WebGL y carga diferida

- **Tarea:** T4.1.a — Gestor del único contexto WebGL y carga diferida ([x]).
- **Qué se hizo:**
  - Dependencias: `three` 0.186.1 y `@types/three` 0.186.0 (versiones exactas de hace más de dos semanas).
  - `web/src/scene3d/renderer.ts`: `createRendererManager(factory)` crea el renderer three.js una sola vez y lo reutiliza; salir de la vista 3D solo para el bucle y desengancha el canvas, sin destruir el contexto, así alternar modos no acumula contextos. `rendererManager` es el gestor de la app; `mountScene(container)` monta una escena (vacía por ahora: los cuerpos llegan en T4.1.c) con ajuste de tamaño y devuelve la función de desmontaje.
  - `web/src/scene3d/SceneHost.tsx`: carga `renderer.ts` con `import()` dinámico; three.js queda en un chunk aparte y la vista 2D no lo descarga. Estados de carga y de error (sin WebGL, la comparación 2D sigue funcionando).
  - Store: `viewMode` («compare» | «live») y `setViewMode`; el modo vivo exige un plan seleccionado (spec 8.0).
  - Provisional hasta T4.4.a: `web/src/views/LiveStub.tsx` (escena y botón «Back to compare») y el botón «Open 3D view» junto al plan seleccionado en «At the site» (archivos extra respecto a la guía, justificados para poder alternar los modos y verificar la aceptación). T4.4.a los sustituye por `LiveView` con la transición animada, la franja de miniaturas y Esc.
- **Cómo se verificó:**
  ```
  $ npm --prefix web test   → Tests 116 passed
    webgl.test.ts: creates one renderer and reuses it across 10 mode toggles (1 creación, 1 canvas, bucle parado al salir)
                   release before any acquire is harmless
                   live mode needs a selected plan
                   only scene3d/ imports three, and SceneHost loads it with a dynamic import
  $ npm --prefix web run typecheck → exit 0
  $ npm --prefix web run build
    dist/assets/index-CxRo41bf.js     380.21 kB │ gzip: 117.49 kB   (shell inicial; antes 376.91 kB)
    dist/assets/renderer-DqDZ5bF8.js  523.10 kB │ gzip: 130.12 kB   (three.js, chunk aparte)
  ```
  En el navegador (servidor de desarrollo), con `getContext` instrumentado para contar contextos WebGL distintos:
  ```
  10 ciclos «Open 3D view» → «Back to compare»
  distinctWebGLContexts: 1 · canvas WebGL en el DOM en cada vista viva: [1,1,1,1,1,1,1,1,1,1] · en comparar: 0
  three.js descargado antes de la primera apertura: [] · después: /src/scene3d/renderer.ts, three.js
  ```
- **Decisiones tomadas:** el contexto no se destruye al salir (desenganchar en lugar de `dispose`), porque recrearlo es lento y los navegadores limitan el número de contextos.
- **Desviaciones de la spec / cambios en la guía:** archivos provisionales `LiveStub.tsx` y botón «Open 3D view» (ver arriba). Vite avisa de que el chunk de three.js pasa de 500 kB; es esperable (three.js completo) y se carga solo en la vista 3D.
- **Problemas abiertos:** ninguno.
- **Siguiente tarea:** T4.1.b.

## 2026-10-22 · T4.1.b · Modo de escala, render relativo a la cámara y buffer logarítmico

- **Tarea:** T4.1.b — Modo de escala, render relativo a la cámara y buffer logarítmico ([x]).
- **Qué se hizo:**
  - `web/src/scene3d/scale.ts`: modo de escala de D8. 1 unidad de escena = 1000 km, aplicado de forma **uniforme** a todas las posiciones (semejanza), así que todos los ángulos se conservan exactos: dirección del Sol, fase de la Luna, orientaciones. La Tierra y la Luna se dibujan ×6 (`SPACE_SCALE`); `LOCAL_SCALE` (×1) es la escala real del zoom final (T4.3.b). Radios del PCK `pck00011.tpc`: Tierra 6378.1366 / 6356.7519 km (BODY399_RADII), Luna 1737.4 km (BODY301_RADII, la misma esfera del DEM). `RelativeOrigin` es el origen flotante para el render relativo a la cámara. También `angleBetween` y `phaseAngle` (ángulo Sol–Luna–Tierra).
  - `web/src/scene3d/renderer.ts`: `logarithmicDepthBuffer: true`; cámara con near = 1e-6 (1 mm) y far = 1e7 unidades (10 millones de km); `SceneHandle` con las posiciones de mundo en float64 y `applyCameraRelative`, que en cada fotograma pone la cámara en el origen y los objetos en `mundo − cámara`. Un gancho de depuración `window.__pp3d`, solo en desarrollo, para las comprobaciones en el navegador.
  - `web/src/scene3d/ScaleIndicator.tsx`: aviso siempre visible sobre la escena: «Not to scale · Earth and Moon drawn 6× larger · distances, Sun direction and Moon phase exact», con el detalle en un tooltip; en escala local dice «Real scale».
- **Cómo se verificó:**
  ```
  $ npx vitest run tests/scale.test.ts --reporter=verbose
  scale: 9192 samples, max |Δ phase angle| = 4.44e-16 rad, max |Δ elongation| = 4.44e-16 rad     (criterio < 1e-9)
  precision: float32 error 2.52e-15 units camera-relative vs 4.57e-6 absolute                      (1 m de la cámara, junto a la Luna)
   ✓ Sun–Moon–Earth angle identical before and after scaling, every hourly sample of the scene
   ✓ phase angle sanity: full Moon ≈ 0°, new Moon ≈ 180°, and the year covers both
   ✓ bodies exaggerated by the fixed D8 factor in space, real size at the site
   ✓ a point 1 m from a camera near the Moon survives float32; the absolute coordinate would not
   ✓ each frame the camera sits at the origin and objects at world − camera
   ✓ the renderer is created with a logarithmic depth buffer
  $ npm --prefix web test → Tests 122 passed · typecheck → exit 0
  ```
  En el navegador: `renderer.capabilities.logarithmicDepthBuffer = true`, near 1e-6, far 1e7. Prueba de parpadeo de profundidad: dos esferas del tamaño real de la Luna en su posición (−321, 168, 67 unidades), separadas **1 m**, con la cámara a 100 m de la superficie, renderizadas a una textura de 200×200: mirando hacia abajo, 40 000 píxeles de la esfera exterior y **0** de la interior; en vista rasante, 19 115 y **0**. Sin fugas, así que no hay parpadeo. El indicador de escala se ve sobre la escena.
- **Decisiones tomadas:** factor de exageración ×6 (Tierra ≈ 38 unidades, Luna ≈ 10, a ~384 unidades de distancia). Escalado uniforme en lugar de una compresión no lineal de distancias, porque conserva todos los ángulos, no solo los vistos desde la Tierra.
- **Desviaciones de la spec / cambios en la guía:** ninguno. La forma de llevar los puntos de la trayectoria a la superficie de una Luna exagerada se resuelve en T4.2.c y T4.3.b.
- **Problemas abiertos:** ninguno.
- **Siguiente tarea:** T4.1.c.

## 2026-10-22 · T4.1.c · Tierra, Luna, Sol y estrellas desde scene/ephemeris

- **Tarea:** T4.1.c — Tierra, Luna, Sol y estrellas desde scene/ephemeris ([x]).
- **Qué se hizo:**
  - `pipeline/textures.py` (`python -m pipeline.textures`, comando nuevo en `CLAUDE.md`): convierte los originales de T0.2.f (NASA SVS, dominio público) a `web/public/textures/{earth,moon}_{4k,2k}.jpg`, JPEG calidad 85, 3,74 MB en total, con `textures.json` (tamaños, SHA-256 y créditos). Es determinista: al repetirlo salen los mismos bytes. Convención de los dos mapas, comprobada a ojo con miniaturas: longitud 0° en el centro (África; mares de la cara visible), −180° a la izquierda, norte arriba.
  - `web/src/scene3d/ephemeris.ts`: estado de la escena en cualquier instante según el contrato §10. Posición de la Luna con Catmull-Rom, rotaciones con slerp, dirección del Sol con interpolación lineal renormalizada. Incluye `rotate`, `lonLat` y el rango cubierto.
  - `web/src/scene3d/bodies.ts`: la Tierra (elipsoide con los radios del PCK) y la Luna con `MeshStandardMaterial` y textura, orientadas con los cuaterniones de los datos más un giro fijo de +90° sobre X (marco local de la esfera de three.js → marco fijo del cuerpo). Luz direccional a lo largo de `sun_dir`, un resplandor del Sol «en el infinito», luz ambiente muy tenue y un campo de estrellas **decorativo** (direcciones aleatorias con semilla fija; no es un catálogo). Las texturas son de 4k en escritorio y de 2k en pantallas pequeñas o GPU limitadas.
  - `renderer.ts`: `mountScene(container, { eph, getTimeMs, baseUrl })` coloca los cuerpos en cada fotograma según `missionTime` y usa un encuadre de vista general provisional (desde encima de la línea Tierra–Luna) hasta el director de cámara de T4.3.a; al desmontar libera geometrías, materiales y texturas. `SceneHost` carga a la vez el chunk de three.js y `scene/ephemeris.json`.
  - Créditos de las texturas en el pie de página (regla 12).
- **Cómo se verificó:**
  ```
  $ npx vitest run tests/bodies.test.ts --reporter=verbose
  bodies: 1314 instants, max |phase angle scene − data| = 4.44e-16 rad
  moon: sub-Earth point |lon| ≤ 7.76°, |lat| ≤ 6.85° (optical libration ≈ ±7.9° / ±6.7°)
  earth: sub-solar point at 12:00 UTC |lon| ≤ 4.01° (equation of time ≤ ~4.1°), |lat| ≤ 23.44° (obliquity 23.44°)
   ✓ reproduces the samples at their own instants
   ✓ mid-hour Moon position lies between its neighbours, sun direction stays unit
   ✓ phase angle: light direction vs Moon→Earth in the scene = the data, at every sampled instant
   ✓ the Moon shows its near side to the Earth (sub-Earth point within the libration range)
   ✓ the Earth's sub-solar point is near longitude 0 at 12:00 UTC and at the solar declination
  $ npm --prefix web test → Tests 127 passed · typecheck → exit 0 · pytest → todo en verde
  $ npm --prefix web run build → index 381.72 kB (sin cambios relevantes) · renderer (three.js + escena) 546.58 kB
  ```
  Las dos últimas pruebas comprueban a la vez los cuaterniones y la orientación de las texturas con hechos independientes: la Luna muestra la cara visible a la Tierra dentro de la libración, y el punto subsolar terrestre a las 12:00 UTC queda a ≤ 4° de Greenwich (ecuación del tiempo) y a la declinación solar (máx. 23,44° = oblicuidad).
  En el navegador (llegada a Connecting Ridge, 2027-01-02): las texturas cargan, la Tierra y la Luna están iluminadas por el mismo lado y el ángulo de fase de la escena es de 115,7° (fracción iluminada vista desde la Tierra ≈ 0,28). La escena va a 60 fps. La comparación con fracciones de referencia de Horizons en fechas concretas queda para T4.4.c.
- **Decisiones tomadas:** las estrellas son decorativas y deterministas, y se documenta que no son un catálogo. Ambiente al 4 % para que la cara nocturna no sea negro puro.
- **Desviaciones de la spec / cambios en la guía:** archivo extra `web/tests/bodies.test.ts` (la guía no nombra el archivo de prueba). La prueba de aislamiento de three.js (T4.1.a) se generaliza: recorre el grafo de imports estáticos desde `main.tsx` y comprueba que ningún módulo del shell 2D importa three.
- **Problemas abiertos:** ninguno.
- **Siguiente tarea:** T4.1.d.

## 2026-10-22 · T4.1.d · Controles de tiempo de misión

- **Tarea:** T4.1.d — Controles de tiempo de misión ([x]).
- **Qué se hizo:**
  - `web/src/lib/mission.ts` (archivo extra, lógica sin React): línea de tiempo del plan a partir del archivo de trayectoria (contrato §11): despegue → inyección → llegada a la Luna → aterrizaje (= `arrival_utc`) → fin de la estancia (+ L días). Incluye `phaseAt`, `phaseStart`, `clampMission` y `missionClock` («T+ 2d 04:30» y la hora UTC).
  - `web/src/scene3d/MissionControls.tsx`: reproducir/pausar, scrubber de toda la misión (pasos de 10 min), «Jump to» Launch / Transit / Landing / At the site, velocidad de 1 h/s, 6 h/s o 1 d/s, y el reloj de misión y la fase siempre visibles. Escribe `missionTime` y `missionPhase` en el store; la escena 3D lee `missionTime` en cada fotograma. Un plan recién seleccionado (fase «overview») empieza en el despegue; al volver a la vista viva el reloj sigue donde estaba.
  - `LiveStub`: carga la trayectoria del plan para la línea de tiempo y muestra el indicador de escala solo en las fases 1 a 3 (spec 8.2).
- **Cómo se verificó:**
  ```
  $ npx vitest run tests/mission.test.tsx --reporter=verbose
   ✓ runs from launch to the end of the stay, phases in order
   ✓ phase at each boundary and inside each phase
   ✓ clamps to the mission and formats the clock
   ✓ a freshly selected plan starts at launch; each phase button jumps to its start     (criterio de aceptación)
   ✓ the scrubber covers the whole mission and keeps the phase in step
   ✓ re-entering the live view keeps the clock where it was
  $ npm --prefix web test → Tests 133 passed · typecheck → exit 0
  ```
  En el navegador (Connecting Ridge, llegada 2027-01-02): al abrir, «Launch, T+ 0d 00:00, 2026-12-30 00:00 UTC», con el indicador de escala visible; tras 2 s a 6 h/s, «Transit, T+ 0d 11:58», y la Luna se ha movido 43,8 unidades = 43 800 km en 12 h (velocidad orbital ≈ 1 km/s); con «At the site», «T+ 3d 00:00, 2027-01-02 00:00 UTC» y el indicador de escala oculto. Corregido un fallo de maquetación: el `flex: 1 1 360px` del scrubber se convertía en 360 px de altura dentro de la columna de controles.
- **Decisiones tomadas:** velocidades de 1 h/s, 6 h/s (tránsito de 3 días en 12 s) y 1 d/s. El salto a «At the site» va al instante del aterrizaje.
- **Desviaciones de la spec / cambios en la guía:** archivo extra `web/src/lib/mission.ts`. La prueba es `mission.test.tsx` (necesita jsdom), no `.ts`.
- **Problemas abiertos:** ninguno. T4.1 completo.
- **Siguiente tarea:** T4.2.a.

## 2026-10-22 · T4.2.a · Modelo del cohete

- **Tarea:** T4.2.a — Modelo del cohete ([x]).
- **Qué se hizo:**
  - `web/src/scene3d/rocket.ts`: modelo **propio y procedural** (no hay archivo externo ni licencia que registrar; `data/README.md` no cambia): lanzador genérico de dos etapas, con perfil de revolución (tobera, primera etapa, interetapa, segunda etapa, carenado ojival), banda en la interetapa y cuatro aletas. No representa ningún vehículo real. Ejes locales: +Y = morro, longitud 1, base en y = 0. Materiales con los colores de los tokens y una autoiluminación tenue en gris medio, para que la cara en sombra se lea sobre el negro (ayuda visual, no física).
  - Escala (D8): el cohete se dibuja con un **tamaño aparente constante**, el 8 % de la altura de la vista, mediante `apparentLength(distancia, fov, fracción)`. Junto a la Luna mide unas 22 unidades (≈ 22 000 km), unas 225 000 veces su tamaño real (≈ 100 m). El indicador de escala lo dice: «Earth and Moon drawn 6× larger, rocket enlarged to stay visible».
- **Cómo se verificó:**
  ```
  $ npx vitest run tests/rocket.test.ts
   ✓ is 1 unit long along +Y with its base at the origin, slender, with 4 fins
   ✓ apparent length keeps a constant fraction of the view height at any distance
  $ npm --prefix web test → Tests 135 passed · typecheck → exit 0
  ```
  Revisión visual en el navegador: el cohete, colocado a mitad del camino Tierra–Luna con el gancho de depuración, se ve con sus etapas, aletas y tobera (inspeccionado también a 5×). Sin autoiluminación, la cara en sombra se perdía sobre el fondo; con ella se ve gris, y la cara iluminada por el Sol sigue más clara. Al 6 % parecía una aguja; se dejó en el 8 %.
- **Decisiones tomadas:** geometría procedural en lugar de un glTF externo (sin licencia que verificar, ~0 kB de recursos). Tamaño aparente constante en lugar de un factor fijo, porque la distancia a la cámara varía en varios órdenes de magnitud durante el viaje.
- **Desviaciones de la spec / cambios en la guía:** archivo extra `web/tests/rocket.test.ts`. El cohete se añade a la escena y sigue la trayectoria en T4.2.b y T4.2.c.
- **Problemas abiertos:** ninguno.
- **Siguiente tarea:** T4.2.b.

## 2026-10-22 · T4.2.b · Despegue ilustrativo

- **Tarea:** T4.2.b — Despegue ilustrativo ([x]).
- **Qué se hizo:**
  - `web/src/scene3d/launch.ts`: despegue ILLUSTRATIVE (D8: mínimo). La plataforma es la misma plataforma genérica de `pipeline/trajectory.py` (latitud 0°, longitud 0°, radio ecuatorial; **no es un puerto espacial real**) y gira con la Tierra (IAU_EARTH). Cuenta atrás de 5 min con el cohete de pie en la plataforma, encendido en los últimos 10 s y ascenso con penacho durante los 10 min de ascenso radial que ya trae el archivo de trayectoria; después, vuelo por la trayectoria (aquí con interpolación lineal; T4.2.c la afina). Funciones: `padPositionKm`, `launchStage`, `plumeIntensity` y `launchPositionKm`.
  - `web/src/lib/mission.ts`: la línea de tiempo empieza en la cuenta atrás (`startMs = launch − 5 min`; nuevo campo `launchMs`). El reloj muestra «T− 05:00 … T− 00:01» y luego «T+ 0d 00:00».
  - `web/src/scene3d/scale.ts`: `exaggerateNear` / `pointToScene`, un empuje radial cerca de la Tierra y de la Luna para que la superficie real caiga sobre la superficie dibujada (×6). Conserva la dirección desde el centro, es monótono y se anula exactamente a 30 radios; con escala real (×1) es la identidad. Lo usarán la trayectoria (T4.2.c) y el aterrizaje (T4.3).
  - `web/src/scene3d/rocket.ts`: penacho (cono aditivo con el color de luz de los tokens). `renderer.ts`: cohete, penacho y marcador de la plataforma en cada fotograma; orientado según la vertical local durante la cuenta atrás y el ascenso, y según la dirección de avance en vuelo.
  - Etiqueta sobre la escena (regla 2): «ILLUSTRATIVE · Launch from a generic pad and simplified trajectory, computed with the real Moon position», en las fases 1 a 3.
- **Cómo se verificó:**
  ```
  $ npx vitest run tests/launch.test.ts --reporter=verbose
  launch: 30 plans, max |pad(launch_utc) − trajectory[0]| = 79.9 m        (criterio de continuidad; umbral 1 km)
   ✓ at launch_utc the pad is the trajectory's first point (sample of plans, every site)
   ✓ then follows the trajectory samples exactly, and ends at its last point
   ✓ during the countdown the rocket stands on the pad, which turns with the Earth (≈ 139 km en 5 min en el ecuador)
   ✓ stages and plume: countdown, ignition in the last 10 s, ascent, then flight
   ✓ puts the true surface on the drawn surface and keeps the direction from the centre
   ✓ is monotonic along a radius and the identity beyond the cut-off
  $ npm --prefix web test → Tests 141 passed · typecheck → exit 0
  ```
  En el navegador: al abrir, «Launch · T− 05:00 · 2026-12-29 23:55 UTC», con el cohete de pie sobre el marcador verde de la plataforma, en la superficie dibujada (radio 38,269 unidades = 6 × 6,378); etiqueta ILLUSTRATIVE visible. En T+ 0d 00:05 el cohete sube (radio 38,306) con el penacho encendido.
- **Decisiones tomadas:** cuenta atrás de 5 min, que hace que la vista de misión empiece en T− 05:00. El ascenso se toma del propio archivo de trayectoria para que no haya dos versiones del despegue.
- **Desviaciones de la spec / cambios en la guía:** archivo extra `web/tests/launch.test.ts`; `mission.test.tsx` ajustado a la cuenta atrás.
- **Problemas abiertos:** ninguno.
- **Siguiente tarea:** T4.2.c.

## 2026-10-22 · T4.2.c · Trayectoria y estela REAL / ILLUSTRATIVE

- **Tarea:** T4.2.c — Trayectoria y estela REAL / ILLUSTRATIVE ([x]).
- **Qué se hizo:**
  - `web/src/scene3d/trajectory.ts`: posición del cohete en cualquier instante con una cúbica de Hermite con tangentes de Catmull-Rom para muestras irregulares (100 s en el ascenso, 412,5 s en la órbita de espera, densas tras la inyección, 180 s en la última hora). Es exacta en cada muestra y vale la última muestra desde el aterrizaje en adelante. `trailSamples` remuestrea 800 puntos para la estela, y `trailStyle(mode)` da el estilo: sólida si es REAL, discontinua con etiqueta si es ILLUSTRATIVE (spec 9, regla 2).
  - `launch.ts`: `launchPositionKm` usa ahora esta cúbica después del despegue (una sola fuente para la posición del cohete).
  - `renderer.ts`: estela en dos líneas que se unen en el cohete: el tramo recorrido en texto claro y el que falta en gris medio, ambas discontinuas (los datos son ILLUSTRATIVE). Los puntos cercanos a la Tierra y a la Luna se empujan igual que el cohete, y la geometría se actualiza en cada fotograma.
- **Cómo se verificó:**
  ```
  $ npx vitest run tests/trajectory.test.tsx --reporter=verbose
  trajectory: 50 plans, max |rocket(arrival_utc) − last point| = 0.00e+0 km
  parking orbit: max radius error cubic 8.6 km vs linear 195.0 km
   ✓ at arrival_utc the rocket is at the last point (landing), for a sample of plans of every site     (criterio)
   ✓ passes through every sample exactly
   ✓ stays on the parking orbit between samples 28° apart (a straight line would cut ~195 km inside)
   ✓ the dense trail has no jumps (continuous curve from the pad to the site)
   ✓ REAL is solid without label; ILLUSTRATIVE is dashed with its label
   ✓ the live view shows the ILLUSTRATIVE label while the mode is ILLUSTRATIVE                        (criterio)
  $ npm --prefix web test → Tests 147 passed · typecheck → exit 0
  ```
  En el navegador, reproduciendo el tránsito a 1 h/s durante 4 s con el panel visible: **60 fps** (contador con requestAnimationFrame; 11 llamadas de dibujo, 33 120 triángulos). Al inicio del aterrizaje se ve la estela discontinua de la Tierra a la Luna, el cohete llegando y el descenso que falta en gris tenue; la etiqueta ILLUSTRATIVE está visible.
- **Decisiones tomadas:** cúbica de Hermite en lugar de lineal, por el error de 195 km en la órbita de espera. Estela en dos tonos (recorrido / por recorrer) dentro de la paleta Quantum.
- **Desviaciones de la spec / cambios en la guía:** la prueba es `trajectory.test.tsx` (necesita jsdom para la etiqueta), no `.ts`.
- **Problemas abiertos:** ninguno. T4.2 completo.
- **Siguiente tarea:** T4.3.a.

## 2026-10-22 · T4.3.a · Director de cámara Tierra → Luna → polo sur → sitio

- **Tarea:** T4.3.a — Director de cámara Tierra → Luna → polo sur → sitio ([x]).
- **Qué se hizo:**
  - `web/src/scene3d/cameraDirector.ts`: un recorrido continuo según `missionTime`, con un encuadre por fase y mezclas suaves en los cambios de fase (ventanas de 8,5 h en la inyección, 9 h en la llegada a la Luna y 4 h antes del aterrizaje):
    - **despegue:** vista fija de la Tierra desde encima de la plataforma (el cohete sube y orbita dentro de la vista; seguirlo a 6 h/s haría girar la cámara ~25° por fotograma);
    - **tránsito:** la línea Tierra–Luna vista desde el lado norte lunar, con la Tierra a la izquierda y la Luna a la derecha. El lado sale del eje de giro de la Luna, cuyo signo no cambia; uno basado en Luna × Sol se invertiría en luna nueva o llena;
    - **aterrizaje:** acercamiento de 8 a 3 radios lunares, rodeando el polo sur hasta el lado desde el que mira el encuadre del sitio, mientras el objetivo se desliza del centro de la Luna al sitio. El vector «arriba» gira con el barrido, así que nunca queda indefinido al pasar bajo el polo;
    - **sitio:** a poca altura sobre el punto de aterrizaje, mirándolo con el horizonte a la vista.
  - Las mezclas interpolan la posición y la distancia, y la orientación entera (vista y «arriba») con slerp de cuaterniones. Mezclar vista y «arriba» por separado fallaba en fechas en que los dos «arriba» eran casi opuestos.
  - **Cancelable:** arrastrar, la rueda o las flechas (y + / −) con el canvas enfocado le dan la cámara al usuario sin salto. La cámara orbita el cuerpo más cercano y lo sigue mientras se mueve; el botón «Guided camera» la devuelve al director.
  - **Movimiento reducido** (`prefers-reduced-motion`): un encuadre fijo por fase, con un corte en cada cambio y sin barridos.
  - Corrección encontrada aquí: tras el aterrizaje el cohete se quedaba en el último punto de la trayectoria, fijo en el espacio, mientras la Luna avanzaba ~3 600 km/h. Ahora el sitio se fija al marco lunar (`siteBodyFixedKm` / `sitePositionKm`) y el cohete se mueve con la Luna. La estela se oculta al aterrizar.
- **Cómo se verificó:**
  ```
  $ npx vitest run tests/camera.test.ts --reporter=verbose
  camera haworth_20270309_7d: per frame at 6 h/s → view 2.32°, up 2.32°, move 6.6 % of the distance; at 1 h/s → 0.39°, 0.39°, 1.1 %
  camera connecting_ridge_20270102_7d: per frame at 6 h/s → view 2.66°, up 2.66°, move 6.2 %; at 1 h/s → 0.44°, 0.44°, 1.1 %
  camera malapert_massif_20271015_14d: per frame at 6 h/s → view 2.24°, up 2.24°, move 6.4 %; at 1 h/s → 0.37°, 0.37°, 1.1 %
  camera, 25 plans at 6 h/s: worst view 2.69°, up 2.70°, move 6.6 %          (umbrales: 6°, 6°, 20 %)
   ✓ continuous path, no jumps between frames (3 planes + 25 planes de todos los sitios a lo largo del año)
   ✓ ends at the site framing exactly at landing, after travelling Earth → Moon
   ✓ reduced motion: holds one framing per phase
   ✓ user take-over (cancel) and guided camera: sin salto al tomar el control, órbita y zoom, sigue a la Luna, resume
  $ npm --prefix web test → Tests 154 passed · typecheck → exit 0
  ```
  La prueba recorre la misión entera fotograma a fotograma, a 6 h/s (6 min de misión por fotograma a 60 fps) y a 1 h/s. Fue útil: detectó cuatro fallos que solo aparecían en ciertas fases o fechas (el objetivo saltando en la última hora; «arriba» indefinido bajo el polo; el lado del tránsito invirtiéndose; «arriba» casi opuestos en la inyección). Están todos corregidos.
  En el navegador: despegue (la Tierra de cerca, con la plataforma), tránsito (Tierra a la izquierda, Luna a la derecha), aterrizaje (Luna a 4,25 radios, mitad iluminada, con la estela llegando) y sitio (cohete en la superficie del polo sur, Tierra sobre el horizonte). Durante la revisión, la cámara apareció en modo manual por una interacción con el panel; apareció el botón «Guided camera» y al pulsarlo el director retomó el encuadre de aterrizaje.
- **Decisiones tomadas:** encuadre fijo en el despegue, sin seguir al cohete. Tránsito con la Tierra a la izquierda y la Luna a la derecha. La cámara manual sigue al cuerpo más cercano.
- **Desviaciones de la spec / cambios en la guía:** ninguno. El zoom a escala real local y el terreno son de T4.3.b.
- **Problemas abiertos:** ninguno.
- **Siguiente tarea:** T4.3.b.

## 2026-10-22 · T4.3.b · Carga progresiva del terreno y escala local

- **Tarea:** T4.3.b — Carga progresiva del terreno y escala local ([x]).
- **Qué se hizo:**
  - `web/src/scene3d/terrain.ts`: terreno a escala real (D9: simplificado). El contexto polar `_polar/lod0` (estereográfica polar, ±302 km cada 2 km) cubre todo lo visible desde unos km de altura; los niveles del sitio lod0/lod1/lod2 (±20/±10/±3 km; 400/80/40 m) afinan el centro. Proyección inversa (lon = atan2(x, y), colatitud = 2·atan(ρ/2R)) comprobada contra pyproj. Cada nivel fino abre un hueco en el más grueso y lleva un faldón en su borde (sin grietas ni superficies solapadas). La geometría va en el marco fijo de la Luna y **relativa al sitio**, para que los números sean pequeños cerca de la cámara.
  - Carga **por distancia** de la cámara al sitio y **nunca antes de la aproximación final**: polar + lod0 a menos de 200 km, lod1 a menos de 30 km y lod2 a menos de 10 km (`TerrainManager`).
  - `cameraDirector.ts`: aproximación final en las últimas 8 h, con la distancia al sitio interpolada en escala **logarítmica** (de miles de km a 5 km) y la orientación con slerp. El encuadre del sitio es ahora a escala real: 1,5 km sobre el suelo, 5 km detrás del punto de aterrizaje, mirando 10 km más allá hacia el horizonte del lado de la Tierra. `localBlend` da la escala local λ (0 = espacio ×6, 1 = escala real), que cambia en el último tramo (≈ 24 → 7 km del sitio).
  - `renderer.ts`: reescalado **anclado en el sitio dibujado**. El centro de la Luna se desliza y la esfera se encoge a su tamaño real (8 km por debajo de la referencia, para que no corte los cráteres polares del terreno), así que el suelo bajo la cámara no se mueve y solo cambia su curvatura. La Tierra vuelve a su tamaño real (disco de ~1,9°) y **se desplaza λ · (sitio dibujado − sitio real)** (8 686 km, ≈ 1,2° vistos desde el sitio), de modo que con λ = 1 los vectores sitio → Tierra y sitio → centro lunar son los reales. El cohete pasa de tamaño aparente a su tamaño real (~100 m) y la estela se desvanece. El indicador de escala dice «Real scale» desde λ ≥ 0,5 (`sceneScale` en el store).
  - Correcciones encontradas al revisar: (1) la Tierra seguía ×6 a escala real y asomaba sobre el horizonte cuando estaba 8,5° por debajo; (2) anclar el reescalado en el sitio dibujado desviaba ~1,3° la dirección a la Tierra (corregido con el desplazamiento de la Tierra; un primer intento, deslizar el ancla, rompía la trayectoria de la cámara a mitad del cambio y se descartó); (3) los faldones, con normales horizontales, se iluminaban como paredes con el Sol rasante y dibujaban una línea brillante: ahora copian la normal del borde.
- **Cómo se verificó:**
  ```
  $ npx vitest run tests/terrain.test.ts tests/skycheck.test.ts --reporter=verbose
   ✓ polar stereographic inverse matches pyproj to 1e-8 degrees (5 puntos de referencia)
   ✓ <cada sitio>: ENU basis orthonormal, site at the centre of every level (< 0,5 m), holes and skirts
  terrain: 178 polar nodes within 15 km of Haworth, median |Δh| vs lod0 = 39 m
   ✓ requests nothing in space scale, then polar + lod0, lod1 and lod2 as the camera closes in
  precision: |anchor| = 391.1 units, terrain within 9.2 km of the camera, worst float32 error 0.461 mm
  earth offset at real scale: 8686 km (≈ 1.23° seen from the site)
   ✓ at λ = 1 the vector site → Earth (with the Earth offset) is the true one
  sky <cada sitio>: 188 instants, max |Δ earth_el| = 0.005°, max |Δ sun_el| ≤ 0.031°   (escena 3D frente a las series 2D)
  $ npx vitest run tests/camera.test.ts → camera, 25 plans at 6 h/s: worst view 3.97°, up 3.97°, move 15.2 %
  $ npm --prefix web test → Test Files 25 passed · Tests 169 passed · typecheck → exit 0
  $ npm --prefix web run build → index 387.33 kB · renderer 596.37 kB (three.js + escena + terreno)
  ```
  En el navegador (Connecting Ridge, llegada 2027-01-02), con la pestaña de red: **ninguna petición de terreno** en el despegue, el tránsito, el inicio del aterrizaje ni las primeras horas de la aproximación; polar, lod0 y lod1 se piden en la aproximación final y lod2 al final. La distancia de la cámara al sitio baja de forma monótona (≈ 58 000 km a T+64 h, ≈ 20 km a T+70 h, 5,2 km en el aterrizaje), sin saltos. Se ve el terreno con relieve a escala real y el cohete en el sitio a tamaño real. Elevación de la Tierra vista desde el sitio el 2027-01-08 23:55 UTC: escena −3,009°, datos −3,013°.
- **Decisiones tomadas:** reescalado anclado en el sitio dibujado más el desplazamiento de la Tierra (cámara suave y geometría exacta a escala real). Terreno gris sin textura, sombreado por el Sol real (el relieve se lee por la iluminación). Faldones de 120 m.
- **Desviaciones de la spec / cambios en la guía:** archivo extra `web/tests/skycheck.test.ts`, la comprobación cruzada 2D/3D, que conviene mantener. El modo de escala de T4.1.b se amplía con la escala local λ.
- **Problemas abiertos:** el cambio de curvatura durante el reescalado (entre ~24 y 7 km) es visible, aunque continuo. Queda un rastro muy tenue de la costura entre lod1 y lod2 con el Sol rasante.
- **Siguiente tarea:** T4.3.c.

## 2026-10-22 · T4.3.c · Llegada: panorama y panel del sitio

- **Tarea:** T4.3.c — Llegada: panorama y panel del sitio ([x]).
- **Qué se hizo:**
  - `web/src/views/LiveView.tsx` sustituye a `LiveStub.tsx` (borrado): escena, controles de misión, indicador de escala y etiqueta ILLUSTRATIVE como antes, y **al entrar en `missionPhase = site`** aparece debajo de la escena una sección «At the site» con el panorama (T3.4.a) y el panel de características (T3.4.c). Ambos leen el **mismo `missionTime`** que la escena 3D, así que el scrubber, los saltos de fase y la reproducción de la misión mueven a la vez el cielo 3D y el panorama. Al salir de la fase (volver a «Landing») la sección desaparece.
  - En la fase de sitio la escena se reduce de 72 vh a 52 vh (transición de 300 ms) para que el panorama quede a la vista; la sección entra con un fundido de 300 ms (0 ms con movimiento reducido). Un aviso `aria-live` anuncia la llegada.
  - `web/src/views/useSiteData.ts`: la carga de datos del sitio (serie del plan, horizonte, características, agregados diarios y planes anclados) sale de `SiteSection.tsx` a un hook que comparten la vista de comparación y la de vivir; la caché del DataStore evita cargar dos veces.
- **Cómo se verificó:**
  ```
  $ npx vitest run tests/liveView.test.tsx
   ✓ before landing: scene, scale indicator and ILLUSTRATIVE label, no panorama or site panel
   ✓ entering the site phase shows the panorama and the site panel; leaving it hides them
   ✓ the panorama follows missionTime: scrubbing and playback move it with the scene clock (1, 26, 100 y 167 h)
  $ npm --prefix web test → Test Files 26 passed · Tests 172 passed · typecheck → exit 0
  ```
  En el navegador (Haworth, llegada 2027-03-09) se recorrió la misión fotograma a fotograma, del despegue hasta 2 h después del aterrizaje (829 fotogramas: 10 s de misión por fotograma en el despegue y 6 min después). Pasó por las 4 fases, el cambio de vista máximo entre fotogramas fue de 3,53° (en la aproximación final) y no hubo cortes. Se pidió el terreno polar, lod0, lod1 y lod2, λ = 1 al llegar, y el panorama apareció en el primer fotograma de la fase de sitio. A 2027-03-09 14:00 UTC, el reloj de misión y el panorama marcan la misma hora; el panel muestra atributos, métricas, horas por día y la comparación con el otro plan anclado.
- **Decisiones tomadas:** panorama y panel debajo de la escena (no superpuestos), con la escena más baja en la fase de sitio. Fuera de la fase de sitio no se cargan los datos del panorama en la vista de vivir.
- **Desviaciones de la spec / cambios en la guía:** archivos extra `web/src/views/useSiteData.ts` (hook compartido; `SiteSection.tsx` solo cambia para usarlo) y `web/tests/liveView.test.tsx`; `LiveStub.tsx` se elimina un paso antes de lo previsto (T4.4.a amplía `LiveView`).
- **Problemas abiertos:** ninguno nuevo.
- **Siguiente tarea:** T4.4.a.

## 2026-10-22 · T4.4.a · Transición entre modos

- **Tarea:** T4.4.a — Transición entre modos comparar ↔ vivir ([x]).
- **Qué se hizo:**
  - Cada panel de la bandeja tiene un botón **3D** («Open {site} in the 3D live view») que selecciona el plan y abre el modo vivir. La escena **crece desde el rectángulo del panel** (animación FLIP de 300 ms con la Web Animations API; sin animación si el usuario pide movimiento reducido). Al volver, el panel del plan seleccionado se desplaza a la vista y **crece desde el rectángulo de la escena** (otros 300 ms). Lógica en `web/src/lib/modeTransition.ts` (`openLive`, `closeLive`, `playFrom`).
  - **Esc** o el botón «Back to compare» vuelven a comparar. El estado global no se toca: anclados, selección, ventana, restricciones, reloj relativo, exageración y reloj de misión. Si se vuelve a abrir el mismo plan, la misión sigue donde estaba; con otro plan empieza en el despegue.
  - `web/src/panels2d/ThumbnailStrip.tsx`: en modo vivir, los **demás planes anclados** pasan a una franja de miniaturas 2D (silueta con Sol y Tierra, cinta de tiempo y score; SVG, sin WebGL), a la derecha de la escena (o en fila desplazable en pantallas estrechas). Siguen **vivas y enlazadas**: muestran su sitio en el mismo momento de la estancia que el plan en vivo («horas desde la llegada», el reloj relativo de la bandeja; antes del aterrizaje esperan en la llegada), con la misma escala vertical compartida y la exageración de la bandeja.
  - `LiveView.tsx` reorganizado en escena + franja; «Open 3D view» de la sección del sitio usa la misma transición.
- **Cómo se verificó:**
  ```
  $ npx vitest run tests/modeTransition.test.tsx
   ✓ a panel's 3D button opens live mode on that plan; the others become thumbnails; Esc and the button go back with the state kept
   ✓ 10 round trips leave the state as it was
   ✓ the thumbnails are linked: they follow the live plan's clock as hours since arrival (30 h → "Day 2, 06:00", muestra 60 en cada miniatura)
  $ npm --prefix web test → Test Files 27 passed · Tests 175 passed · typecheck → exit 0
  ```
  En el navegador (3 planes anclados), contando los contextos con un envoltorio de `getContext`: tras **10 idas y vueltas** (botón 3D → Esc) hay **1 contexto WebGL**, el estado es idéntico y en modo comparar no queda ningún canvas WebGL en el DOM (el único canvas es el del calendario, Canvas 2D). La escena entra con una animación de 300 ms desde el panel (a 120 ms: `matrix(0.978, …, 1.042, …, −24)`) y al volver el panel de Malapert anima 300 ms, queda seleccionado y a la vista. Franja de miniaturas a la derecha a 1400 px; debajo a 774 px.
- **Decisiones tomadas:** el modo vivir se abre con un botón 3D explícito en cada panel. Pulsar el título sigue solo seleccionando, para no perder el panorama de la vista de comparación (spec 8.1 dice que seleccionar dispara la transición; se separa en dos gestos y queda anotado). La franja muestra solo los otros planes (spec 8.0: «los demás»).
- **Desviaciones de la spec / cambios en la guía:** archivos extra `web/src/lib/modeTransition.ts`, `web/tests/modeTransition.test.tsx`, y cambios pequeños en `PlanPanel.tsx`, `Tray.tsx` y `SiteSection.tsx` (botón y animación de vuelta).
- **Problemas abiertos:** ninguno.
- **Siguiente tarea:** T4.4.b.
