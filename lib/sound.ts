"use client";

// Tiny WebAudio chirps — no assets, no network. Kid products run on sound (Duolingo);
// ours stays polite: soft volume, short, and silently skipped when the browser blocks
// audio (the context unlocks on the first tap, which is where playTap lives anyway).

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

function blip(freq: number, at: number, dur: number, type: OscillatorType, gain: number) {
  const c = context();
  if (!c || c.state !== "running") return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + at);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + at);
  o.stop(c.currentTime + at + dur + 0.05);
}

/** Soft click for chip taps and sends. Call ONLY from a user gesture. */
export function playTap() {
  blip(660, 0, 0.09, "triangle", 0.1);
  blip(990, 0.045, 0.07, "triangle", 0.07);
}

/** Rising ta-da for a finished build. */
export function playFanfare() {
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((f, i) => blip(f, i * 0.09, 0.22, "triangle", 0.1));
  blip(1318.5, 0.4, 0.3, "sine", 0.06); // sparkle on top
}
