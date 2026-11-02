// @vitest-environment jsdom
/** TR.1.c: the ambient pad is silent until a gesture, fades in and out, and remembers the visitor's choice. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AmbientSound, LEVEL, STORAGE_KEY, type AudioContextLike } from "../src/lib/ambient";

/** A fake AudioParam that records its last scheduled target. */
const param = (v = 0) => ({ value: v, target: v, setValueAtTime() {}, cancelScheduledValues() {}, linearRampToValueAtTime(x: number) { this.target = x; }, setTargetAtTime() {} });
const node = () => ({ connect(n: unknown) { return n; } });

function fakeContext() {
  const masters: ReturnType<typeof param>[] = [];
  let oscillators = 0;
  const ctx = {
    currentTime: 0,
    state: "suspended",
    destination: node(),
    resumed: 0,
    suspended: 0,
    async resume() { ctx.resumed++; },
    async suspend() { ctx.suspended++; },
    createGain() { const g = { ...node(), gain: param(1) }; masters.push(g.gain); return g; },
    createOscillator() { oscillators++; return { ...node(), type: "sine", frequency: param(), detune: param(), start() {} }; },
    createBiquadFilter() { return { ...node(), type: "lowpass", frequency: param(), Q: param() }; },
    createDelay() { return { ...node(), delayTime: param() }; },
  };
  return { ctx: ctx as unknown as AudioContextLike & { resumed: number; suspended: number }, master: () => masters[0], oscillators: () => oscillators };
}

beforeEach(() => localStorage.clear());

describe("ambient sound (A7)", () => {
  it("makes no audio context before a gesture, and fades in on the first one", () => {
    const f = fakeContext();
    const make = vi.fn(() => f.ctx);
    const s = new AmbientSound(make);
    expect(make).not.toHaveBeenCalled();
    expect(s.enabled).toBe(true);
    s.startFromGesture();
    expect(make).toHaveBeenCalledTimes(1);
    expect(f.ctx.resumed).toBe(1);
    expect(f.master().target).toBe(LEVEL);
    expect(f.oscillators()).toBeGreaterThan(5);
    s.startFromGesture(); // already playing: one context, one pad
    expect(make).toHaveBeenCalledTimes(1);
  });

  it("the button turns it off with a fade and remembers the choice for the next visit", () => {
    vi.useFakeTimers();
    const f = fakeContext();
    const s = new AmbientSound(() => f.ctx);
    s.startFromGesture();
    (f.ctx as unknown as { state: string }).state = "running"; // the browser let it play
    s.toggle();
    expect(s.enabled).toBe(false);
    expect(s.isPlaying).toBe(false);
    expect(f.master().target).toBe(0);
    vi.runAllTimers();
    expect(f.ctx.suspended).toBe(1);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("off");
    const next = new AmbientSound(() => fakeContext().ctx);
    next.startFromGesture(); // turned off last time: choosing a mode does not start it
    expect(next.isPlaying).toBe(false);
    next.toggle();
    expect(next.isPlaying).toBe(true);
    vi.useRealTimers();
  });

  it("without Web Audio it stays silent and never throws", () => {
    const s = new AmbientSound(() => null);
    expect(() => s.startFromGesture()).not.toThrow();
    expect(s.isPlaying).toBe(false);
  });

  it("first gesture resumes a suspended pad, but a press on the sound button is left to the button", () => {
    const f = fakeContext();
    const s = new AmbientSound(() => f.ctx);
    const listeners: ((e: Event) => void)[] = [];
    const target = { addEventListener: (_: string, l: (e: Event) => void) => listeners.push(l), removeEventListener: () => {} };
    s.autoStart(target as unknown as Window);
    const button = document.createElement("button");
    button.setAttribute("data-sound-toggle", "");
    listeners[0]({ target: button } as unknown as Event);
    expect(f.ctx.resumed).toBe(1); // ignored: the button's click decides
    listeners[0]({ target: document.body } as unknown as Event);
    expect(f.ctx.resumed).toBe(2); // any other first gesture resumes it
  });

  it("the button never mutes a sound the browser has not let play yet: the press starts it instead", () => {
    const f = fakeContext(); // state stays "suspended"
    const s = new AmbientSound(() => f.ctx);
    s.autoStart({ addEventListener() {}, removeEventListener() {} } as unknown as Window);
    s.toggle();
    expect(s.enabled).toBe(true);
    expect(f.ctx.resumed).toBe(2);
    (f.ctx as unknown as { state: string }).state = "running";
    s.toggle(); // now audible: the press mutes
    expect(s.enabled).toBe(false);
  });
});
