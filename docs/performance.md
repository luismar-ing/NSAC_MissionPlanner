# PolePlanner · Auditoría de rendimiento (spec 8.7)

T5.2.c (2026-10-22), **repetida en TR.5.a (2026-11-02) tras el rediseño de la Fase R** (portada con la Luna 3D, globo, sombras y vista en superficie). Medidas sobre el **build de producción** (`npm --prefix web run build`, servido con `npm --prefix web run preview`, puerto 4173), datos REAL `2c2f11dad7`.

Máquina: portátil con Windows 11 y GPU integrada Intel Iris Xe (ANGLE / Direct3D 11); Chrome headless a 1920×1080.

## Resumen

| Presupuesto (spec 8.7, D13) | Medida | Resultado |
|---|---|---|
| Carga inicial < 3 s en una conexión normal | portada **0,44 s** (mediana); shell 2D (portada → Mission Planner → «Search and compare» → calendario) **1,21 s** a 20 Mbit/s y 40 ms; 2,25 s sin compresión; 1,07 s sin limitar | ✓ |
| Series y ventanas < 15 MB | **2,96 MB** (timeseries 2,15 + windows 0,82) | ✓ |
| Total de recursos < 50 MB, con carga progresiva | **21,1 MB** en `dist/`; hasta el calendario se descargan 972 KB comprimidos (3,2 MB sin comprimir: ahora incluye three.js y la textura de la Luna de la portada) | ✓ |
| Actualización del calendario y de los paneles 2D < 100 ms | restricción → calendario redibujado **8,4 ms** (máx. 11,5; siguiente fotograma 12,3); scrubber → 5 paneles **7,1 ms** (máx. 8,1), con el globo 3D dibujándose detrás | ✓ |
| 60 fps en la reproducción 3D y en el zoom, en un portátil | portada **59,7 fps**; tránsito **60**; aproximación y zoom **59,9**; sitio con sombras del terreno y vista en primera persona **60 fps** (p95 17 ms) | ✓ |
| Un solo contexto WebGL | **1** desde la portada, tras 10 idas y vueltas planificar ↔ viaje y al volver a la portada; 1 canvas WebGL (la escena detrás del panel de búsqueda) | ✓ |

## Cómo se mide (reproducible)

```bash
npm --prefix web run build
npm --prefix web run preview          # otra terminal: http://localhost:4173/
npm --prefix web run perf             # carga inicial (3 perfiles) y tiempos de actualización
npm --prefix web run fps              # fps de la escena 3D y contextos WebGL
```

Ambos scripts (`web/scripts/perf.mjs` y `web/scripts/fps.mjs`) usan `puppeteer-core` con el Chrome o Edge instalado (`CHROME_PATH` para otro) y una sesión limpia en cada carga.

- **Carga inicial:** desde la navegación hasta la marca `shell-ready`, que la app pone en el primer dibujado del calendario (T3.5.a). Para entonces ya están cargados el manifiesto, los sitios, los planes y las ventanas de la L por defecto. La caché está desactivada y se toma la mediana de 3 cargas por perfil:
  - **sin limitar**;
  - **conexión normal:** 20 Mbit/s de bajada, 5 de subida, 40 ms de latencia;
  - **conexión normal sin compresión:** se pide `Accept-Encoding: identity`, el peor caso de un hosting que no comprimiera JSON.
- **Actualización:** la propia app mide el tiempo desde el cambio de un control hasta que se redibuja (`data-last-update-ms` en el canvas del calendario y en el scrubber de la bandeja). Se mueve el slider de sol mínimo 10 veces y el scrubber 11 veces con 5 planes anclados.
- **Frecuencia de fotogramas:** intervalos entre `requestAnimationFrame` durante la reproducción real a través de la UI:
  - tránsito a 6 h/s (5 s);
  - aproximación final y zoom hasta el sitio a 1 h/s desde 9 h antes del aterrizaje (9 s, incluida la carga del terreno);
  - sitio a escala real con terreno (3 s).

  La vista de comparación (sin WebGL) sirve de referencia del reloj de fotogramas (60 Hz).
