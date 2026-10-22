# PolePlanner

**Compare in 2D, decide, then travel there in 3D.**
PolePlanner is a mission-planning tool for landing sites at the lunar south pole (NASA Space Apps Challenge).

- A **mission plan** is a landing site, an arrival date, a surface window (3, 7 or 14 days) and a trajectory.
- **Search:** set power and communication constraints, and a heat-map calendar lights up the plans that meet them.
- **Compare (2D):** 2 to 5 plans side by side, each with its horizon silhouette, the Sun and Earth, a timeline and metrics.
- **Experience (3D):** the selected plan only: launch, transit, landing and a continuous zoom down to the site.
- **Site:** a 360° horizon panorama and site characteristics. At the south pole the Sun barely grazes the horizon, so terrain decides whether there is light and a direct link to Earth.

> **Status:** in development. Science, data, the 2D comparison and the 3D journey are done (phases 0–4); integration and polish (phase 5) is in progress.
> The full specification (in Spanish) is in [`docs/SPEC.md`](docs/SPEC.md).

## Repository layout

```
├─ README.md
├─ CLAUDE.md                 # working rules for the development agent
├─ PROGRESS.md               # development log
├─ .claude/commands/         # agent commands (/siguiente)
├─ data/                     # DEM, SPICE kernels and textures (not versioned) + README.md
├─ pipeline/                 # offline Python pipeline → web/public/data
│  └─ tests/
├─ web/                      # React + TypeScript front end (Vite)
│  ├─ public/data/           # pipeline output
│  ├─ src/                   # store/ views/ components/ lib/ styles/ scene3d/ panels2d/
│  └─ tests/
└─ docs/                     # SPEC, development guide, decisions, validation
```

## Requirements

- Python 3.11 or newer
- Node.js (developed with Node 24) and npm
- Git

## Pipeline

Run every command from the repository root.

Everything is precomputed offline; the browser only filters and draws.

| Step | Command | Status |
|---|---|---|
| Create a virtual environment | `python -m venv .venv` | available |
| Install dependencies | `.venv/Scripts/python -m pip install -r pipeline/requirements.txt` (Windows) or `.venv/bin/python -m pip install -r pipeline/requirements.txt` | available |
| Download external data | `python -m pipeline.fetch_data` | available |
| Build all data | `python -m pipeline.build_all` | available |
| Validate data | `python -m pipeline.validate web/public/data` | available |
| Run tests | `.venv/Scripts/python -m pytest` (configured in `pyproject.toml`) | available |

## Front end

| Step | Command | Status |
|---|---|---|
| Install | `npm --prefix web ci` | available |
| Development server | `npm --prefix web run dev` | available |
| Tests | `npm --prefix web test` | available |
| Type check | `npm --prefix web run typecheck` | available |
| Production build | `npm --prefix web run build` | available |

## What is real and what is not

- Sun, Earth and Moon positions and the Moon's orientation come from NASA/JPL SPICE kernels.
- Terrain comes from LRO LOLA elevation data.
- Trajectories are **ILLUSTRATIVE**: simplified curves computed with the real Moon position, not the trajectory of any real mission. Launch from a generic pad, 200 km parking orbit, a smooth transfer arc to the Moon and a descent that reaches the site exactly at the arrival time (`pipeline/trajectory.py`). In the app the trail is dashed and labelled: *“ILLUSTRATIVE trajectory — simplified, computed with the real Moon position; not a real mission trajectory.”*
- Any data marked **SYNTHETIC** is generated for development only and is never presented as real.

## Data sources & credits

The same list is in the app (footer → **About & credits**). Exact files, sizes, checksums and download dates are in [`data/README.md`](data/README.md); the validation is in [`docs/validation.md`](docs/validation.md).

| Used for | Source | Files and links | Licence |
|---|---|---|---|
| Terrain: south polar elevation model (horizon masks, slopes, 3D terrain) | NASA GSFC Planetary Geodynamics Data Archive (PGDA), LRO LOLA. Cite: Barker, M. K. et al. 2023, *Planetary Science Journal* 4, 183, doi:10.3847/PSJ/acf3e1 | `LDEM_80S_40MPP_ADJ.TIF` (40 m/pixel, 80°S–90°S): https://pgda.gsfc.nasa.gov/products/90 · https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_40MPP_ADJ.TIF | NASA data; cite Barker et al. 2023 |
| Sun, Earth and Moon positions, lunar orientation, time scales | NAIF / SPICE, NASA JPL (generic kernels) | `de440s.bsp`: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440s.bsp · `naif0012.tls`: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls · `pck00011.tpc`: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc · `moon_pa_de440_200625.bpc`: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/moon_pa_de440_200625.bpc · `moon_de440_250416.tf`: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_de440_250416.tf | NASA/JPL public data |
| Validation of every Sun and Earth position and of the Moon's phase | JPL Horizons, NASA JPL | https://ssd.jpl.nasa.gov/horizons/ (reference answers in `pipeline/tests/reference/`) | NASA/JPL public service |
| Candidate landing regions | USGS. Cite: McClernan, M. T., 2024, *Down Selected Artemis III Candidate Landing Site Navigational Grids* and *LGRS Artemis III Candidate Landing Site Navigational Grids in ACC Format*, USGS data releases | `A3_9regions-lonlat-simplified.zip`: https://doi.org/10.5066/P1MEQ6UK · `Connecting_Ridge.zip`: https://doi.org/10.5066/P13FD9ZD | USGS public data (use constraints: none) |
| Named features near each site | IAU / USGS Gazetteer of Planetary Nomenclature | https://planetarynames.wr.usgs.gov/SearchResults?Target=16_Moon | USGS/IAU public data |
| Moon texture (3D view, visual only) | NASA's Scientific Visualization Studio, CGI Moon Kit (LRO LROC color) | `lroc_color_poles_4k.tif`: https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_4k.tif | Public domain (NASA SVS) |
| Earth texture (3D view) | NASA/GSFC Scientific Visualization Studio; Blue Marble Next Generation data courtesy of Reto Stockli (NASA/GSFC) and NASA's Earth Observatory | `flat_earth_Largest_still.0330.jpg`: https://svs.gsfc.nasa.gov/vis/a000000/a003600/a003615/flat_earth_Largest_still.0330.jpg | Public domain (NASA SVS) |

**Not real data:** trajectories and the launch are ILLUSTRATIVE (see above). The rocket is PolePlanner's own procedural model, with no external asset.

**Software:** web app: React and React DOM 19.3.1, three.js 0.186.1, Zustand 5.0.15 and Zod 4.6.7 (all MIT); Geist and Geist Mono fonts 5.3.0 (SIL Open Font License 1.1). Pipeline: SpiceyPy 8.3.0 (MIT), NumPy 2.5.4 (BSD-3-Clause), rasterio 1.5.2 (BSD-3-Clause), pyproj 3.8.0 (MIT), pandas 3.0.6 (BSD-3-Clause), pydantic 2.14.1 (MIT), Matplotlib 3.11.2 (PSF-based) and Pillow 13.0.0 (MIT-CMU).
