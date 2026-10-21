# PolePlanner

**Compare in 2D, decide, then travel there in 3D.**
PolePlanner is a mission-planning tool for landing sites at the lunar south pole (NASA Space Apps Challenge).

- A **mission plan** is a landing site, an arrival date, a surface window (3, 7 or 14 days) and a trajectory.
- **Search:** set power and communication constraints, and a heat-map calendar lights up the plans that meet them.
- **Compare (2D):** 2 to 5 plans side by side, each with its horizon silhouette, the Sun and Earth, a timeline and metrics.
- **Experience (3D):** the selected plan only: launch, transit, landing and a continuous zoom down to the site.
- **Site:** a 360° horizon panorama and site characteristics. At the south pole the Sun barely grazes the horizon, so terrain decides whether there is light and a direct link to Earth.

> **Status:** early development (Phase 0). Most commands below are not available yet and are marked **TBD**.
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

Everything is precomputed offline; the browser only filters and draws.

| Step | Command | Status |
|---|---|---|
| Create a virtual environment | `python -m venv .venv` | available |
| Install dependencies | `.venv/Scripts/python -m pip install -r pipeline/requirements.txt` (Windows) or `.venv/bin/python -m pip install -r pipeline/requirements.txt` | TBD |
| Download external data | `python -m pipeline.fetch_data` | TBD |
| Build all data | `python -m pipeline.build_all` | TBD |
| Validate data | `python -m pipeline.validate web/public/data` | TBD |
| Run tests | `python -m pytest pipeline/tests -v` | TBD |

## Front end

| Step | Command | Status |
|---|---|---|
| Install | `npm --prefix web ci` | TBD |
| Development server | `npm --prefix web run dev` | TBD |
| Tests | `npm --prefix web test` | TBD |
| Type check | `npm --prefix web run typecheck` | TBD |
| Production build | `npm --prefix web run build` | TBD |

## What is real and what is not

- Sun, Earth and Moon positions and the Moon's orientation come from NASA/JPL SPICE kernels.
- Terrain comes from LRO LOLA elevation data.
- Trajectories are **ILLUSTRATIVE**: simplified curves computed with the real Moon position, not the trajectory of any real mission.
- Any data marked **SYNTHETIC** is generated for development only and is never presented as real.

## Data sources & credits

Exact files, URLs, licenses and checksums are recorded in [`data/README.md`](data/README.md) as they are downloaded.

- **NASA / LRO LOLA:** Lunar Orbiter Laser Altimeter elevation data (PDS Geosciences Node).
- **NAIF / SPICE (NASA JPL):** ephemerides, lunar orientation and leap-second kernels.
- **JPL Horizons:** reference values used to validate Sun and Earth positions.
- **Textures and rocket model:** to be added with their licenses.
