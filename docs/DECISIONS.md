# PolePlanner v2.0 · Decisiones abiertas

Las 13 decisiones de la sección 13 de [SPEC.md](SPEC.md). Una subtarea que cita una decisión **pendiente** no es elegible (ver la guía).

**Cómo responder:** en el chat, por número (por ejemplo «D3: acepto el valor por defecto», «D4: 2027-03-01 a 2028-03-01»). El agente copia la respuesta en la columna *Respuesta*, cambia el estado a **confirmada** con la fecha y lo anota en `PROGRESS.md`. Un valor por defecto solo se usa cuando el humano lo confirma.

| # | Decisión | Valor propuesto por defecto | Bloquea | Estado | Respuesta |
|---|---|---|---|---|---|
| D1 | Tamaño del equipo, horas disponibles y habilidades de cada integrante | — | Ninguna subtarea; ajusta el calendario y el reparto de la guía | pendiente (parcial) | 3 personas. Faltan las habilidades y las horas disponibles de cada una. |
| D2 | Idioma de la interfaz | Inglés por defecto, preparado para traducción al español | T0.1.c, T3.1.c | **confirmada** (2026-10-20) | Inglés. Los textos se centralizan en un módulo (T3.1.c); la traducción al español queda fuera de alcance salvo que se pida. |
| D3 | Qué 4 o 5 sitios exactos se usan | Los 5 de la sección 6.1: borde de Shackleton / cresta de conexión, Haworth, borde de Nobile, macizo de Malapert y borde de de Gerlache. Coordenadas tomadas de listados oficiales y del DEM (T0.3.a), nunca de la spec | T0.2.d, T0.3.a, T0.3.b, T1.1.a | **confirmada** (2026-10-21) | Valor por defecto: los 5 sitios de 6.1 (Shackleton, Haworth, Nobile, Malapert, de Gerlache); coordenadas solo de fuentes oficiales (T0.3.a). Concretado y confirmado por el humano el 2026-10-21: regiones USGS Connecting Ridge, Haworth, Nobile Rim 1, Malapert Massif y de Gerlache Rim 2; punto = cota máxima del DEM LOLA dentro de cada región (docs/sites.md). |
| D4 | Rango de fechas de la demo | 1 año desde la fecha de inicio de la misión. Propuesta: 2027-01-01T00:00Z a 2028-01-01T00:00Z (falta confirmar el inicio) | T0.2.a, T0.2.c, T1.1.a, T1.1.e, T1.4.d, T2.1.a | **confirmada** (2026-10-21) | Valor por defecto: 2027-01-01T00:00Z a 2028-01-01T00:00Z. |
| D5 | Trayectoria real (kernel SPICE de una misión publicada) o ilustrativa; `transit_days` por defecto | Ilustrativa (ILLUSTRATIVE). `transit_days` = 3 días como parámetro (orden de las misiones Apolo; confirmar) | T1.5.a, T2.2.a, T2.2.b | **confirmada** (2026-10-21) | Ilustrativa (ILLUSTRATIVE); `transit_days` = 3 días (parámetro). T2.2.a queda como «no aplica (D5)». |
| D6 | Planes para todas las combinaciones (sitio × llegada × L) o solo presets | Todas: 5 sitios × 365 días × 3 L ≈ 5 475 planes. `trajectory_id` por (sitio, día de llegada) ≈ 1 825 trayectorias, cargadas bajo demanda; si exceden el presupuesto, solo presets | T0.4.a, T1.5.a, T2.2.c | **confirmada** (2026-10-21) | Valor por defecto: todas las combinaciones (~5 475 planes); `trajectory_id` por (sitio, día de llegada), cargadas bajo demanda. |
| D7 | Calendario indexado por fecha de llegada o de lanzamiento | Por fecha de llegada (`arrival_utc`), como propone la spec | T0.4.a, T1.5.a, T3.2.a | **confirmada** (2026-10-21) | Valor por defecto: por fecha de llegada (`arrival_utc`). |
| D8 | Modo de escala de la escena 3D (5.9) y nivel de detalle del despegue | Radios de los cuerpos exagerados por un factor fijo y distancias comprimidas, con direcciones angulares exactas; indicador de escala visible; zoom final a escala real local. Despegue mínimo (ascenso ilustrativo simple) | T2.4.a, T4.1.b, T4.2.a, T4.2.b, T6.3.a | **confirmada** (2026-10-21) | Valor por defecto: radios exagerados por un factor fijo, distancias comprimidas, direcciones angulares exactas, indicador de escala y zoom final a escala real; despegue mínimo. |
| D9 | ¿Terreno 3D del sitio (Nivel B) o panorama 2D perfeccionado y zoom a terreno simplificado? | Panorama 2D (Nivel A) y zoom a terreno simplificado en el MVP; Nivel B solo como extra (T6.1) | T2.3.d, T2.3.e, T4.3.b, T6.1.a, T6.1.b | **confirmada** (2026-10-21) | Valor por defecto: panorama 2D (Nivel A) y zoom a terreno simplificado en el MVP; Nivel B solo como extra (T6.1). |
| D10 | Lista exacta de características del sitio (5.10) y radio de referencia para la pendiente | Toda la lista de 5.10; radio de referencia de 1 km (parámetro) | T2.3.a, T2.3.b, T2.3.c, T3.4.c | **confirmada** (2026-10-21) | Valor por defecto: toda la lista de 5.10; radio de referencia de la pendiente 1 km (parámetro). |
| D11 | Requisitos exactos de entrega de Space Apps (formato, video, repositorio público) | Sin valor por defecto: hay que consultar las reglas oficiales | T7.1.a, T7.3.a, T7.4.a | pendiente | |
| D12 | Altura del observador y margen de antena por defecto | h_obs = 3 m; margen de antena = 0.5° | T1.1.b, T1.2.c, T1.2.e, T1.3.b | **confirmada** (2026-10-21) | Valor por defecto: h_obs = 3 m; margen de antena = 0.5°. |
| D13 | Presupuesto total de recursos (texturas, mallas, cohete) | < 50 MB con carga progresiva; series y ventanas < 15 MB (8.7) | T0.2.f, T2.2.c, T2.3.d, T2.3.e, T2.4.b, T4.1.c, T4.3.b, T5.2.c | **confirmada** (2026-10-21) | Valor por defecto: < 50 MB en total con carga progresiva; series y ventanas < 15 MB. |

