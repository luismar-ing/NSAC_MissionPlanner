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
