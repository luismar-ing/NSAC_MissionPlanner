/**
 * All user-facing text, in English (decision D2). Kept in one module so the UI can be translated later
 * (spec 9) without touching components.
 */
export const STRINGS = {
  appTitle: "PolePlanner",
  appSubtitle: "Lunar south pole landing planner",
  loading: "Loading mission data…",
  loadError: "Could not load the mission data:",
  dataBadge: (status: string, version: string) => `${status} data · ${version}`,
  constraintsTitle: "Mission constraints",
  constraintsPlaceholder: "Set minimum sunlight, maximum darkness and minimum Earth contact.",
  calendarTitle: "Arrival calendar",
  calendarPlaceholder: (sites: number, days: number) => `${days} arrival days × ${sites} sites`,
  calendarModeLabel: "Colour by",
  calendarModes: { combined: "Combined score", energy: "Energy", comms: "Comms" },
  windowLabel: "Surface window",
  windowDays: (d: number) => `${d} days`,
  legendLabel: "Colour scale",
  metricNames: {
    score: "Score (0–1)",
    sun_pct: "Sunlight (%)",
    earth_h_mean: "Earth contact (h/day, mean)",
    earth_h_min: "Earth contact (h/day, min)",
    longest_dark_h: "Longest dark (h)",
    longest_comm_gap_h: "Longest comm gap (h)",
  },
  calendarAria: (L: number) => `Arrival calendar heatmap, ${L}-day windows: one row per site, one column per arrival day`,
  arrival: "Arrival",
  fmt: {
    sun: (v: number) => `Sunlight ${v.toFixed(1)} %`,
    dark: (v: number) => `Longest dark ${v.toFixed(1)} h`,
    earth: (min: number, mean: number) => `Earth ${mean.toFixed(1)} h/day (min ${min.toFixed(1)})`,
    score: (v: number) => `Score ${v.toFixed(2)}`,
  },
  trayTitle: "Comparison tray",
  trayEmpty: "Pin 2 to 5 plans from the calendar to compare them side by side.",
  footerCredits:
    "Data: NASA LRO LOLA (Barker et al. 2023), NAIF/SPICE (NASA JPL), validated against JPL Horizons; regions: USGS. Trajectories are ILLUSTRATIVE.",
} as const;
