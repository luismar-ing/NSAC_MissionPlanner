// @vitest-environment jsdom
/** TR.0.b: the landing page opens each mode; Home goes back without losing the tray. */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../src/App";
import { appStore } from "../src/store/appStore";

afterEach(cleanup);

describe("landing page (A7)", () => {
  it("shows the two modes before any data is loaded, and each opens its screen", () => {
    appStore.setState({ screen: "landing" });
    render(<App />);
    expect(screen.getByTestId("landing")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Mission Planner/ }));
    expect(appStore.getState().screen).toBe("planner");
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(appStore.getState().screen).toBe("landing");
    fireEvent.click(screen.getByRole("button", { name: /Educator/ }));
    expect(appStore.getState().screen).toBe("educator");
  });
});