## Otras decisiones registradas

| # | Decisión | Estado | Respuesta |
|---|---|---|---|
| A1 | Fecha límite de entrega | **confirmada** (2026-10-20) | 2026-11-13 |
| A2 | Otras decisiones ya tomadas por el equipo | pendiente | Preguntado al humano en la sesión de arranque. |
| A4 | Omitir la Pista S (datos SYNTHETIC para el front end) | **confirmada** (2026-10-21) | Los datos reales ya existen (Fase 2); el front end los usa directamente. Las pruebas usan las fixtures del contrato. |
| A5 | Calendario transpuesto: una fila por sitio y una columna por día (spec 8.5 dice filas = días) | propuesta del agente (2026-10-21), revisable | 365 filas no caben en el «calendario compacto» de arriba (8.0) en 1920×1080; transpuesto ocupa ~160 px de alto. Se revierte cambiando `lib/calendar.ts`. |
| A3 | Límites de elevación de 5.7 corregidos por latitud (Sol: colat + 1.6°; Tierra: colat + 7.5°) | **confirmada** (2026-10-21) | Aceptada por el humano; motivo y evidencia en docs/validation.md §2. |

## Decisiones de diseño de la guía (revisables, no bloquean)

Tomadas por el agente al escribir la guía. Si el humano no está de acuerdo, se cambian y se anota en `PROGRESS.md`.

- **Contrato de datos:** documento `docs/DATA_CONTRACT.md` + modelos pydantic en Python + esquemas zod en TypeScript, con fixtures compartidas para probar la paridad (T0.4).
- **Marca de datos:** `manifest.json` añade `data_status: "REAL" | "SYNTHETIC"` a lo que pide 7.2, para que la interfaz pueda avisar siempre (regla 1).
- **Datos SYNTHETIC:** se generan en Python (`pipeline/synthetic.py`) y van a `web/public/data_synthetic/`, nunca a `web/public/data/`.
- **Panel del sitio:** se construye como componente 2D en la Fase 3 (T3.4.c) para que sobreviva a cualquier recorte del 3D (regla 6).
- **Tarea añadida T3.5:** paso explícito de datos SYNTHETIC a reales al cerrar la Fase 3.
