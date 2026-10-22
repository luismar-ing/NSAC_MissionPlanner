/**
 * Global state shared by every view (spec 8): plans, comparison tray, selection, constraints,
 * mission phase and the two clocks. Built with zustand's vanilla store so it is testable without React;
 * components read it through the `useApp` hook.
 */
import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import type { CellRange } from "../lib/calendar";
import { buildWindowIndex, type WindowIndex } from "../lib/constraints";
import type { Manifest, Plan, Site } from "../lib/contract";
import { DataStore } from "../lib/data";

export const MAX_COMPARE = 5; // spec 4.1, 8.5
export type MissionPhase = "overview" | "launch" | "transit" | "landing" | "site";
export const MISSION_PHASES: readonly MissionPhase[] = ["overview", "launch", "transit", "landing", "site"];
/** Screen mode (spec 8.0): compare (2D) or live (the selected plan in 3D). */
export type ViewMode = "compare" | "live";

/** Spec 5.6 constraints; null = control disabled (not evaluated). */
export interface Constraints {
  minSunPct: number | null; // X: sun_pct ≥ X
  maxDarkH: number | null; // Y: longest_dark_h ≤ Y
  minEarthH: number | null; // Z: earth_h_per_day_min ≥ Z
}

export type LoadStatus = { status: "idle" | "loading" | "ready" } | { status: "error"; message: string };

export interface AppState {
  data: DataStore;
  load: LoadStatus;
  manifest: Manifest | null;
  sites: Site[];
  plans: Plan[];
  plansById: Map<string, Plan>;

  comparePlans: string[]; // plan ids pinned to the tray, in pin order (≤ MAX_COMPARE)
  selectedPlanId: string | null;
  selectedSite: string | null;
  selectedWindow: 3 | 7 | 14 | number; // window length L shown in the calendar
  constraints: Constraints;
  viewMode: ViewMode;
  setViewMode(mode: ViewMode): void;
  missionPhase: MissionPhase;
  missionTime: number | null; // absolute instant (epoch ms, UTC) of the selected plan's mission clock
  compareTime: number; // relative clock shared by the 2D panels: hours since arrival
  exaggeration: number | null; // vertical exaggeration of the 2D silhouettes; null = fit the shared range
  setExaggeration(x: number | null): void;
  notice: string | null; // last user-facing message (e.g. tray full)
  windowIndex: Partial<Record<number, WindowIndex>>; // per window length L, built on demand
  validCount: { valid: number; total: number } | null; // cells meeting the constraints for the current L
  selectedRange: CellRange | null; // calendar drag selection (spec 8.5), in calendar cell coordinates
  setRange(r: CellRange | null): void;
  setValidCount(v: { valid: number; total: number } | null): void;

  loadCore(): Promise<void>;
  loadWindows(days: number): Promise<WindowIndex>;
  selectPlan(id: string | null): void;
  selectSite(siteId: string | null): void;
  setWindow(days: number): void;
  pinPlan(id: string): boolean;
  unpinPlan(id: string): void;
  setConstraints(patch: Partial<Constraints>): void;
  setMissionPhase(phase: MissionPhase): void;
  setMissionTime(ms: number | null): void;
  setCompareTime(hours: number): void;
  clearNotice(): void;
}

export const DEFAULT_CONSTRAINTS: Constraints = { minSunPct: null, maxDarkH: null, minEarthH: null };

