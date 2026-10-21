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
