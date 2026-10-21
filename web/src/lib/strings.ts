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
  trayTitle: "Comparison tray",
  trayEmpty: "Pin 2 to 5 plans from the calendar to compare them side by side.",
  footerCredits:
    "Data: NASA LRO LOLA (Barker et al. 2023), NAIF/SPICE (NASA JPL), validated against JPL Horizons; regions: USGS. Trajectories are ILLUSTRATIVE.",
} as const;
