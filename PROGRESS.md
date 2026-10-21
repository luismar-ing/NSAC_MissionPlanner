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
