# PolePlanner · Sitios candidatos y sus fuentes

Spec 6.1 y D3 (confirmada el 2026-10-21): 5 sitios en las regiones de borde de Shackleton / cresta de conexión, Haworth, borde de Nobile, macizo de Malapert y borde de de Gerlache. Ninguna coordenada sale de la spec ni de memoria.

## 1. Fuentes oficiales (consultadas el 2026-10-21)

NASA nombra las regiones candidatas de Artemis III (13 en agosto de 2022 y 9 en octubre de 2024; ~15 × 15 km en el comunicado de 2022) pero **no publica coordenadas**. La geometría oficial la publica el USGS:

1. **9 regiones de 2024** — McClernan, M. T., 2024, *Down Selected Artemis III Candidate Landing Site Navigational Grids*, U.S. Geological Survey data release, https://doi.org/10.5066/P1MEQ6UK. Archivo `A3_9regions-lonlat-simplified.zip`: polígonos en lon/lat sobre la esfera Moon 2000 (R = 1 737 400 m), con atributos `Region`, `RegionCode` y `Area_km2`.
2. **Regiones de la lista de 2022** (incluye Connecting Ridge) — McClernan, M. T., 2024, *Lunar Grid Reference System (LGRS) Artemis III Candidate Landing Site Navigational Grids in Artemis Condensed Coordinate (ACC) Format*, U.S. Geological Survey data release, https://doi.org/10.5066/P13FD9ZD. Archivo `Connecting_Ridge.zip`: rejillas LGRS de 1 km, 100 m y 10 m en la proyección polar LPS de USGS (estereográfica, falso este/norte 500 000 m, factor de escala 0,994). La huella de la región es la unión de las celdas de 1 km.

Ambas descargas son manuales (ver `data/README.md`). Restricciones de uso según los metadatos: «None».

## 2. Regiones elegidas para los 5 sitios

Coordenadas tal como las da la fuente (extensión de los vértices de cada polígono), obtenidas con `python -m pipeline.regions`. La comprobación de área confirma la reproyección: las áreas calculadas coinciden con el atributo `Area_km2` de USGS.

| Sitio (D3) | Región oficial (nombre USGS / NASA) | Fuente | Latitud | Longitud (este) | Área |
|---|---|---|---|---|---|
| Borde de Shackleton / cresta de conexión | **Connecting Ridge** (lista de 2022) | doi:10.5066/P13FD9ZD | −89.880° a −89.085° | −174.29° a −98.97° | 292.5 km² (289 celdas de 1 km) |
| Haworth | **Haworth** (2024) | doi:10.5066/P1MEQ6UK | −87.394° a −86.112° | −34.98° a −12.36° | 888.0 km² (USGS: 888.04) |
| Borde de Nobile | **Nobile Rim 1** (2024) | doi:10.5066/P1MEQ6UK | −85.897° a −84.975° | 31.64° a 43.21° | 400.0 km² (USGS: 400.0) |
| Macizo de Malapert | **Malapert Massif** (2024) | doi:10.5066/P1MEQ6UK | −86.326° a −85.634° | −5.66° a 5.15° | 441.0 km² (USGS: 441.0) |
| Borde de de Gerlache | **de Gerlache Rim 2** (2024) | doi:10.5066/P1MEQ6UK | −88.660° a −87.785° | −77.47° a −49.40° | 400.0 km² (USGS: 400.0) |

Notas:
- **Nobile:** hay dos regiones (Rim 1 y Rim 2). Se elige Nobile Rim 1 porque está más cerca del polo (~85.4°S frente a ~84°S), lo que deja más margen de DEM para el horizonte (R_max = 100 km dentro de 80°S–90°S). Nobile Rim 2 queda como alternativa.
- **de Gerlache:** en 2024 solo sigue de Gerlache Rim 2.
- **Shackleton:** Connecting Ridge no está en la lista de 2024; viene de la lista de 2022, con geometría oficial en el segundo data release.
- Todas las regiones caben en el DEM LOLA (80°S–90°S) con al menos 100 km de margen: la más alejada del polo, Nobile Rim 1 (≤ ~152 km del polo: 5.03° × 30.32 km/°), llega a ~252 km con R_max, por debajo de los 304 km del DEM.

## 3. Método de elección del punto (las fuentes dan regiones, no puntos)

Para cada región: **el punto del DEM LOLA (40 m/píxel, T0.2.d) de máxima elevación dentro del polígono oficial**, con el polígono reproyectado al CRS del DEM.

- **Motivo:** los cinco sitios de D3 son bordes, macizos y crestas; las zonas más altas son las que más Sol y más línea de vista a la Tierra tienen, que es justo lo que compara la herramienta. El criterio es determinista y reproducible.
- **Implementación:** T0.3.b (`pipeline/make_sites.py`). `elevation_m` se toma del DEM en ese punto; `source` cita la región USGS y el DEM.
- **Limitación conocida:** el punto más alto puede estar en el borde del polígono o en una zona con pendiente. Se revisa en el mapa de T0.3.c y con las pendientes de T2.3.a. Si un punto no es razonable para aterrizar, se documenta y se cambia el criterio (por ejemplo, el punto más alto con pendiente < X°) sin tocar los demás.
- **No es el sitio real de ninguna misión:** es un punto representativo dentro de una región candidata. La interfaz lo indicará así.

## 4. Punto de control para los sanity checks (T1.3.d)

**No es un sitio candidato**; solo sirve para el sanity check de 5.7 («los fondos de cráteres permanentemente sombreados tienen ~0 %»).

- **Fuente:** nomenclátor planetario IAU/USGS (https://planetarynames.wr.usgs.gov), entrada **Shackleton**, Feature ID 5450, aprobada en 1994: centro −89.67°, 129.78°E (planetográfico +Este; en la Luna esférica coincide con el planetocéntrico), diámetro 20.92 km. Consultado el 2026-10-21.
- **Método:** píxel más bajo del DEM LOLA a ≤ 3 km de ese centro (`pipeline/visibility.py`, `control_point`).
- **Resultado:** −89.62485°, 118.68281°, z = −2 871.9 m. Horizonte de hasta +26.93° (las paredes del cráter); 0.00 % de Sol y 0.00 % de Tierra en el año.
