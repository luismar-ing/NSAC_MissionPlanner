/**
 * Ambient music (decision A7, TR.1.c): a warm, slowly breathing pad synthesised in the browser with Web Audio.
 * No audio files, so nothing to license or download. Browsers only allow sound after a user gesture, so it
 * starts from a click (choosing a mode, or the sound button); the visitor's on/off choice is remembered.
 */

/** The voices of the pad: a low open D chord (D2, A2, F#3, E4, A4), each detuned in a pair for warmth. */
export const PAD_HZ = [73.42, 110, 185, 329.63, 440] as const;
const VOICE_GAIN = [0.32, 0.26, 0.2, 0.12, 0.07];
export const LEVEL = 0.16; // master level when playing (quiet background)
export const FADE_IN_S = 4;
export const FADE_OUT_S = 1.2;
export const STORAGE_KEY = "poleplanner.sound";

/** The subset of the Web Audio API the pad uses (lets tests pass a fake context). */
export type AudioContextLike = Pick<BaseAudioContext, "currentTime" | "destination" | "state" | "createOscillator" | "createGain" | "createBiquadFilter" | "createDelay"> & {
  resume(): Promise<void>;
  suspend(): Promise<void>;
};

type Listener = () => void;

function readPref(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true; // storage blocked: sound is on, the choice is just not remembered
  }
}
function writePref(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    /* storage blocked: the choice lasts for this visit only */
  }
}

export class AmbientSound {
  private ctx: AudioContextLike | null = null;
  private master: GainNode | null = null;
  private playing = false;
  private wanted: boolean;
  private listeners = new Set<Listener>();

  constructor(private readonly makeContext: () => AudioContextLike | null = defaultContext) {
    this.wanted = readPref();
  }

  /** True while the visitor wants sound (the button state); it may still be silent until the first gesture. */
  get enabled(): boolean {
    return this.wanted;
  }
  get isPlaying(): boolean {
    return this.playing;
  }

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  /** Call from a click handler: starts the pad if the visitor has not turned sound off. */
  startFromGesture(): void {
    if (this.wanted) this.play();
  }

  /**
   * Page load: sound is on by default. Browsers let audio start without a gesture only on sites the visitor
   * already interacted with, so this tries now and, failing that, starts on the first click or key press
   * anywhere on the page (the sound button handles its own click: see toggle).
   */
  autoStart(target: Pick<Window, "addEventListener" | "removeEventListener"> = window): void {
    if (this.wanted) this.play();
    const events = ["pointerdown", "keydown"] as const;
    const first = (e: Event) => {
      if ((e.target as Element | null)?.closest?.("[data-sound-toggle]")) return;
      for (const ev of events) target.removeEventListener(ev, first, true);
      this.startFromGesture();
    };
    for (const ev of events) target.addEventListener(ev, first, true);
  }

  /** Playing and actually audible (the browser has let the audio context run). */
  private get audible(): boolean {
    return this.playing && this.ctx?.state === "running";
  }

  /** The sound button: turns sound on (and starts it, this is a gesture) or off; the choice is remembered.
   *  While sound is on but still held back by the browser, pressing it starts the sound instead of muting. */
  toggle(): void {
    if (this.wanted && !this.audible) {
      this.play();
      return;
    }
    this.wanted = !this.wanted;
    writePref(this.wanted);
    if (this.wanted) this.play();
    else this.stop();
    this.emit();
  }

  private emit() {
    for (const l of this.listeners) l();
  }

  private play() {
    if (this.playing) {
      void this.ctx?.resume(); // started before any gesture: the browser may have kept it suspended
      return;
    }
    if (!this.ctx) {
      this.ctx = this.makeContext();
      if (!this.ctx) return; // no Web Audio: stay silent
      this.master = buildPad(this.ctx);
    }
    const { ctx, master } = this;
    if (!master) return;
    void ctx.resume();
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(LEVEL, t + FADE_IN_S);
    this.playing = true;
    this.emit();
  }

  private stop() {
    if (!this.playing || !this.ctx || !this.master) return;
    const { ctx, master } = this;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + FADE_OUT_S);
    this.playing = false;
    // suspend after the fade so a muted page uses no audio CPU
    setTimeout(() => !this.playing && void ctx.suspend(), FADE_OUT_S * 1000 + 100);
    this.emit();
  }
}

function defaultContext(): AudioContextLike | null {
  const Ctor = typeof window !== "undefined" ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined;
  return Ctor ? new Ctor() : null;
}

/**
 * Voices → low-pass filter whose cutoff breathes slowly (an LFO) → a soft echo → master (starts silent).
 * Each voice also swells on its own slow LFO, so the chord keeps moving without ever repeating exactly.
 */
function buildPad(ctx: AudioContextLike): GainNode {
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 700;
  filter.Q.value = 0.7;
  const cutoffLfo = ctx.createOscillator();
  cutoffLfo.frequency.value = 0.03;
  const cutoffDepth = ctx.createGain();
  cutoffDepth.gain.value = 350;
  cutoffLfo.connect(cutoffDepth).connect(filter.frequency);
  cutoffLfo.start();

  // echo: a long delay fed back at low gain, mixed under the dry sound
  const delay = ctx.createDelay(2);
  delay.delayTime.value = 0.9;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.35;
  const wet = ctx.createGain();
  wet.gain.value = 0.3;
  filter.connect(master);
  filter.connect(delay);
  delay.connect(feedback).connect(delay);
  delay.connect(wet).connect(master);

  PAD_HZ.forEach((hz, i) => {
    const voice = ctx.createGain();
    voice.gain.value = VOICE_GAIN[i] * 0.6;
    const swell = ctx.createOscillator();
    swell.frequency.value = 0.05 + i * 0.013; // different slow rates: the chord never repeats exactly
    const swellDepth = ctx.createGain();
    swellDepth.gain.value = VOICE_GAIN[i] * 0.4;
    swell.connect(swellDepth).connect(voice.gain);
    swell.start();
    for (const cents of [-6, 6]) {
      const osc = ctx.createOscillator();
      osc.type = i < 2 ? "sine" : "triangle";
      osc.frequency.value = hz;
      osc.detune.value = cents;
      osc.connect(voice);
      osc.start();
    }
    voice.connect(filter);
  });
  return master;
}

/** The app's one pad. */
export const ambient = new AmbientSound();
