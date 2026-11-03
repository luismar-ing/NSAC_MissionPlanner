/**
 * Regolith detail for the 3D terrain (visual only): the LOLA meshes carry the real relief down to the DEM's
 * 40 m, and below that the ground was a flat grey. This adds, in the fragment shader, what the eye expects at a
 * few metres: small bowl craters with raised rims and a rolling grain, as bump (normal perturbation) and a slight
 * albedo variation. It is PROCEDURAL, not data (credits: NOT_DATA): it moves no vertex, so the skyline, the
 * shadows (depth map) and every number still come from LOLA.
 *
 * The pattern lives in the site's East / North plane in metres, so it stays fixed on the ground as the Moon turns.
 * Each layer fades out once a pixel covers it (fwidth), so distant ground does not shimmer.
 */
import type * as THREE from "three";
import type { Vec3 } from "./scale";

const M_PER_UNIT = "1.0e6"; // 1 scene unit = 1000 km

const FRAGMENT_LIB = /* glsl */ `
varying vec2 vRegEN;
varying vec3 vRegE;
varying vec3 vRegN;
// integer-exact permutation hash (cells wrap every 289: invisible with the layers at unrelated sizes)
float regPermute(float x) { return mod((x * 34.0 + 1.0) * x, 289.0); }
float regHash(vec2 c) { c = mod(c, 289.0); return regPermute(regPermute(c.x) + c.y) / 289.0; }
// value noise and its gradient (analytic: smooth shading, no 2×2-pixel blocks from screen derivatives)
vec3 regNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  vec2 du = 6.0 * f * (1.0 - f);
  float a = regHash(i);
  float b = regHash(i + vec2(1.0, 0.0));
  float c = regHash(i + vec2(0.0, 1.0));
  float d = regHash(i + vec2(1.0, 1.0));
  float k = a - b - c + d;
  return vec3(a + (b - a) * u.x + (c - a) * u.y + k * u.x * u.y, du * vec2(b - a + k * u.y, c - a + k * u.x));
}
// 1 while a feature of size s (m) spans a few pixels, 0 once a pixel (fw m) covers it
float regFade(float fw, float s) { return 1.0 - smoothstep(0.15, 0.6, fw / s); }
// slope (dh/dE, dh/dN) of simple craters, at most one per cell of s m (35 % of cells): bowl up to ~0.2
// deep/diameter with a raised rim, most of them worn shallower (depth × 0.2–1)
vec2 regCraters(vec2 p, float s, float seed) {
  vec2 c = floor(p / s);
  vec2 g = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 k = c + vec2(float(i), float(j)) + seed;
      if (regHash(k + 17.0) < 0.65) continue;
      vec2 v = p - (k - seed + vec2(regHash(k + 3.0), regHash(k + 7.0))) * s;
      float r = s * (0.12 + 0.28 * regHash(k + 11.0));
      float d = length(v) / r;
      float w = 0.2 + 0.8 * regHash(k + 23.0) * regHash(k + 29.0);
      // h = r (0.48 d² − 0.4) inside, 0.08 r (1 − (d − 1)/0.6)² on the rim
      if (d < 1.0) g += w * 0.96 * v / r;
      else if (d < 1.6) g -= w * (0.16 / 0.6) * (1.0 - (d - 1.0) / 0.6) * v / max(length(v), 1e-4);
    }
  }
  return g;
}
vec2 regSlope(vec2 p, float fw) {
  vec2 g = regCraters(p, 40.0, 0.0) * regFade(fw, 40.0 * 0.25);
  g += regCraters(p, 11.0, 101.0) * regFade(fw, 11.0 * 0.25);
  g += regCraters(p, 3.1, 37.0) * regFade(fw, 3.1 * 0.25);
  // rolling grain: each octave turned by a different angle, so the value-noise grid never lines up
  float s = 7.0;
  for (int o = 0; o < 4; o++) {
    float a = 0.9 + 1.7 * float(o);
    mat2 rot = mat2(cos(a), sin(a), -sin(a), cos(a));
    g += (regNoise(rot * p / s + float(o) * 13.7).yz * rot) * 0.05 * regFade(fw, s); // h = 0.05 s (n − 0.5)
    s *= 0.43;
  }
  return g;
}
float regAlbedo(vec2 p, float fw) {
  float a = 1.0 + 0.16 * (regNoise(p / 90.0).x - 0.5) + 0.10 * (regNoise(p / 13.0 + 5.3).x - 0.5) * regFade(fw, 13.0);
  return a + 0.08 * (regNoise(p / 0.9 + 9.1).x - 0.5) * regFade(fw, 0.9);
}
`;

/** Adds the regolith detail to the terrain material; `east` / `north` are the site's ENU axes (Moon-fixed). */
export function addRegolith(material: THREE.MeshStandardMaterial, east: Vec3, north: Vec3): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRegEast = { value: east };
    shader.uniforms.uRegNorth = { value: north };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uRegEast;\nuniform vec3 uRegNorth;\nvarying vec2 vRegEN;\nvarying vec3 vRegE;\nvarying vec3 vRegN;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>\nvRegEN = vec2(dot(position, uRegEast), dot(position, uRegNorth)) * ${M_PER_UNIT};\nvRegE = normalMatrix * uRegEast;\nvRegN = normalMatrix * uRegNorth;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAGMENT_LIB}`)
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\nfloat regFw = length(fwidth(vRegEN));\nvec2 regG = regSlope(vRegEN, regFw);\ndiffuseColor.rgb *= regAlbedo(vRegEN, regFw);",
      )
      .replace(
        "#include <normal_fragment_maps>",
        // bump: tilt the normal by the slope along the site's East / North, projected on the surface (view space)
        `#include <normal_fragment_maps>
{
  vec3 regTe = normalize(vRegE - dot(vRegE, normal) * normal);
  vec3 regTn = normalize(vRegN - dot(vRegN, normal) * normal);
  normal = normalize(normal - regG.x * regTe - regG.y * regTn);
}`,
      );
  };
  material.customProgramCacheKey = () => "pp-regolith";
}