- **Contextos WebGL:** se envuelve `getContext` antes de cargar la página y se cuentan los contextos creados durante 10 idas y vueltas.

## Detalle

### Tamaños (`dist/`, sin comprimir)

| Grupo | Tamaño | Cuándo se descarga |
|---|---|---|
| Shell: `index.html`, JS, CSS y fuentes | 0,57 MB | al inicio |
| Escena 3D (chunk `renderer`: three.js + escena) | 0,60 MB | al abrir la vista 3D por primera vez |
| manifest + sites + plans | 1,43 MB | al inicio |
| timeseries/ (series) | 2,15 MB | al anclar o seleccionar un plan (por sitio) |
| windows/ (ventanas) | 0,82 MB | la L visible al inicio; las otras al cambiar de L |
| horizon/, daily/, site_features/ | 0,22 MB | al seleccionar un plan |
| trajectory/ | 8,62 MB | una trayectoria (~5 KB) al abrir un plan en 3D |
| scene/ (efemérides de escena) | 1,58 MB | al abrir la vista 3D |
| terrain/ | 1,15 MB | solo en la aproximación final (T4.3.b) |
| texturas | 3,74 MB | al abrir la vista 3D |
| **Total** | **20,88 MB** | |

### Carga inicial (3 cargas en frío, TR.5.a)

`landing-ready`: la portada montada. `shell-ready`: primer dibujado del calendario, tras el clic en Mission Planner y en «Search and compare» (el script hace los dos clics en cuanto puede).

| Perfil | `landing-ready` | `shell-ready` | Mediana del shell | Descargado |
|---|---|---|---|---|
| Sin limitar | 276 · 298 · 185 | 1755 · 1073 · 658 | **1073** | 1327 KB |
| Normal (20 Mbit/s, 40 ms) | 359 · 488 · 440 | 1018 · 1252 · 1214 | **1214** | 972 KB |
| Normal sin compresión | 583 · 566 · 573 | 2185 · 2249 · 2282 | **2249** | 3204 KB |

Antes del rediseño (T5.2.c), el shell abría directamente en el calendario: 0,69 s en conexión normal y 334 KB.

### Frecuencia de fotogramas (1920×1080, Intel Iris Xe)

| Fase | fps | p50 | p95 | máx. | Fotogramas |
|---|---|---|---|---|---|
| Portada (Luna girando) | 59,7 | 16,7 ms | 16,9 ms | 19,9 ms | 178 |
| Panel de búsqueda sobre el globo | 60,0 | 16,7 ms | 16,9 ms | 16,9 ms | 120 |
| Tránsito, 6 h/s | 60,0 | 16,7 ms | 17,1 ms | 17,7 ms | 300 |
| Aproximación final y zoom, 1 h/s | 59,9 | 16,7 ms | 17,0 ms | 33,4 ms (1 fotograma) | 538 |
| Sitio: sombras del terreno y primera persona | 60,0 | 16,7 ms | 17,0 ms | 17,3 ms | 180 |

**Nota sobre el panel del navegador de la app de escritorio:** medido allí, el frame rate sale fijo en 30 fps, o en 1 fps en la vista sin WebGL, en cuanto la ventana no está en primer plano. Es la limitación del navegador para ventanas en segundo plano, no el coste de la escena, así que esas cifras no valen como medida. Por eso se mide con Chrome headless sobre la misma GPU. El ensayo cronometrado de T5.1.c, con el panel visible, dio 59 fps.

## Observaciones

- Fase R: la carga hasta el calendario sube de 0,69 s a 1,21 s (sigue < 3 s). La portada carga three.js y la textura de la Luna para el fondo, y el calendario está ahora a dos clics. La portada es interactiva en < 0,6 s en todos los perfiles.

- El chunk `renderer` (598 KB, 153 KB comprimido) supera el aviso de 500 KB de Vite. Es three.js más la escena y se carga solo al abrir la vista 3D, así que no afecta a la carga inicial.
- `trajectory/` es la carpeta más pesada (8,6 MB, 1825 archivos), pero cada plan usa uno solo de ~5 KB.
