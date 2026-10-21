# PolePlanner v2.0: Especificación del proyecto y contexto para agente IA

NASA Space Apps Challenge · Reto: planificación de sitios y fechas de
aterrizaje en el polo sur lunar · Versión 2.0 · Octubre 2026

**Qué cambió respecto a v1.0:**

-   El producto ahora es un viaje Tierra → Luna → sitio de aterrizaje,
    con el reto científico (Sol y Tierra contra el horizonte) como acto
    final.

-   Los planes de misión se comparan **simultáneamente en paneles 2D**.

-   **Solo el plan seleccionado se despliega en 3D**: escena
    Tierra-Luna-Sol, despegue, trayectoria, aterrizaje y zoom al sitio.

-   Se añaden trayectoria, escalas, características del sitio y un nuevo
    esquema de datos.

-   Se reordenan las fases de trabajo y el guion de la demo.

## 0. Cómo usar este documento

Este documento tiene dos propósitos:

1.  Describir el proyecto (visión, usuarios, vistas, alcance, plan,
    demo) para el equipo humano.

2.  Servir como contexto base para un agente de IA que ayude a
    desarrollarlo (ciencia, fórmulas, esquema de datos, arquitectura,
    tareas con criterios de aceptación y reglas de trabajo).

Si eres un agente: lee las secciones 1 a 4 para entender el objetivo,
las secciones 5 y 6 para la ciencia y los datos, la 7 y 8 para la
arquitectura y las vistas, la 10 para tu lista de tareas y la 11 para
las reglas de trabajo. Cuando algo no esté definido, consulta la sección
13 (decisiones abiertas) y pregunta al humano en lugar de inventar.

## 1. El reto

Texto del reto (resumen fiel): las misiones al polo sur de la Luna
enfrentan condiciones extremas de iluminación y comunicación, y
planearlas exige coordinación entre equipos de ciencia e ingeniería.
Existen herramientas para calcular las posiciones del Sol y la Tierra en
sitios candidatos, pero sus interfaces son complicadas y dificultan
evaluar la información crítica con eficiencia. Se pide crear una
herramienta o aplicación intuitiva que permita a planificadores de
misión, educadores y público comparar sitios de aterrizaje y fechas
rápidamente, visualizando las posiciones del Sol y la Tierra respecto al
horizonte para evaluar el potencial de generación de energía y las
ventanas de comunicación directa con la Tierra.

Hechos físicos que condicionan todo el diseño:

-   En el polo sur lunar el Sol nunca sube más de \~1.5° sobre el
    horizonte (la inclinación del eje lunar respecto a la eclíptica es
    \~1.54°).

-   La Tierra siempre está cerca del horizonte y oscila por la libración
    lunar (cambia unos pocos grados en elevación y azimut a lo largo del
    mes).

-   Por eso el relieve del terreno (máscara de horizonte) decide si hay
    luz o enlace, no solo la geometría orbital. Una herramienta que solo
    grafica efemérides sin terreno es incorrecta para este problema.

**Cómo responde v2.0 al reto:** el viaje 3D es el gancho para educadores
y público; la comparación 2D responde a «comparar sitios y fechas
rápidamente»; y el panorama del horizonte con métricas al aterrizar
responde a «visualizar Sol y Tierra respecto al horizonte». Si el
recorte de tiempo obliga a elegir, se conserva siempre la parte
científica del sitio (secciones 5.1 a 5.7).

## 2. Visión del producto

PolePlanner permite **comparar planes de misión** y **vivir el plan
elegido**.

-   **Plan de misión:** una combinación de sitio de aterrizaje, fecha de
    llegada, longitud de ventana y trayectoria asociada (ver 5.8).

-   **Comparar (2D):** de 2 a 5 planes se muestran a la vez en paneles
    2D con el mismo formato y el mismo reloj relativo, para ver
    diferencias de un vistazo.

-   **Buscar:** el usuario fija restricciones de misión con controles
    deslizantes y un calendario de calor se ilumina en tiempo real con
    los planes que las cumplen; los mejores se anclan a la bandeja de
    comparación.

-   **Vivir (3D):** al seleccionar un plan, su panel se expande a una
    escena 3D única: la Tierra, la Luna y el Sol en el espacio, el
    cohete que despega y hace su trayecto, el aterrizaje y un zoom
    continuo hasta el sitio, donde aparecen sus características y el
    panorama 360° del horizonte.

Frase para el pitch: «Compara en 2D, decide, y luego viaja allí en 3D.»

Prioridad del proyecto: la calidad de la visualización es el factor
principal de éxito. Ante cualquier disyuntiva de tiempo, se prioriza lo
que mejora lo que el usuario ve (claridad, fluidez, belleza, comprensión
inmediata) sobre funciones adicionales de cálculo. El proyecto no
necesita encajar en un rol específico (por ejemplo, ingeniería de
datos): el objetivo es el mejor resultado posible en el hackathon.

**Principio de diseño v2.0:** 2D para comparar, 3D para comprender.
Comparar en 3D es lento y confuso; comprender un solo plan en 2D es
árido. Cada dimensión se usa donde rinde más. Además, solo un contexto
WebGL está activo a la vez, lo que protege el rendimiento.

## 3. Usuarios y preguntas que debe responder

  -----------------------------------------------------------------------
  Usuario             Pregunta central            Qué lo responde
  ------------------- --------------------------- -----------------------
  Planificador de     ¿Qué plan (sitio y fechas)  Controles de
  misión              cumple mis requisitos de    restricciones,
                      energía y comunicación, y   calendario, paneles 2D
                      cuál es mejor frente a los  comparativos, cuadro de
                      demás?                      métricas

  Educador            ¿Por qué es tan difícil el  Viaje 3D narrado,
                      polo sur lunar? ¿Cómo llega panorama 360°, modo
                      una misión allí?            guiado

  Público             ¿Cómo se vería el viaje y   Escena Tierra-Luna-Sol,
                      el cielo allí?              zoom al sitio, panorama
                                                  inmersivo
  -----------------------------------------------------------------------

