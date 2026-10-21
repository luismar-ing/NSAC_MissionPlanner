import { describe, expect, it } from "vitest";
import { APP_TITLE } from "../src/App";

describe("smoke", () => {
  it("exposes the app title", () => {
    expect(APP_TITLE).toBe("PolePlanner");
  });
});
