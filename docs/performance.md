# PolePlanner · Auditoría de rendimiento (spec 8.7)

T5.2.c, 2026-10-22. Medidas sobre el **build de producción** (`npm --prefix web run build`, servido con `npm --prefix web run preview`, puerto 4173), datos REAL `2c2f11dad7`.

Máquina: portátil con Windows 11 y GPU integrada Intel Iris Xe (ANGLE / Direct3D 11); Chrome headless a 1920×1080.

## Resumen

| Presupuesto (spec 8.7, D13) | Medida | Resultado |
|---|---|---|
| Carga inicial del shell 2D < 3 s en una conexión normal | **0,69 s** a 20 Mbit/s y 40 ms (mediana de 3, caché fría); 1,58 s sin compresión; 0,31 s sin limitar | ✓ |
| Series y ventanas < 15 MB | **2,96 MB** (timeseries 2,15 + windows 0,82) | ✓ |
| Total de recursos < 50 MB, con carga progresiva | **20,88 MB** en `dist/`; la carga inicial descarga 334 KB comprimidos (2,1 MB sin comprimir) | ✓ |
| Actualización del calendario y de los paneles 2D < 100 ms | restricción → calendario redibujado **6,8 ms** (máx. 9,7; siguiente fotograma 11,7); scrubber → 5 paneles **1,9 ms** (máx. 3,5) | ✓ |
| 60 fps en la reproducción 3D y en el zoom, en un portátil | tránsito **59,8 fps**, aproximación y zoom **60 fps**, sitio a escala real con terreno **60 fps** (p95 16,9 ms) | ✓ |
| Un solo contexto WebGL | **1** tras 10 idas y vueltas comparar ↔ vivir; 0 canvas WebGL en el DOM en modo comparar | ✓ |

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

### Carga inicial (ms hasta `shell-ready`, 3 cargas en frío)

| Perfil | Cargas | Mediana | Descargado |
|---|---|---|---|
| Sin limitar | 390 · 310 · 288 | **310** | 334 KB |
| Normal (20 Mbit/s, 40 ms) | 688 · 683 · 696 | **688** | 334 KB |
| Normal sin compresión | 1583 · 1577 · 1577 | **1577** | 2132 KB |

### Frecuencia de fotogramas (1920×1080, Intel Iris Xe)

| Fase | fps | p50 | p95 | máx. | Fotogramas |
|---|---|---|---|---|---|
| Comparar, sin WebGL (referencia) | 60,0 | 16,7 ms | 16,9 ms | 17,0 ms | 121 |
| Tránsito, 6 h/s | 59,8 | 16,7 ms | 16,9 ms | 33,8 ms (1 fotograma) | 299 |
| Aproximación final y zoom, 1 h/s | 60,0 | 16,7 ms | 16,8 ms | 17,1 ms | 540 |
| Sitio a escala real con terreno | 60,0 | 16,7 ms | 16,9 ms | 17,1 ms | 180 |

**Nota sobre el panel del navegador de la app de escritorio:** medido allí, el frame rate sale fijo en 30 fps, o en 1 fps en la vista sin WebGL, en cuanto la ventana no está en primer plano. Es la limitación del navegador para ventanas en segundo plano, no el coste de la escena, así que esas cifras no valen como medida. Por eso se mide con Chrome headless sobre la misma GPU. El ensayo cronometrado de T5.1.c, con el panel visible, dio 59 fps.

## Observaciones

- El chunk `renderer` (598 KB, 153 KB comprimido) supera el aviso de 500 KB de Vite. Es three.js más la escena y se carga solo al abrir la vista 3D, así que no afecta a la carga inicial.
- `trajectory/` es la carpeta más pesada (8,6 MB, 1825 archivos), pero cada plan usa uno solo de ~5 KB.