## 4. Alcance

### 4.1 MVP (obligatorio)

-   4 o 5 sitios candidatos y un rango de fechas de 1 año, que generan
    los planes de misión.

-   **Bandeja de comparación 2D** con de 2 a 5 paneles de plan, cada uno
    con: silueta del horizonte con Sol y Tierra, cinta de tiempo y
    cuadro de métricas.

-   Calendario de calor (llegada × sitios) con controles de
    restricciones que iluminan las celdas válidas y permiten anclar
    planes a la bandeja.

-   **Escena 3D del plan seleccionado**: Tierra, Luna, Sol, cohete y
    trayectoria, con control de tiempo.

-   **Transición de zoom** Tierra → Luna → polo sur → sitio (puede usar
    terreno simplificado).

-   **Panel de características del sitio** con las métricas de 5.5 y los
    atributos de 5.10.

-   Panorama del horizonte 2D (Nivel A, ver 8.4) en el sitio de
    aterrizaje.

-   Las vistas están enlazadas: seleccionar plan, sitio o tiempo en una
    actualiza las demás.

-   Validación contra una fuente de referencia (JPL Horizons)
    documentada.

### 4.2 Extras (solo si el MVP está sólido, en este orden)

1.  Terreno 3D del sitio con malla fina y sombras (Nivel B del panorama,
    ver 8.4).

2.  Mapa polar iluminado como paso intermedio del zoom.

3.  Despegue detallado (etapas, separación) y modo educativo narrado.

4.  Modelo de energía (estado de carga de batería).

5.  Entrada de restricciones en lenguaje natural.

6.  Vista AR en el celular.

### 4.3 Fuera de alcance

Cobertura de todo el polo, cálculo en vivo en servidor, cuentas de
usuario, análisis térmico detallado, aerodinámica real del despegue,
optimización de trayectorias y descenso propulsado real.

## 5. Fundamentos científicos y definiciones

Esta sección es la fuente de verdad de las definiciones. El código debe
implementarlas tal cual y documentar cualquier desviación.

### 5.1 Marcos de referencia y observador

-   **Tiempo:** todo en UTC. Paso de muestreo por defecto: 30 minutos
    (parametrizable a 10).

-   **Cuerpo y marco lunar:** usar el marco fijo a la Luna de SPICE
    (MOON_ME, eje medio/rotación, o MOON_PA si se cargan los kernels de
    ejes principales). Documentar cuál se usó.

-   **Observador:** un punto sobre la superficie (latitud selenográfica,
    longitud, radio tomado del DEM) más una altura del observador h_obs
    (por defecto 3 m, parámetro; representa el panel o la antena del
    módulo).

-   **Marco local (ENU/topocéntrico):** Este, Norte, Arriba en el sitio.
    Azimut medido desde el Norte local hacia el Este (0° a 360°).
    Elevación sobre el plano horizontal local.

-   **Vectores:** posición del Sol y de la Tierra respecto al observador
    con spiceypy.spkpos (con corrección de luz LT+S), transformados al
    marco ENU del sitio.

### 5.2 Máscara de horizonte

Para cada sitio, horizon_el\[az\] es la elevación angular máxima del
terreno visto desde el observador en cada bin de azimut (por defecto 1°,
360 valores).

Algoritmo (por bin de azimut):

1.  Trazar un rayo sobre el DEM desde el sitio hasta una distancia
    máxima R_max (por defecto 100 km, parámetro).

2.  En cada paso a distancia d, con altura del terreno z(d): elev =
    atan2(z(d) - z0 - h_obs - d²/(2·R_luna), d), donde R_luna ≈ 1737.4
    km. La curvatura se resta porque el terreno lejano cae por debajo
    del plano tangente.

3.  horizon_el\[az\] = max(0, max_d elev) o, si se prefiere conservar
    valores negativos, sin recortar (documentar la elección).

Notas: en proyección polar estereográfica el tamaño de píxel es
aproximado; convertir coordenadas con cuidado y validar con un caso
simple (por ejemplo, un cráter sintético).

### 5.3 Visibilidad del Sol

El Sol tiene un radio angular de \~0.265° (0.53° de diámetro, varía
ligeramente). Criterio por defecto: el Sol se considera iluminando si su
borde superior está sobre la máscara:

sun_visible = (sun_el + 0.265°) \> horizon_el\[sun_az\]

Para rigor extra, calcular la fracción visible del disco (0 a 1) en
lugar de un booleano, y tratar fraction \> 0.5 como «día» por defecto
(parámetro). Documentar el criterio usado en la interfaz.

### 5.4 Visibilidad de la Tierra y enlace directo

La Tierra tiene un radio angular de \~0.95° visto desde la Luna
(diámetro \~1.9°). Criterio por defecto para enlace directo a la Tierra:

earth_visible = earth_el \> horizon_el\[earth_az\] + margen_antena

con margen_antena por defecto 0.5° (parámetro; representa el margen de
apuntamiento y obstrucciones menores). Se usa el centro de la Tierra.
Opcional: indicar visibilidad parcial cuando solo el borde supera la
máscara.

### 5.5 Métricas por ventana

Dada una ventana \[t0, t0 + L días\] y un sitio, donde t0 es el inicio
del tiempo en superficie (la llegada, ver 5.8):

-   sun_pct: porcentaje del tiempo con Sol visible.

-   longest_dark_h: duración (horas) de la racha continua más larga sin
    Sol.

-   earth_h_per_day_min: mínimo de horas diarias con Tierra visible
    dentro de la ventana.

