# PolePlanner v2.0 · Memoria del proyecto

NASA Space Apps Challenge · planificación de sitios y fechas de aterrizaje en el polo sur lunar.
Entrega: **2026-11-13**. Fuente de verdad: `docs/SPEC.md`. Ante una duda, manda la spec; si no lo resuelve, pregunta (sección 13).

## El producto

1. Un **plan de misión** = sitio + fecha de llegada + ventana (3, 7 o 14 días) + trayectoria.
2. **Buscar:** controles de restricciones y un calendario de calor (llegada × sitios) que se ilumina en vivo.
3. **Comparar (2D):** de 2 a 5 planes en paneles idénticos: silueta del horizonte con Sol y Tierra, cinta de tiempo y métricas.
4. **Vivir (3D):** solo el plan elegido: Tierra, Luna y Sol reales por SPICE, despegue, trayecto, aterrizaje y zoom al sitio.
5. **Sitio:** panorama 360° del horizonte y panel de características; el terreno decide si hay luz y enlace.

Principio: **2D para comparar, 3D para comprender.** Un solo contexto WebGL; los paneles 2D nunca usan WebGL.

## Pila tecnológica (spec 11)

- Pipeline (offline, reproducible): Python 3.11+ (la máquina tiene 3.13), numpy, spiceypy, rasterio o similar, pyproj, pandas, pydantic, matplotlib, pytest.
- Front end: React + TypeScript, Vite, Zustand, D3, three.js, Vitest, zod. Node 24.
- Despliegue: hosting estático (Vercel, Netlify o GitHub Pages; por decidir en T7.1.a). Todo se precalcula; cero servidor en la demo.
- Entorno: Windows. Los comandos van desde la raíz del repo; funcionan en PowerShell y en Git Bash.

## Comandos

| Acción | Comando | Estado |
|---|---|---|
| Crear venv | `python -m venv .venv` | disponible |
| Instalar pipeline | `.venv/Scripts/python -m pip install -r pipeline/requirements.txt` (Git Bash/Linux: `.venv/bin/python` fuera de Windows) | disponible |
| Descargar datos | `python -m pipeline.fetch_data` | por definir (T0.2.b) |
| Validar datos | `python -m pipeline.validate <dir>` | por definir (T0.4.b) |
| Datos SYNTHETIC | `python -m pipeline.synthetic` | por definir (TS.1.a) |
| Correr el pipeline | `python -m pipeline.build_all` | por definir (T2.4.a) |
| Tests pipeline | `.venv/Scripts/python -m pytest` (config en `pyproject.toml`) | disponible |
| Instalar front end | `npm --prefix web ci` | disponible |
| Servidor de desarrollo | `npm --prefix web run dev` | disponible |
| Tests front end | `npm --prefix web test` | disponible |
| Tipos | `npm --prefix web run typecheck` | disponible |
| Build | `npm --prefix web run build` | disponible |

Cuando una tarea cree o cambie un comando, actualiza esta tabla (T0.1.d la deja definitiva).

## Reglas de trabajo (spec 11, resumen)

1. **No inventes datos científicos**, URLs, nombres de kernels ni coordenadas. Si falta, dilo o crea una subtarea de verificación. Lo sintético va marcado **SYNTHETIC** y nunca se presenta como real.
2. Toda trayectoria o animación no real se muestra como **ILLUSTRATIVE** en la interfaz y se documenta.
3. Respeta las definiciones de la sección 5. Cualquier desviación se documenta en `PROGRESS.md` y en la interfaz.
4. Verifica antes de dar algo por bueno: pruebas, rangos de 5.7 y JPL Horizons.
5. Reproducibilidad: un comando regenera los datos; versiones de dependencias fijadas.
6. Prioriza la visualización. Si hay que recortar, se recortan extras; la comparación 2D y el panel del sitio (la ciencia) nunca.
7. 2D para comparar, 3D para comprender: nada de WebGL en los paneles de comparación.
8. Cambios pequeños y verificables: un commit por subtarea, sin mezclar refactor con funciones nuevas.
9. `PROGRESS.md` siempre al día: qué se hizo, decisiones, problemas abiertos y siguiente paso.
10. Ante una ambigüedad relevante (sección 13), pregunta en lugar de suponer.
11. Rendimiento (8.7) y accesibilidad (9) son requisitos, no extras.
12. Licencias y atribución: NASA/LOLA, NAIF/SPICE y JPL Horizons en la interfaz y el README; revisa la licencia de texturas y cohete.

