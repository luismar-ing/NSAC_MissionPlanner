/**
 * Sky overlay of the surface view (TR.3.a, a Stellarium-like reading of the sky): azimuth / elevation grid,
 * cardinal points and labelled Sun and Earth, drawn in SVG over the canvas. Directions are projected with the
 * scene camera every frame (camera-relative render: the camera sits at the origin, so a direction is a point).
 * Colours come from the tokens: the Sun and the Earth look the same as in every 2D view.
 */
import * as THREE from "three";
import { STRINGS } from "../lib/strings";
import { COLORS } from "../styles/tokens";
import type { Vec3 } from "./scale";

const SVG = "http://www.w3.org/2000/svg";
const DEG = Math.PI / 180;
const ALTITUDES = [0, 10, 20, 30, 45, 60];
const MERIDIANS = Array.from({ length: 12 }, (_, i) => i * 30);
const CARDINALS: [number, string][] = [
  [0, "N"],
  [90, "E"],
  [180, "S"],
  [270, "W"],
];

export interface Enu {
  east: Vec3;
  north: Vec3;
  up: Vec3;
}

/** World direction (unit) of azimuth / elevation in degrees, for a site whose ENU axes are given in world. */
export function dirOf(enu: Enu, azDeg: number, elDeg: number): Vec3 {
  const a = azDeg * DEG;
  const e = elDeg * DEG;
  const ce = Math.cos(e);
  return [0, 1, 2].map((k) => enu.east[k] * Math.sin(a) * ce + enu.north[k] * Math.cos(a) * ce + enu.up[k] * Math.sin(e)) as Vec3;
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
}

export function createSkyOverlay(container: HTMLElement) {
  const svg = el("svg", { class: "sky-overlay", "aria-hidden": "true" });
  const grid = el("path", { fill: "none", stroke: COLORS.textMuted, "stroke-opacity": 0.28, "stroke-width": 1 });
  const horizon = el("path", { fill: "none", stroke: COLORS.textMuted, "stroke-opacity": 0.6, "stroke-dasharray": "4 4", "stroke-width": 1 });
  const labels = el("g", { "font-family": "var(--font-mono)", "font-size": 12 });
  svg.append(grid, horizon, labels);
  container.appendChild(svg);
  const v = new THREE.Vector3();
  let width = 1;
  let height = 1;

  /** Screen point (px) of a world direction, or null when it is behind the camera / far off-screen. */
  const project = (camera: THREE.Camera, d: Vec3): [number, number] | null => {
    v.set(d[0], d[1], d[2]).applyMatrix4(camera.matrixWorldInverse);
    if (v.z > -1e-6) return null;
    v.applyMatrix4((camera as THREE.PerspectiveCamera).projectionMatrix);
    if (Math.abs(v.x) > 3 || Math.abs(v.y) > 3) return null;
    return [((v.x + 1) / 2) * width, ((1 - v.y) / 2) * height];
  };

  const polyline = (camera: THREE.Camera, pts: Vec3[]) => {
    let d = "";
    let pen = false;
    for (const p of pts) {
      const s = project(camera, p);
      if (!s) {
        pen = false;
        continue;
      }
      d += `${pen ? "L" : "M"}${s[0].toFixed(1)} ${s[1].toFixed(1)}`;
      pen = true;
    }
    return d;
  };

  const text = (x: number, y: number, s: string, color: string, anchor = "middle") => {
    const t = el("text", { x: x.toFixed(1), y: y.toFixed(1), fill: color, "text-anchor": anchor });
    t.textContent = s;
    labels.appendChild(t);
  };

  return {
    /** Draws the overlay for this frame (call after the scene render, so the camera matrices are current). */
    update(camera: THREE.Camera, enu: Enu, sun: [number, number], earth: [number, number]) {
      svg.style.display = "";
      width = container.clientWidth;
      height = container.clientHeight;
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      let g = "";
      for (const alt of ALTITUDES.slice(1)) g += polyline(camera, Array.from({ length: 181 }, (_, i) => dirOf(enu, i * 2, alt)));
      for (const az of MERIDIANS) g += polyline(camera, Array.from({ length: 46 }, (_, i) => dirOf(enu, az, -4 + i * 2)));
      grid.setAttribute("d", g);
      horizon.setAttribute("d", polyline(camera, Array.from({ length: 361 }, (_, i) => dirOf(enu, i, 0))));
      labels.replaceChildren();
      for (const alt of ALTITUDES.slice(1)) {
        const s = project(camera, dirOf(enu, 0, alt)) ?? project(camera, dirOf(enu, 180, alt));
        if (s) text(s[0] + 4, s[1] - 4, `${alt}°`, COLORS.textMuted, "start");
      }
      for (const [az, name] of CARDINALS) {
        const s = project(camera, dirOf(enu, az, 0));
        if (s) text(s[0], s[1] + 18, name, COLORS.text);
      }
      for (const [azel, color, name] of [
        [sun, COLORS.sun, STRINGS.sky.sun],
        [earth, COLORS.earth, STRINGS.sky.earth],
      ] as const) {
        const s = project(camera, dirOf(enu, azel[0], azel[1]));
        if (!s) continue;
        labels.appendChild(el("circle", { cx: s[0].toFixed(1), cy: s[1].toFixed(1), r: 14, fill: "none", stroke: color, "stroke-width": 1.5 }));
        text(s[0] + 20, s[1] - 6, name, color, "start");
        text(s[0] + 20, s[1] + 10, STRINGS.sky.azel(azel[0], azel[1]), color, "start");
      }
    },
    hide() {
      svg.style.display = "none";
    },
    dispose() {
      svg.remove();
    },
  };
}