-   earth_h_per_day_mean: promedio de horas diarias con Tierra visible.

-   longest_comm_gap_h: racha continua más larga sin Tierra visible.

-   score: puntuación combinada en \[0, 1\] (definición por defecto en
    5.6).

### 5.6 Restricciones y puntuación

Una ventana cumple las restricciones del usuario si:

sun_pct \>= X y longest_dark_h \<= Y y earth_h_per_day_min \>= Z

(las tres condiciones son opcionales: un control desactivado no se
evalúa).

score = w1·norm(sun_pct) + w2·(1 - norm(longest_dark_h)) +
w3·norm(earth_h_per_day_mean), con pesos por defecto w1 = 0.4, w2 = 0.3,
w3 = 0.3 y norm a \[0, 1\] sobre el rango observado. Los pesos se
exponen como parámetros.

### 5.7 Valores de referencia para sanity checks

-   La elevación del Sol en el polo sur debe quedar siempre entre
    aproximadamente −1.6° y +1.6°.

-   La Tierra debe oscilar cerca del horizonte, con elevaciones del
    orden de unos pocos grados positivos y negativos.

-   Sitios de crestas altas deben tener más Sol que fondos de cráter
    (los fondos de cráteres permanentemente sombreados tienen \~0%).

-   Si algún resultado contradice estos rangos, hay un error de marcos o
    signos.

### 5.8 Plan de misión y trayectoria (nuevo en v2.0)

**Definición.** plan = { id, site_id, arrival_utc, window_days (3, 7 o
14), transit_days, launch_utc, trajectory_id }, con launch_utc =
arrival_utc − transit_days. El calendario de calor se indexa por
arrival_utc (decisión por confirmar en 13).

**Trayectoria.** Se necesita una curva de la Tierra a la Luna para
dibujar el cohete. Hay dos opciones y el humano decide cuál (ver 13):

-   **Real:** usar un kernel SPICE de una misión publicada, solo si
    existe, es verificable y cubre el periodo. No inventar nombres de
    archivos ni URLs; registrarlos en data/README.md.

-   **Ilustrativa (por defecto):** curva simplificada (por ejemplo
    transferencia tipo cónicas empalmadas o retorno libre) calculada con
    las posiciones reales de la Luna por SPICE para la fecha del plan.
    transit_days por defecto es un parámetro (orden de varios días;
    confirmar el valor).

Toda trayectoria que no provenga de un kernel real debe mostrarse en la
interfaz con la etiqueta **ILLUSTRATIVE** y documentarse en PROGRESS.md.
Nunca presentarla como trayectoria real de una misión.

**Despegue.** Es una animación ilustrativa de ascenso desde un sitio de
lanzamiento (parámetro, por defecto una plataforma genérica en la
Tierra) que se funde con la trayectoria. No se modela aerodinámica ni
dinámica de etapas en el MVP.

**Lo que sí debe ser real:** las posiciones de Tierra, Luna y Sol y la
orientación de la Luna por SPICE para la fecha del plan, de modo que la
iluminación, la fase y la libración que ve el usuario en 3D coincidan
con los datos del sitio.

### 5.9 Escalas en la escena 3D (nuevo en v2.0)

La distancia Tierra-Luna (\~384 400 km) frente a los radios (\~6371 km y
\~1737 km) no permite mostrar todo a escala con un cohete visible.
Reglas:

-   Definir y documentar un modo de escala (por ejemplo, tamaños de
    cuerpos exagerados con distancias comprimidas) y mostrar un
    indicador de escala en la interfaz.

-   Las direcciones angulares (dirección del Sol, fase de la Luna,
    orientación) se mantienen correctas aunque las distancias se
    comprimen.

-   El zoom final al sitio usa escala real local.

-   Para evitar errores de precisión numérica al cruzar órdenes de
    magnitud, renderizar relativo a la cámara y usar buffer de
    profundidad logarítmico en three.js.

### 5.10 Características del sitio (nuevo en v2.0)

El panel de características muestra, con su fuente o método:

-   Coordenadas selenográficas y elevación (del DEM).

-   Pendiente media y máxima en un radio de referencia (parámetro)
    calculadas del DEM.

-   Métricas de la ventana (5.5): sun_pct, longest_dark_h, enlace con la
    Tierra.

-   Horas de Sol y de Tierra por día en la ventana.

-   Distancia y nombre de rasgos cercanos (cráteres, crestas) tomados de
    listados oficiales, citando la fuente; si no hay dato verificado,
    omitirlo.

-   Cualquier atributo sin fuente verificable se omite o se marca como
    no disponible, nunca se rellena.

## 6. Datos y fuentes

Nota para el agente: los nombres exactos de archivos y URLs deben
verificarse al descargar; no los inventes. Guarda un data/README.md con
las URLs, fechas de descarga y checksums reales. Si un dato no está
disponible, usa un dato sintético claramente marcado como SYNTHETIC y
avisa al humano.

  ------------------------------------------------------------------------
  Dato          Fuente sugerida                       Uso
  ------------- ------------------------------------- --------------------
  Elevación del LOLA (Lunar Orbiter Laser Altimeter), Máscaras de
  terreno       productos de polo sur 80°S a 90°S,    horizonte,
                resolución de decenas de metros por   pendientes y malla
                píxel (PDS Geosciences Node)          3D

  Efemérides y  Kernels SPICE del NAIF/JPL: SPK       Posición
  orientación   planetario (por ejemplo DE440),       Sol/Tierra/Luna y
  lunar         PCK/binario de orientación lunar,     marco lunar
                frame kernel lunar, LSK de segundos   
                intercalares                          

  Texturas      Mapas de la Tierra y de la Luna       Escena 3D y globo
  globales      publicados por NASA (por ejemplo NASA lunar
                SVS o LRO); verificar licencia y      
                resolución                            

  Modelo del    Modelo 3D (glTF) de licencia          Escena 3D
  cohete        compatible o uno propio simplificado  

  Validación    JPL Horizons (tabla de observador     Comparar az/el
                sobre la Luna con coordenadas del     
                sitio)                                

  Opcional      Mapas de iluminación publicados de    Validación
                LOLA y visualizaciones de NASA SVS    cualitativa del mapa
                                                      polar
  ------------------------------------------------------------------------

