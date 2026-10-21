/**
 * Parity test: the zod schemas accept and reject exactly the same shared fixtures
 * as pipeline/contract.py (pipeline/tests/test_contract.py).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { kindForPath, parseInstant, SCHEMAS } from "../src/lib/contract";

const FIXTURES = join(__dirname, "..", "..", "pipeline", "tests", "fixtures", "contract");

function jsonFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return jsonFiles(p);
    return name.endsWith(".json") ? [p] : [];
  });
}

const rel = (root: string, p: string) => relative(root, p).split("\\").join("/");
const load = (p: string): unknown => JSON.parse(readFileSync(p, "utf-8"));
const VALID = join(FIXTURES, "valid");
const INVALID = join(FIXTURES, "invalid");

describe("contract parity with pipeline/contract.py", () => {
  const valid = jsonFiles(VALID).map((p) => rel(VALID, p)).sort();
  const invalid = jsonFiles(INVALID).map((p) => rel(INVALID, p)).sort();

  it("finds the shared fixtures", () => {
    expect(valid.length).toBeGreaterThan(20);
    expect(new Set(invalid.map((f) => f.split("__")[0]))).toEqual(new Set(Object.keys(SCHEMAS)));
  });

  it.each(valid)("accepts valid/%s", (file) => {
    const result = SCHEMAS[kindForPath(file)].safeParse(load(join(VALID, file)));
    expect(result.error?.issues ?? []).toEqual([]);
  });

  it.each(invalid)("rejects invalid/%s", (file) => {
    const result = SCHEMAS[kindForPath(file)].safeParse(load(join(INVALID, file)));
    expect(result.success).toBe(false);
    console.log(`${file}: ${result.error?.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  });
});

describe("time helpers", () => {
  it("parses valid instants and rejects impossible ones", () => {
    expect(parseInstant("2027-01-01T00:00:00Z")).toBe(Date.UTC(2027, 0, 1));
    expect(parseInstant("2027-02-30T00:00:00Z")).toBeNaN();
    expect(parseInstant("2027-01-01T00:00:00")).toBeNaN();
  });
});
