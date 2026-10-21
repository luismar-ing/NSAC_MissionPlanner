---
description: Ejecuta el protocolo de sesión de PolePlanner (elige, implementa y verifica la siguiente subtarea)
argument-hint: "[ID de subtarea opcional, p. ej. T1.2.a]"
---

Ejecuta el **protocolo de sesión** de PolePlanner v2.0. Sigue los pasos en orden y no te saltes ninguno.

Argumento opcional: `$ARGUMENTS`. Si es un ID de subtarea, trabaja en ella solo si es elegible según la regla del paso b; si no lo es, explica por qué (dependencia o decisión pendiente) y detente.

## a. Leer el contexto

Lee, completos:
1. `CLAUDE.md`
2. la **última entrada** de `PROGRESS.md`
3. `docs/DECISIONS.md`
4. `docs/DEVELOPMENT_GUIDE.md` (sobre todo "Cómo usar esta guía" y el estado de las subtareas)

Resume en 2 o 3 líneas dónde está el proyecto (fase actual, última subtarea hecha, bloqueos).

## b. Elegir la subtarea

Toma la **primera subtarea `[ ]` en el orden de la guía** que cumpla todo esto:
- todas sus dependencias (`Depende de`) están en `[x]`;
- todas sus decisiones (`Decisiones`) están **confirmadas** en `docs/DECISIONS.md`;
- su fase es la primera fase sin cerrar, o lleva la marca **Adelantable**;
- no lleva la marca **Humano** (esas se preparan y se dejan `[!]` hasta la confirmación).

Si ninguna es elegible: lista solo las decisiones (o acciones humanas) que desbloquearían la siguiente subtarea, pregúntalas de forma concreta con el valor propuesto por defecto y **detente**.

Di qué subtarea eliges y por qué.

## c. Releer la spec

Relee en `docs/SPEC.md` las secciones que cita la subtarea (`Spec`) y, si toca datos, `docs/DATA_CONTRACT.md`.

## d. Implementar

- Marca la subtarea `[~]` en la guía.
- Implementa **solo esa subtarea**, tocando los archivos que indica (si necesitas otros, justifícalo).
- Reglas de `CLAUDE.md`: nada de datos, URLs, nombres de kernels ni coordenadas inventados; lo sintético va como SYNTHETIC y lo no real como ILLUSTRATIVE.

## e. Verificar

- Ejecuta el criterio de **Aceptación** con pruebas o comandos reales y **muestra la salida real**.
- Lo científico se compara con los rangos de la sección 5.7 y con JPL Horizons.
- Si no se cumple, corrige y repite. Si no se puede cumplir, marca `[!]` con `**Bloqueo:**` y el motivo, anótalo en `PROGRESS.md` y pasa al paso g.
- **Nunca marques `[x]` sin evidencia.**

## f. Cerrar la subtarea

1. Cambia el estado a `[x]` en `docs/DEVELOPMENT_GUIDE.md`.
2. Añade una entrada a `PROGRESS.md` con la plantilla del archivo (fecha, tarea, qué se hizo, cómo se verificó con la salida real, decisiones, problemas abiertos y siguiente tarea).
3. Si cambió un comando, actualiza la tabla de comandos de `CLAUDE.md`.
4. Haz **un commit por subtarea** con el mensaje `T1.2.a: descripción` (con el ID real), incluyendo código, guía y `PROGRESS.md`.

## g. Continuar o detenerse

- Si quedan subtareas elegibles en la misma fase, vuelve al paso b.
- Si la fase quedó **cerrada** (todas sus subtareas en `[x]`): ejecuta su **Hito de demo**, **detente** y da al humano un resumen de la fase y las instrucciones exactas para probar el hito.
- Detente también si aparece un bloqueo que necesite al humano.

## h. Mantener la guía

Si la guía resulta incorrecta o incompleta (dependencia que falta, criterio imposible, subtarea demasiado grande), corrígela y anota el cambio y su motivo en `PROGRESS.md`. No te desvíes de `docs/SPEC.md` sin documentar el porqué.