### 6.1 Sitios candidatos (coordenadas aproximadas, verificar)

Elegir 4 o 5 de las regiones consideradas para Artemis y el polo sur:
borde de Shackleton / cresta de conexión, Haworth, Nobile (bordes),
Malapert (macizo), de Gerlache (borde). Las coordenadas se toman del DEM
y de listados oficiales; guardar lat, lon, elevación y fuente en
sites.json. Las cifras de esta sección son orientativas, no definitivas.

## 7. Arquitectura

```
Kernels SPICE + DEM LOLA + texturas
│
Pipeline Python (offline, reproducible)
├─ horizon.py        → máscaras de horizonte por sitio
├─ ephemeris.py      → Sol/Tierra az/el por sitio y tiempo; posiciones Tierra/Luna/Sol para la escena
├─ visibility.py     → banderas Sol/Tierra
├─ windows.py        → métricas por ventana (3, 7, 14 días)
├─ trajectory.py     → trayectoria por plan (real o ILLUSTRATIVE)
├─ site_features.py  → pendiente y atributos del sitio
└─ terrain_lod.py    → mallas/teselas del terreno en niveles de detalle
│
JSON/binario precalculado (carpeta web/public/data)
│
Hosting estático (Vercel, Netlify o GitHub Pages)
│
Front end React + TypeScript (Vite)
├─ Estado global (Zustand): planes, selección, restricciones, fase, tiempo
├─ D3 / canvas / SVG: calendario, paneles 2D, cinta de tiempo, gráfico de horizonte
└─ three.js: UNA sola escena 3D (solo plan seleccionado)
```

Principio: todo se precalcula; el navegador solo filtra y dibuja. Cero
dependencia de servidor durante la demo. Los paneles 2D no usan WebGL;
solo la escena del plan seleccionado lo usa, y sus recursos pesados se
cargan bajo demanda.

### 7.1 Estructura sugerida del repositorio

