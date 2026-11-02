// @vitest-environment jsdom
/** T6.5.b: a sentence in the text field moves the constraint sliders; switched off, the field is gone. */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConstraintControls } from "../src/components/ConstraintControls";
import { appStore, DEFAULT_CONSTRAINTS } from "../src/store/appStore";

beforeEach(() => {
  appStore.getState().setConstraints({ ...DEFAULT_CONSTRAINTS });
  appStore.getState().setNlConstraints(true);
});
afterEach(cleanup);

describe("constraints typed in English (T6.5.b)", () => {
  it("applies the sentence: the sliders switch on and move; what it understood is said", () => {
    render(<ConstraintControls />);
    fireEvent.change(screen.getByLabelText("Describe your constraints"), { target: { value: "at least 85% sunlight and no more than 30 hours of darkness" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(appStore.getState().constraints).toEqual({ minSunPct: 85, maxDarkH: 30, minEarthH: null });
    expect((screen.getByRole("slider", { name: "Minimum sunlight" }) as HTMLInputElement).value).toBe("85");
    expect((screen.getByRole("slider", { name: "Maximum darkness" }) as HTMLInputElement).value).toBe("30");
    expect(screen.getByText(/Applied: sunlight ≥ 85%, darkness ≤ 30 h\./)).toBeTruthy();
  });

  it("reports what the controls cannot express, and leaves them as they were", () => {
    render(<ConstraintControls />);
    fireEvent.change(screen.getByLabelText("Describe your constraints"), { target: { value: "close to water ice" } });
    fireEvent.submit(screen.getByLabelText("Describe your constraints").closest("form")!);
    expect(appStore.getState().constraints).toEqual(DEFAULT_CONSTRAINTS);
    expect(screen.getByText(/Not understood/)).toBeTruthy();
  });

  it("switched off: no text field, the MVP controls only", () => {
    act(() => appStore.getState().setNlConstraints(false));
    render(<ConstraintControls />);
    expect(screen.queryByLabelText("Describe your constraints")).toBeNull();
    expect(screen.getByRole("slider", { name: "Minimum sunlight" })).toBeTruthy();
  });
});
