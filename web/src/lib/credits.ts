/**
 * Every external source, with its citation, link and license (rule 12, T5.3.b). The single list behind the
 * "About & credits" screen; the README carries the same entries. Copied from data/README.md (files, URLs and
 * licences checked when they were downloaded) and from the installed packages' own licence fields.
 * A test checks that every URL in data/README.md appears here and in the README.
 */
export interface CreditSource {
  what: string; // what PolePlanner uses it for
  source: string; // who publishes it
  citation?: string;
  items?: string[]; // exact files
  urls: string[];
  license: string;
}

export const DATA_CREDITS: CreditSource[] = [
  {
    what: "Terrain: south polar elevation model (horizon masks, slopes, 3D terrain)",
    source: "NASA GSFC Planetary Geodynamics Data Archive (PGDA), LRO Lunar Orbiter Laser Altimeter (LOLA)",
    citation: "Barker, M. K. et al. 2023, Planetary Science Journal 4, 183, doi:10.3847/PSJ/acf3e1",
    items: ["LDEM_80S_40MPP_ADJ.TIF (40 m/pixel, 80°S–90°S)"],
    urls: ["https://pgda.gsfc.nasa.gov/products/90", "https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_40MPP_ADJ.TIF"],
    license: "NASA data; cite Barker et al. 2023 (PGDA data usage policy)",
  },
  {
    what: "Sun, Earth and Moon positions, lunar orientation, time scales",
    source: "NAIF / SPICE, NASA Jet Propulsion Laboratory (generic kernels)",
    items: ["de440s.bsp (DE440 planetary ephemeris)", "naif0012.tls (leap seconds)", "pck00011.tpc (constants)", "moon_pa_de440_200625.bpc (lunar orientation)", "moon_de440_250416.tf (lunar frames MOON_ME / MOON_PA)"],
    urls: [
      "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440s.bsp",
      "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls",
      "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc",
      "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/moon_pa_de440_200625.bpc",
      "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_de440_250416.tf",
    ],
    license: "NASA/JPL public data (NAIF generic kernels)",
  },
  {
    what: "Validation of every Sun and Earth position and of the Moon's phase",
    source: "JPL Horizons ephemeris service, NASA Jet Propulsion Laboratory",
    urls: ["https://ssd.jpl.nasa.gov/horizons/"],
    license: "NASA/JPL public service; reference answers kept in the repository (docs/validation.md)",
  },
  {
    what: "Candidate landing regions (site selection)",
    source: "U.S. Geological Survey: Artemis III candidate landing site data releases",
    citation: "McClernan, M. T., 2024, Down Selected Artemis III Candidate Landing Site Navigational Grids, and LGRS Artemis III Candidate Landing Site Navigational Grids in ACC Format, USGS data releases",
    items: ["A3_9regions-lonlat-simplified.zip", "Connecting_Ridge.zip"],
    urls: ["https://doi.org/10.5066/P1MEQ6UK", "https://doi.org/10.5066/P13FD9ZD"],
    license: "USGS public data (use constraints: none)",
  },
  {
    what: "Named features near each site",
    source: "IAU / USGS Gazetteer of Planetary Nomenclature",
    urls: ["https://planetarynames.wr.usgs.gov/SearchResults?Target=16_Moon"],
    license: "USGS/IAU public data; each feature cites its Feature ID",
  },
  {
    what: "Moon texture of the 3D view (visual only; the science uses LOLA)",
    source: "NASA's Scientific Visualization Studio, CGI Moon Kit (LRO LROC color, 2019 version with poles)",
    items: ["lroc_color_poles_4k.tif"],
    urls: ["https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_4k.tif"],
    license: "Public domain (NASA SVS). “Optimized for aesthetics, not science.”",
  },
  {
    what: "Earth texture of the 3D view",
    source: "NASA/Goddard Space Flight Center Scientific Visualization Studio; Blue Marble Next Generation data courtesy of Reto Stockli (NASA/GSFC) and NASA's Earth Observatory",
    items: ["flat_earth_Largest_still.0330.jpg"],
    urls: ["https://svs.gsfc.nasa.gov/vis/a000000/a003600/a003615/flat_earth_Largest_still.0330.jpg"],
    license: "Public domain (NASA SVS)",
  },
];

/** What is not real data (rules 1 and 2), stated next to the credits. */
export const NOT_DATA = [
  "Trajectories and the launch are ILLUSTRATIVE: simplified curves computed with the real Moon position, from a generic launch pad; not the trajectory of any real mission.",
  "The rocket is PolePlanner's own procedural model (no external asset).",
  "In the 3D view the Earth and the Moon are drawn 6× larger so they stay visible; distances, directions and the Sun are exact, and the final zoom switches to real scale.",
];

export interface SoftwareCredit {
  name: string;
  version: string;
  license: string;
}

/** Licences as declared by each installed package (package.json / Python package metadata). */
export const SOFTWARE_CREDITS: { app: SoftwareCredit[]; pipeline: SoftwareCredit[] } = {
  app: [
    { name: "React / React DOM", version: "19.3.1", license: "MIT" },
    { name: "three.js", version: "0.186.1", license: "MIT" },
    { name: "Zustand", version: "5.0.15", license: "MIT" },
    { name: "Zod", version: "4.6.7", license: "MIT" },
    { name: "Geist and Geist Mono fonts (Fontsource)", version: "5.3.0", license: "SIL Open Font License 1.1" },
  ],
  pipeline: [
    { name: "SpiceyPy (NAIF SPICE toolkit)", version: "8.3.0", license: "MIT" },
    { name: "NumPy", version: "2.5.4", license: "BSD-3-Clause" },
    { name: "rasterio", version: "1.5.2", license: "BSD-3-Clause" },
    { name: "pyproj", version: "3.8.0", license: "MIT" },
    { name: "pandas", version: "3.0.6", license: "BSD-3-Clause" },
    { name: "pydantic", version: "2.14.1", license: "MIT" },
    { name: "Matplotlib", version: "3.11.2", license: "Matplotlib license (PSF-based)" },
    { name: "Pillow", version: "13.0.0", license: "MIT-CMU" },
  ],
};