La raíz del repositorio es la carpeta **NSAC_MissionPlanner/**. Todas las
rutas de este documento son relativas a ella; no se crea una subcarpeta
adicional para el proyecto.

```
NSAC_MissionPlanner/
├─ README.md
├─ CLAUDE.md                 # memoria permanente del agente (reglas, comandos, protocolo)
├─ PROGRESS.md               # bitácora que el agente actualiza
├─ .claude/commands/         # comandos del agente (por ejemplo /siguiente)
├─ data/                     # DEM, kernels y texturas (no versionados) + README.md
├─ pipeline/
│  ├─ sites.json  plans.json
│  ├─ horizon.py  ephemeris.py  visibility.py  windows.py
│  ├─ trajectory.py  site_features.py  terrain_lod.py
│  ├─ build_all.py           # genera web/public/data
│  └─ tests/
├─ web/
│  ├─ public/data/           # salida del pipeline
│  ├─ src/
│  │  ├─ store/  views/  components/  lib/  styles/
│  │  ├─ scene3d/            # escena three.js, director de cámara, fases
│  │  └─ panels2d/           # paneles de comparación
│  └─ tests/
└─ docs/
   ├─ SPEC.md                # este documento (fuente de verdad)
   ├─ DEVELOPMENT_GUIDE.md   # plan de tareas con estados y criterios de aceptación
   ├─ DECISIONS.md           # decisiones abiertas de la sección 13 y sus respuestas
   └─ validation.md          # comparación contra JPL Horizons
```

### 7.2 Esquema de datos (contrato entre pipeline y front end)

Todo en UTC. Ángulos en grados. El pipeline debe escribir un
manifest.json con versión, parámetros usados (paso, altura del
observador, margen de antena, criterio de Sol, modo de trayectoria real
o ILLUSTRATIVE, modo de escala) y rango de fechas.

-   sites.json: \[{ id, name, lat, lon, elevation_m, source }\]

-   plans.json: \[{ id, site_id, arrival_utc, window_days, transit_days,
    launch_utc, trajectory_id }\]. Puede generarse para todas las
    combinaciones (sitio × día de llegada × L) o solo para presets,
    según 13.

-   horizon/{site}.json: { az_step_deg: 1, h_obs_m, elev_deg: \[360
    números\] }

-   timeseries/{site}.json: { start_utc, step_min, sun_az: \[\], sun_el:
    \[\], earth_az: \[\], earth_el: \[\], sun_vis: \[0/1\], earth_vis:
    \[0/1\] }. Los ángulos se pueden cuantizar a enteros de 0.01° para
    reducir tamaño.

-   daily/{site}.json: por día { date, sun_pct, earth_h, longest_dark_h,
    longest_comm_gap_h }

-   windows/{site}\_{L}d.json: por día de llegada { start, sun_pct,
    longest_dark_h, earth_h_min, earth_h_mean, score } para L en {3, 7,
    14}.

-   scene/ephemeris.json: muestreo grueso (por ejemplo cada 60 min) de
    posición de la Luna y dirección del Sol en un marco común
    (Tierra-centro) y cuaternión de orientación lunar. La rotación de la
    Tierra puede derivarse de SPICE o de una fórmula documentada.

-   trajectory/{trajectory_id}.json: { mode: \"REAL\" \|
    \"ILLUSTRATIVE\", frame, t_utc: \[\], pos_km: \[\[x,y,z\]\...\] }
    más marcas de fase (despegue, inyección, llegada, aterrizaje).

-   site_features/{site}.json: atributos de 5.10 con su fuente.

-   terrain/{site}/lod{n}.\*: malla o teselas del terreno por nivel de
    detalle.

Tamaños esperados: 5 sitios × 1 año × 30 min ≈ 88 mil muestras; los
datos de series caben en pocos MB. Texturas y mallas elevan el total
(ver 8.7).

## 8. Especificación de las vistas

Todas las vistas leen y escriben el mismo estado global: plans\[\],
comparePlans\[\] (hasta 5), selectedPlanId, selectedSite,
selectedWindow, constraints {X, Y, Z}, missionPhase (overview \| launch
\| transit \| landing \| site), missionTime y compareTime (reloj
relativo compartido por los paneles 2D).

### 8.0 Disposición general

Hay dos modos de pantalla, con transición animada entre ellos:

-   **Modo comparar:** arriba, controles de restricciones y calendario
    compacto; abajo o al centro, la bandeja con los paneles 2D de los
    planes anclados, en una cuadrícula del mismo tamaño y formato.

-   **Modo vivir:** el panel seleccionado se expande a una escena 3D
    grande. Los demás planes se reducen a una franja de miniaturas 2D
    que siguen vivas y enlazadas; hacer clic en una miniatura cambia el
    plan en 3D sin salir del modo.

Un botón o tecla vuelve a comparar. El flujo de demo recorre ambos modos
(sección 12).

### 8.1 Paneles 2D de comparación (vista de comparación)

Cada panel contiene, con el mismo formato en todos los planes:

-   Nombre del plan (sitio, llegada, L) y etiqueta de trayectoria si es
    ILLUSTRATIVE.

-   Silueta del horizonte (elevación vs. azimut) con el Sol y la Tierra
    en compareTime y sus trayectorias en la ventana, con exageración
    vertical configurable.

-   Cinta de tiempo (Sol, Tierra, ambos, ninguno) con la racha de
    oscuridad más larga resaltada.

-   Cuadro de métricas: sun_pct, longest_dark_h, earth_h_per_day_min,
    earth_h_per_day_mean, longest_comm_gap_h, score y un texto corto de
    «por qué» (por ejemplo, «Mejor opción por 92% de sol y oscuridad
    máxima de 14 h»).

-   Insignia de «mejor» por cada métrica entre los paneles visibles, con
    forma o etiqueta además del color.

Todos los paneles comparten el mismo eje vertical y el mismo reloj
relativo compareTime (día y hora desde la llegada), de modo que
diferencias entre planes sean visibles sin leer números. Un scrubber
global los mueve a la vez. Seleccionar un panel fija selectedPlanId y
dispara la transición al modo vivir.

### 8.2 Escena 3D del plan seleccionado (vista estrella)

Una sola escena three.js con cuatro fases que recorren missionPhase:

1.  **Despegue:** la Tierra con el cohete ascendiendo desde el sitio de
    lanzamiento (animación ilustrativa).

2.  **Tránsito:** Tierra, Luna y Sol en el espacio; el cohete sigue la
    trayectoria del plan; se ven la dirección real del Sol y la fase de
    la Luna; la trayectoria se dibuja como estela con su etiqueta REAL o
    ILLUSTRATIVE.

3.  **Aterrizaje:** acercamiento a la Luna y descenso hacia el polo sur.

4.  **Sitio:** el zoom llega al terreno y se activa el panorama (8.4) y
    el panel de características (8.6).

Controles: reproducir/pausar, scrubber de la misión completa, saltar a
una fase, velocidad. Se muestra siempre el reloj de misión, la fase y,
en las fases 1 a 3, el indicador de escala (5.9).

### 8.3 Transición de zoom

Cámara continua (sin cortes) Tierra → globo lunar → polo sur → terreno
del sitio, con niveles de detalle (LOD) de terreno y textura que cargan
progresivamente. Pasos intermedios opcionales: mapa polar iluminado
(extra 4.2). Transiciones de 200 a 400 ms entre estados de UI y
recorrido de cámara suave y cancelable por el usuario.

### 8.4 Panorama del horizonte 360° (en el sitio)

Nivel A (MVP): panorama 2D tipo silueta en el panel del sitio: eje X =
azimut (0° a 360°, con opción de centrar en cualquier rumbo), eje Y =
elevación (rango aprox. −3° a 12°, con exageración vertical configurable
porque el relieve es muy plano). Dibujar el relleno del terreno desde
elev_deg, el Sol (disco de 0.53°) y la Tierra (disco de 1.9°) en su
posición actual, y sus trayectorias del día o de la ventana. Control de
tiempo (scrubber y reproducción), sincronizado con el de la escena.

Nivel B (extra): vista 3D del terreno en la misma escena: malla de un
parche de \~20 km de radio, cámara a h_obs, cielo negro con estrellas,
luz direccional desde el Sol, sombras. Mantener 60 fps en un portátil.

Mostrar siempre: fecha y hora UTC, elevación y azimut del Sol y de la
Tierra, estado (iluminado o no, enlace o no).

### 8.5 Calendario de calor (vista de búsqueda)

Filas = días de llegada, columnas = sitios, color = score (con
alternancia: energía, comunicaciones, combinado). Las celdas que cumplen
las restricciones se resaltan y el resto se atenúa, actualizado en vivo
al mover los controles (\< 100 ms). Clic en una celda la selecciona; un
gesto explícito (botón o doble clic) la ancla a la bandeja de
comparación (máximo 5). Selector de longitud de ventana: 3, 7 o 14 días.
Arrastre: selecciona un rango.

### 8.6 Panel de características del sitio

Tarjeta que aparece al llegar a la fase «sitio» con los atributos de
5.10 y las métricas de 5.5, el texto de «por qué» y, si hay otros planes
anclados, una comparación compacta contra ellos. Cada valor muestra su
fuente o criterio al pasar el cursor.

### 8.7 Presupuestos de rendimiento y calidad

-   Carga inicial del shell 2D (calendario, bandeja, datos de series) \<
    3 s en una conexión normal.

-   Datos de series y ventanas \< 15 MB. Texturas, mallas y modelo del
    cohete se cargan bajo demanda; el total de recursos se fija como
    parámetro del proyecto (propuesta: \< 50 MB, con carga progresiva).

-   Actualización del calendario y de todos los paneles 2D al mover un
    control o el scrubber \< 100 ms.

-   60 fps durante la reproducción de la escena 3D y del zoom, en un
    portátil.

-   Un solo contexto WebGL activo.

-   Funcional en pantalla de 1920×1080 (proyector) y razonable en móvil
    (en móvil, la bandeja 2D puede ser deslizable).

## 9. Diseño visual

-   Estética oscura tipo «centro de control».

-   Tokens de color (ajustables): fondo #0b0f1a, paneles #121a2b, Sol
    #ffb347, Tierra #4aa3ff, oscuridad #1a2238, ambos #9be3a6, texto
    #e6edf7.

-   El mismo color significa lo mismo en todas las vistas, en 2D y en 3D
    (el Sol de la silueta es del mismo naranja que el Sol de la escena).

-   Los paneles 2D de comparación son idénticos en formato, escala y
    tipografía para que la comparación sea inmediata.

-   La trayectoria se dibuja con un trazo distinto según su modo: sólido
    para REAL y punteado con etiqueta ILLUSTRATIVE para las
    ilustrativas.

-   Reloj de misión, fase actual y subtítulos cortos que acompañan el
    viaje (útiles para educadores y público).

-   Tipografía legible a distancia (proyector); jerarquía clara; pocos
    controles visibles, el resto bajo demanda.

-   Transiciones suaves (200 a 400 ms) entre estados de interfaz; el
    recorrido de cámara debe ser continuo, sin saltos bruscos al cambiar
    de plan, sitio o fecha.

-   Accesibilidad: no depender solo del color (usar también forma,
    etiqueta o patrón); contraste suficiente; opción para reducir
    movimiento que acorta o desactiva las animaciones de cámara.

-   Interfaz en inglés por defecto (los jueces son internacionales) y
    preparada para traducción al español (ver decisiones abiertas).

## 10. Plan de trabajo para el agente (tareas con criterios de aceptación)

Ejecutar en orden; no avanzar a la siguiente fase sin cumplir los
criterios de la actual. Registrar el avance en PROGRESS.md. Orden
pensado para reducir riesgo: primero un sitio con ciencia completa,
luego la comparación 2D, luego el viaje 3D.

### Fase 0: Preparación

-   **T0.1** Crear la estructura del repositorio (7.1), README.md y
    PROGRESS.md. Aceptación: el repositorio compila y README explica
    cómo ejecutar el pipeline y el front end.

-   **T0.2** Descargar kernels SPICE, el DEM y las texturas; documentar
    fuentes en data/README.md. Aceptación: spiceypy carga los kernels y
    se calcula una posición de prueba sin error; URLs y checksums
    registrados.

-   **T0.3** Definir sites.json con 4 o 5 sitios. Aceptación: cada sitio
    tiene lat, lon, elevación y fuente.

### Fase 1: Núcleo científico del sitio (pipeline)

-   **T1.1** ephemeris.py: az/el del Sol y la Tierra para un sitio en el
    marco ENU. Aceptación: elevación del Sol entre −1.6° y +1.6°;
    coincide con JPL Horizons a \< 0.05° en al menos 5 instantes.

-   **T1.2** horizon.py: máscara de horizonte por sitio. Aceptación:
    prueba con DEM sintético (cráter conocido) da la elevación esperada;
    sitios reales dan valores plausibles; gráfico de verificación
    generado.

-   **T1.3** visibility.py: banderas Sol y Tierra según 5.3 y 5.4.
    Aceptación: pruebas unitarias para casos límite (borde del Sol justo
    sobre la máscara, margen de antena).

-   **T1.4** windows.py: métricas de 5.5 para L = 3, 7, 14 con ventanas
    deslizantes eficientes. Aceptación: resultados coinciden con un
    cálculo ingenuo en una muestra; ejecución \< 1 minuto para todos los
    sitios.

-   **T1.5** plans.json: generación de planes según 5.8. Aceptación:
    cada plan tiene llegada, lanzamiento derivado y sitio válidos.

### Fase 2: Datos de la escena y del viaje

-   **T2.1** ephemeris.py (modo escena): posiciones de la Luna,
    dirección del Sol y orientación lunar en un marco común. Aceptación:
    la fase de la Luna y la dirección del Sol coinciden con una fuente
    de referencia en al menos 3 fechas.

-   **T2.2** trajectory.py: trayectoria por plan según 5.8. Aceptación:
    curva continua que termina en el sitio en la hora de llegada; modo
    REAL o ILLUSTRATIVE correctamente anotado en el archivo y en el
    manifiesto.

-   **T2.3** site_features.py y terrain_lod.py: atributos de 5.10 y
    terreno en niveles de detalle. Aceptación: pendiente verificada en
    un DEM sintético; cada atributo con fuente o marcado como no
    disponible.

-   **T2.4** build_all.py: genera public/data y manifest.json según 7.2.
    Aceptación: un solo comando reproduce todos los datos.

### Fase 3: Front end 2D y comparación

-   **T3.1** Proyecto Vite + React + TypeScript, estado global
    (Zustand), carga de datos con tipos. Aceptación: los datos cargan y
    se validan contra el esquema; sin errores de tipos.

-   **T3.2** Calendario de calor con controles de restricciones,
    resaltado de celdas válidas y anclaje a la bandeja. Aceptación:
    mover un control actualiza el resaltado en \< 100 ms; seleccionar
    una celda actualiza el estado global.

-   **T3.3** Bandeja de paneles 2D (8.1) con reloj relativo compartido.
    Aceptación: de 2 a 5 paneles se actualizan en \< 100 ms al mover el
    scrubber; el mismo formato y escala en todos; diferencias visibles
    entre planes.

-   **T3.4** Panorama 2D Nivel A (8.4). Aceptación: el Sol y la Tierra
    se mueven coherentemente con los datos; las posiciones coinciden con
    la silueta de los paneles.

### Fase 4: Escena 3D del plan seleccionado

-   **T4.1** Escena three.js con Tierra, Luna, Sol, estrellas y control
    de tiempo. Aceptación: la iluminación y la fase de la Luna coinciden
    con los datos de scene/ephemeris.json; renderizado relativo a la
    cámara y buffer logarítmico activos.

-   **T4.2** Cohete, despegue ilustrativo y trayectoria con etiqueta
    REAL/ILLUSTRATIVE. Aceptación: el cohete sigue la trayectoria del
    plan y llega al sitio a la hora de llegada; 60 fps.

-   **T4.3** Transición de zoom y carga progresiva de terreno (8.3).
    Aceptación: recorrido continuo Tierra → sitio sin cortes ni saltos
    de precisión; panorama y panel de características aparecen al final.

-   **T4.4** Transición entre modo comparar y modo vivir, y cambio de
    plan desde las miniaturas. Aceptación: seleccionar un panel expande
    la escena; elegir una miniatura cambia el plan sin salir del modo;
    un solo contexto WebGL.

### Fase 5: Integración y pulido (prioridad máxima)

-   **T5.1** Enlace completo entre vistas, cuadro de métricas y textos
    de «por qué». Aceptación: flujo de demo (sección 12) completo sin
    errores.

-   **T5.2** Pulido visual: paleta, tipografía, transiciones, estados de
    carga y de error, reducción de movimiento. Aceptación: revisión
    visual con el humano; pruebas en pantalla de proyector.

-   **T5.3** Documento de validación docs/validation.md con tabla de
    comparación contra JPL Horizons. Aceptación: tabla con al menos 5
    instantes por 2 sitios y errores \< 0.05°.

### Fase 6: Extras (en este orden de prioridad)

T6.1 Terreno 3D del sitio (Nivel B). T6.2 Mapa polar iluminado como paso
del zoom. T6.3 Despegue detallado y modo educativo narrado. T6.4 Modelo
de energía. T6.5 Lenguaje natural. Aceptación general: cada extra se
desactiva sin romper el MVP.

### Fase 7: Entrega

T7.1 Despliegue estático y verificación. T7.2 README final con capturas.
T7.3 Video de respaldo de la demo. T7.4 Revisión de requisitos de
entrega de Space Apps (consultar al humano).

## 11. Reglas de trabajo para el agente

1.  No inventes datos científicos. Si falta un valor, di que falta. Los
    datos sintéticos deben estar marcados como SYNTHETIC y nunca
    presentarse como reales.

2.  Una trayectoria o animación que no provenga de datos reales debe
    mostrarse como **ILLUSTRATIVE** en la interfaz y documentarse; nunca
    se presenta como trayectoria real de una misión.

3.  Respeta las definiciones de la sección 5. Si necesitas desviarte,
    documenta el porqué en PROGRESS.md y en la interfaz.

4.  Verifica antes de dar por correcto: ejecuta pruebas, compara con los
    valores de referencia de 5.7 y con JPL Horizons.

5.  Reproducibilidad: un comando debe regenerar los datos; fija
    versiones de dependencias.

6.  Prioriza la visualización: ante falta de tiempo, recorta extras de
    cálculo, no calidad visual del MVP. Si hay que recortar el viaje 3D,
    se conserva la comparación 2D y el panel del sitio, que son la parte
    científica.

7.  2D para comparar, 3D para comprender: no agregues WebGL a los
    paneles de comparación.

8.  Cambios pequeños y verificables: un commit por tarea, mensajes
    claros, no mezclar refactor con funciones nuevas.

9.  Mantén PROGRESS.md al día: tarea hecha, decisiones, problemas
    abiertos, siguiente paso.

10. Pregunta cuando haya ambigüedad relevante (sección 13) en lugar de
    suponer en silencio.

11. Rendimiento y accesibilidad son requisitos, no extras (8.7 y 9).

12. Licencias y atribución: cita NASA/LOLA, NAIF/SPICE y JPL Horizons en
    la interfaz y el README, y revisa la licencia de texturas y del
    modelo del cohete.

**Pila tecnológica:**

-   Pipeline: Python 3.11+, numpy, spiceypy (o skyfield / astropy),
    rasterio o similar para el DEM, pandas, pyarrow (opcional), pytest.

-   Front end: React + TypeScript, Vite, Zustand, D3, three.js, Vitest.

-   Despliegue: hosting estático.

## 12. Guion de la demo (2 minutos)

1.  **Problema (15 s):** «En el polo sur el Sol apenas roza el
    horizonte. El terreno decide todo.»

2.  **Comparar en 2D (30 s):** mover los controles, ver cómo el
    calendario se ilumina y anclar 3 planes; los paneles muestran de un
    vistazo qué plan tiene más Sol y menos oscuridad.

3.  **Elegir (10 s):** seleccionar el mejor plan; su panel se expande y
    el resto queda como miniaturas.

4.  **Viaje en 3D (35 s):** despegue, tránsito con la Tierra, la Luna y
    el Sol, aterrizaje y zoom continuo hasta el sitio.

5.  **Sitio (20 s):** panel de características y panorama; arrastrar el
    tiempo y ver al Sol y a la Tierra pasar sobre el terreno.

6.  **Cierre (10 s):** validación contra NASA/JPL, enlace compartible y
    uso para educadores y público.

Diferenciadores ante los jueces: comparación visual en 2D y vivencia en
3D del plan elegido; vistas enlazadas; rigor científico con terreno real
y validación; tres audiencias cubiertas; honestidad sobre lo que es real
y lo que es ilustrativo.

## 13. Decisiones abiertas (preguntar al humano)

1.  Tamaño del equipo, horas disponibles y habilidades de cada
    integrante.

2.  Idioma de la interfaz: inglés por defecto con soporte de español, o
    solo uno.

3.  Qué 4 o 5 sitios exactos se usarán.

4.  Rango de fechas de la demo (por defecto 1 año a partir de la fecha
    de inicio de la misión).

5.  Trayectoria **real** (kernel SPICE de una misión publicada) o
    **ilustrativa**; valor de transit_days por defecto.

6.  ¿Se generan planes para todas las combinaciones (sitio × llegada
    × L) o solo para un conjunto de presets?

7.  ¿El calendario se indexa por fecha de llegada (propuesto) o por
    fecha de lanzamiento?

8.  Modo de escala de la escena 3D (5.9) y nivel de detalle del
    despegue.

9.  ¿Se intentará el terreno 3D del sitio (Nivel B) o se perfecciona el
    panorama 2D y un zoom a terreno simplificado?

10. Lista exacta de características del sitio (5.10) y radio de
    referencia para pendiente.

11. Requisitos exactos de entrega de Space Apps (formato, video,
    repositorio público).

12. Altura del observador y margen de antena por defecto (3 m y 0.5°
    propuestos).

13. Presupuesto total de recursos (texturas, mallas, modelo del cohete);
    propuesta: \< 50 MB con carga progresiva.

## 14. Riesgos y mitigaciones

  -----------------------------------------------------------------------
  Riesgo                            Mitigación
  --------------------------------- -------------------------------------
  El procesamiento del DEM es lento Empezar con un sitio y baja
  o complejo                        resolución; usar DEM sintético para
                                    desarrollar la interfaz en paralelo

  Errores de marcos de referencia o Validar temprano contra JPL Horizons
  signos                            y los rangos de 5.7

  El viaje 3D consume demasiado     Construir primero la comparación 2D y
  tiempo                            el panel del sitio; el viaje 3D se
                                    simplifica (terreno simplificado,
                                    despegue mínimo) antes de recortar la
                                    ciencia

  Errores de precisión numérica en  Renderizado relativo a la cámara,
  el zoom entre escalas             buffer logarítmico y pruebas del
                                    recorrido completo temprano

  La trayectoria se percibe como    Etiqueta ILLUSTRATIVE visible, trazo
  real cuando es ilustrativa        distinto y nota en README

  Texturas y mallas pesadas hacen   Carga bajo demanda, niveles de
  lenta la carga                    detalle, compresión y shell 2D que
                                    carga primero

  Rendimiento con varios paneles    Paneles en canvas/SVG sin WebGL; un
  más una escena 3D                 solo contexto WebGL; pruebas en el
                                    equipo real

  Demasiadas vistas                 Congelar el MVP al inicio y no añadir
                                    alcance hasta que funcione

  Fallo de la demo en vivo          Hosting estático, datos precalculados
                                    y video de respaldo

  Rendimiento en el proyector       Probar en el equipo real; versión
                                    ligera de respaldo
  -----------------------------------------------------------------------

## 15. Glosario

-   **Plan de misión:** combinación de sitio, fecha de llegada, longitud
    de ventana y trayectoria asociada.

-   **Máscara de horizonte:** elevación angular del terreno en cada
    dirección (azimut) vista desde el sitio.

-   **Azimut / Elevación:** ángulo horizontal desde el Norte hacia el
    Este / ángulo sobre el horizonte local.

-   **Libración:** oscilación aparente de la Luna que mueve la posición
    de la Tierra en su cielo.

-   **Enlace directo a la Tierra (DTE):** comunicación sin relé, posible
    solo cuando la Tierra está sobre el horizonte con margen.

-   **SPICE / NAIF:** sistema y kernels de JPL para geometría de
    misiones.

-   **LOLA:** altímetro láser de la sonda LRO que produjo los mapas de
    elevación.

-   **DEM:** modelo digital de elevación.

-   **Ventana:** rango de días consecutivos en superficie desde la
    llegada (por ejemplo, 7 días).

-   **ENU:** marco local Este, Norte, Arriba.

-   **LOD:** nivel de detalle; versiones del terreno o textura de
    distinta resolución según la distancia de la cámara.

-   **ILLUSTRATIVE:** etiqueta para trayectorias o animaciones que no
    provienen de datos reales de una misión.

## 16. Prompt inicial sugerido para el agente

Eres el agente de desarrollo del proyecto PolePlanner v2.0, en el
repositorio NSAC_MissionPlanner. Lee completo el documento «PolePlanner v2.0: Especificación del proyecto y contexto
para agente IA». El producto compara planes de misión en paneles 2D y
despliega en 3D solo el plan seleccionado (despegue, trayectoria,
aterrizaje y zoom al sitio). Empieza por la Fase 0 de la sección 10.
Antes de escribir código, confirma conmigo las decisiones abiertas de la
sección 13 que bloqueen la tarea actual. Trabaja una tarea a la vez,
verifica los criterios de aceptación, actualiza PROGRESS.md y avísame
cuando termines cada fase. Prioriza la calidad de la visualización,
marca como ILLUSTRATIVE todo lo que no sea real y nunca presentes datos
sintéticos como reales.