export function createAppStore(data: DataStore = DataStore.forPage()) {
  return createStore<AppState>()((set, get) => ({
    data,
    load: { status: "idle" },
    manifest: null,
    sites: [],
    plans: [],
    plansById: new Map(),
    comparePlans: [],
    selectedPlanId: null,
    selectedSite: null,
    selectedWindow: 7,
    constraints: { ...DEFAULT_CONSTRAINTS },
    viewMode: "compare",
    setViewMode(mode) {
      // live mode needs a selected plan (spec 8.0: the selected panel expands to the 3D scene)
      if (mode === "live" && !get().selectedPlanId) return set({ notice: "Select a plan to open the 3D view." });
      set({ viewMode: mode });
    },
    missionPhase: "overview",
    missionTime: null,
    compareTime: 0,
    exaggeration: null,
    setExaggeration(x) {
      set({ exaggeration: x });
    },
    notice: null,
    windowIndex: {},
    validCount: null,
    selectedRange: null,
    setRange(r) {
      set({ selectedRange: r });
    },
    setValidCount(v) {
      set({ validCount: v });
    },

    async loadWindows(days) {
      const cached = get().windowIndex[days];
      if (cached) return cached;
      const { data, sites } = get();
      const ids = sites.map((s) => s.id);
      const all = await Promise.all(ids.map((id) => data.windows(id, days)));
      const index = buildWindowIndex(days, Object.fromEntries(ids.map((id, i) => [id, all[i].rows])), ids);
      set({ windowIndex: { ...get().windowIndex, [days]: index } });
      return index;
    },

    async loadCore() {
      if (get().load.status === "loading" || get().load.status === "ready") return; // one load per store
      set({ load: { status: "loading" } });
      try {
        const core = await get().data.loadCore();
        set({
          load: { status: "ready" },
          manifest: core.manifest,
          sites: core.sites,
          plans: core.plans,
          plansById: new Map(core.plans.map((p) => [p.id, p])),
        });
      } catch (e) {
        set({ load: { status: "error", message: (e as Error).message } });
      }
    },

    selectPlan(id) {
      if (id === null) return set({ selectedPlanId: null, missionTime: null, missionPhase: "overview" });
      const plan = get().plansById.get(id);
      if (!plan) return set({ notice: `Unknown plan ${id}` });
      set({
        selectedPlanId: id,
        selectedSite: plan.site_id,
        selectedWindow: plan.window_days,
        missionTime: Date.parse(plan.arrival_utc),
        missionPhase: "overview",
      });
    },

    selectSite(siteId) {
      set({ selectedSite: siteId });
    },

    setWindow(days) {
      const allowed = get().manifest?.params.window_days ?? [3, 7, 14];
      if (!allowed.includes(days)) return set({ notice: `Window must be one of ${allowed.join(", ")} days` });
      const sel = get().selectedPlanId ? get().plansById.get(get().selectedPlanId as string) : undefined;
      // keep the same site and arrival selected when switching L
      const selectedPlanId = sel ? sel.id.replace(/_\d+d$/, `_${days}d`) : null;
      set({ selectedWindow: days, selectedPlanId: selectedPlanId && get().plansById.has(selectedPlanId) ? selectedPlanId : null });
    },

    pinPlan(id) {
      const { comparePlans, plansById } = get();
      if (!plansById.has(id)) {
        set({ notice: `Unknown plan ${id}` });
        return false;
      }
      if (comparePlans.includes(id)) return true;
      if (comparePlans.length >= MAX_COMPARE) {
        set({ notice: `The comparison tray holds at most ${MAX_COMPARE} plans. Remove one first.` });
        return false;
      }
      set({ comparePlans: [...comparePlans, id], notice: null });
      return true;
    },

    unpinPlan(id) {
      set({ comparePlans: get().comparePlans.filter((p) => p !== id) });
    },

    setConstraints(patch) {
      set({ constraints: { ...get().constraints, ...patch } });
    },

    setMissionPhase(phase) {
      set({ missionPhase: phase });
    },

    setMissionTime(ms) {
      set({ missionTime: ms });
    },

    setCompareTime(hours) {
      // Clamp to the longest window (spec 8.1: day and hour since arrival)
      const maxH = 24 * Math.max(...(get().manifest?.params.window_days ?? [14]));
      set({ compareTime: Math.min(Math.max(hours, 0), maxH) });
    },

    clearNotice() {
      set({ notice: null });
    },
  }));
}

/** The single application store (one DataStore, one cache). */
export const appStore = createAppStore();

export function useApp<T>(selector: (s: AppState) => T): T {
  return useStore(appStore, selector);
}