Idiomas: interfaz y README en **inglés**; documentación interna (`docs/`, `PROGRESS.md`) en español.

## Protocolo de sesión

Se ejecuta con `/siguiente` (`.claude/commands/siguiente.md`) o al empezar cualquier sesión de trabajo.

a. **Leer:** `CLAUDE.md`, la última entrada de `PROGRESS.md`, `docs/DECISIONS.md` y `docs/DEVELOPMENT_GUIDE.md`.
b. **Elegir** la primera subtarea `[ ]` (en el orden de la guía) cuyas dependencias estén en `[x]` y que no esté bloqueada por una decisión pendiente (reglas de elegibilidad al inicio de la guía). Si todas están bloqueadas, pregunta solo las decisiones necesarias y detente.
c. **Releer** las secciones de `docs/SPEC.md` que cita la subtarea.
d. **Implementar solo esa subtarea.** Marcarla `[~]` mientras dura.
e. **Verificar** el criterio de aceptación con pruebas o comandos reales y mostrar la salida. Nunca marcar `[x]` sin evidencia. Para lo científico, comparar con los rangos de 5.7 y con JPL Horizons.
f. **Cerrar:** actualizar el estado en la guía, añadir una entrada a `PROGRESS.md` (plantilla incluida allí) y hacer un commit por subtarea con el formato `T1.2.a: descripción`.
g. **Seguir** con la siguiente subtarea mientras no haya bloqueo. Al cerrar cada fase, detenerse y dar al humano un resumen y las instrucciones para probar el hito de demo.
h. **Corregir la guía** si resulta incorrecta o incompleta, y anotar el cambio en `PROGRESS.md`. No desviarse de la spec sin documentar el porqué.

Notas del protocolo:
- Una subtarea bloqueada se marca `[!]` con una línea `**Bloqueo:**` y se pasa a la siguiente elegible.
- Las subtareas **Humano** se preparan y quedan `[!]` hasta que el humano confirma en el chat.
- Antes de un commit: los tests de la parte tocada pasan. Nada de `--no-verify`.
- Los archivos de `data/` no se versionan (salvo `data/README.md`); sus URLs y checksums sí.

## Mapa de archivos

| Qué | Dónde |
|---|---|
| Especificación (fuente de verdad) | `docs/SPEC.md` |
| Guía de desarrollo: subtareas, estados, dependencias, hitos, recorte | `docs/DEVELOPMENT_GUIDE.md` |
| Bitácora de progreso | `PROGRESS.md` |
| Decisiones abiertas y respuestas | `docs/DECISIONS.md` |
| Contrato de datos (humano) | `docs/DATA_CONTRACT.md` (T0.4.a) |
| Contrato de datos (código) | `pipeline/contract.py` (T0.4.b), `web/src/lib/contract.ts` (T0.4.c) |
| Fuentes de datos, URLs y checksums | `data/README.md` |
| Sitios y sus fuentes | `docs/sites.md` (T0.3.a), `pipeline/sites.json` (T0.3.b) |
| Validación contra JPL Horizons | `docs/validation.md` (T1.1.a, T5.3.a) |
| Pipeline | `pipeline/` (salida intermedia en `pipeline/out/`, no versionada) |
| Datos del front end | `web/public/data/` (REAL), `web/public/data_synthetic/` (SYNTHETIC) |
| Front end | `web/src/` (`store/`, `views/`, `components/`, `lib/`, `styles/`, `scene3d/`, `panels2d/`) |
| Comando de sesión | `.claude/commands/siguiente.md` |
