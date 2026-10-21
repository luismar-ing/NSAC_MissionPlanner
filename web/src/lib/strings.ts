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
  constraints: {
    sun: "Minimum sunlight",
    sunHint: "Share of the window with the Sun's upper limb above the terrain.",
    dark: "Maximum darkness",
    darkHint: "Longest continuous stretch without Sun in the window.",
    earth: "Minimum Earth contact",
    earthHint: "Worst day: hours with Earth above terrain + 0.5° antenna margin.",
    off: "off",
    count: (valid: number, total: number, L: number) => `${valid} of ${total} ${L}-day plans meet the constraints`,
  },
  pin: {
    selected: "Pin selected plan",
    count: (n: number, max: number) => `${n}/${max} pinned`,
    rangeSummary: (days: number, sites: number, valid: number) =>
      `Range: ${days} arrival day${days === 1 ? "" : "s"} × ${sites} site${sites === 1 ? "" : "s"} (${valid} valid)`,
    best: (n: number) => `Pin best ${n}`,
    clearRange: "Clear range",
    help: "Click a cell to select it · double-click or press Enter to pin · drag to select a range · arrow keys move the selection",
  },
  panel: {
    aria: (site: string, date: string, L: number) => `Plan: ${site}, arrival ${date}, ${L}-day window`,
    illustrativeTitle: "The trajectory of this plan is ILLUSTRATIVE: simplified, computed with the real Moon position; not a real mission trajectory.",
    unpin: (site: string) => `Remove ${site} from the comparison`,
    pinOneMore: "Pin at least one more plan to compare.",
  },
  trayTitle: "Comparison tray",
  trayEmpty: "Pin 2 to 5 plans from the calendar to compare them side by side.",
  footerCredits:
    "Data: NASA LRO LOLA (Barker et al. 2023), NAIF/SPICE (NASA JPL), validated against JPL Horizons; regions: USGS. Trajectories are ILLUSTRATIVE.",
} as const;
