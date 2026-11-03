/** Regolith detail (visual only): the shader hook must find its anchors in three.js's standard material. */
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { addRegolith } from "../src/scene3d/regolith";

describe("regolith detail on the terrain material", () => {
  it("injects into the standard shader without moving any vertex", () => {
    const m = new THREE.MeshStandardMaterial();
    addRegolith(m, [1, 0, 0], [0, 1, 0]);
    const lib = THREE.ShaderLib.standard;
    const shader = { uniforms: {}, vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader } as unknown as THREE.WebGLProgramParametersWithUniforms;
    m.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    // every anchor replaced (a three.js upgrade that renames one would silently drop the detail)
    expect(shader.vertexShader).toContain("vRegEN = vec2(dot(position, uRegEast)");
    expect(shader.fragmentShader).toContain("vec2 regG = regSlope(");
    expect(shader.fragmentShader).toContain("normal = normalize(normal - regG.x");
    // positions are untouched: the skyline and shadows stay LOLA's
    expect(shader.vertexShader).not.toMatch(/transformed\s*[+*-]?=/);
    expect(m.customProgramCacheKey()).toBe("pp-regolith");
  });
});
