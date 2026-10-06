"use client";

// Sparky's read-aloud (ADR 0006). Web Speech `SpeechSynthesis` — native, on-device, $0,
// no vendor, no API key (voice is independent of the agent loop).
//
// Three hard guarantees the callers depend on (see AvatarChat):
//   1. EXACTLY ONCE per bubble — a given message id is spoken once, ever, in this tab.
//      Dedup lives at the MODULE level (`spokenIds`), so it survives React StrictMode's
//      mount→unmount→remount, effect double-invokes, and project-switch remounts that
//      reset component refs.
//   2. THE FOREGROUND TAB SPEAKS IT — with several tabs open on one project, only ONE reads
//      each bubble (a per-bubble Web Lock), and it's the tab the kid is actually watching:
//      the VISIBLE tab claims immediately, background tabs wait a headstart so a visible
//      (audible) tab wins first. A hidden tab that wins the lock can be muted by Chrome, so
//      letting one win would silently swallow the beat — hence the headstart.
//   3. ONE AT A TIME, IN ORDER — beats are an explicit FIFO; each utterance starts only
//      when the previous ENDS. A new turn's first beat may `jump` (interrupt + read now);
//      the rest queue politely after.
//
// Everything stays behind these signatures so a warmer engine (Kokoro.js — ADR 0006
// §Voice) can drop in later without touching callers.

let warmVoice: SpeechSynthesisVoice | null = null;

// A few warm, kid-friendly default voices by name across macOS / Chrome / Windows;
// fall back to any English voice, then the system default.
const PREFERRED = ["Samantha", "Google US English", "Karen", "Aria", "Jenny", "Daniel"];

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const english = voices.filter((v) => /^en\b/i.test(v.lang));
  const pool = english.length ? english : voices;
  // Score for warmth: premium/"natural" OS voices and Chrome's network (non-local) voices
  // sound far less robotic than the default local voices. (The real warmth upgrade is the
  // on-device neural engine Kokoro.js — ADR 0006 §Voice, issue #18.)
  const score = (v: SpeechSynthesisVoice): number => {
    let s = 0;
    if (/natural|premium|enhanced/i.test(v.name)) s += 80;
    if (/google/i.test(v.name)) s += 50;
    if (v.localService === false) s += 25;
    if (PREFERRED.includes(v.name)) s += 20;
    if (/en[-_]US/i.test(v.lang)) s += 5;
    return s;
  };
  return [...pool].sort((a, b) => score(b) - score(a))[0] ?? null;
}

function refreshVoice() {
  warmVoice = pickVoice();
}

// Chrome populates voices asynchronously — listen once on the client.
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  refreshVoice();
  window.speechSynthesis.onvoiceschanged = refreshVoice;
}

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function stripEmoji(text: string): string {
  return text.replace(/\p{Extended_Pictographic}/gu, "").trim();
}

// Chrome can truncate a long utterance (~200–256 chars) — chunk on sentence
// boundaries. Sparky's bubbles are short, so this rarely bites, but guard it. Keeping
// pieces short also keeps each utterance well under Chrome's ~15s self-pause bug.
function chunk(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 180) return clean ? [clean] : [];
  const sentences = clean.match(/[^.!?]+[.!?]*/g) ?? [clean];
  const out: string[] = [];
  let buf = "";
  for (const s of sentences) {
    if ((buf + s).length > 180) {
      if (buf.trim()) out.push(buf.trim());
      buf = s;
    } else {
      buf += s;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

// --- speaking state: drives Sparky's mouth while read-aloud audio is actually playing ---
let speaking = false;
const speakingListeners = new Set<(s: boolean) => void>();
function setSpeaking(v: boolean) {
  if (v === speaking) return;
  speaking = v;
  speakingListeners.forEach((cb) => cb(v));
}
export function isSpeaking(): boolean {
  return speaking;
}
export function onSpeakingChange(cb: (s: boolean) => void): () => void {
  speakingListeners.add(cb);
  return () => {
    speakingListeners.delete(cb);
  };
}

// --- word beats: one event per spoken word (SpeechSynthesis boundary events) ---
// Drives real mouth-sync: the mouth opens ON each word, not on a fake loop. `strength`
// is 0..1 from the word's length (longer word = bigger mouth). Browsers that never
// fire boundary events simply produce no beats — consumers keep a loop fallback.
const beatListeners = new Set<(strength: number) => void>();
function emitBeat(strength: number) {
  beatListeners.forEach((cb) => cb(strength));
}
export function onSpeakBeat(cb: (strength: number) => void): () => void {
  beatListeners.add(cb);
  return () => {
    beatListeners.delete(cb);
  };
}

// --- the queue: one utterance at a time, in FIFO order ---
type Job = { pieces: string[]; idx: number };
let queue: Job[] = [];
let current: Job | null = null;
let gen = 0; // bumped on interrupt → invalidates in-flight utterance callbacks

function pump() {
  if (current) return; // a job is already speaking
  current = queue.shift() ?? null;
  if (!current) {
    setSpeaking(false);
    return;
  }
  setSpeaking(true); // mouth moves
  speakCurrent(gen);
}

function speakCurrent(myGen: number) {
  if (myGen !== gen || !current) return; // cancelled out from under us
  const job = current;
  const piece = job.pieces[job.idx];
  if (piece === undefined) {
    current = null;
    pump(); // next beat in the queue, or settle to idle
    return;
  }
  job.idx++;
  const u = new SpeechSynthesisUtterance(piece);
  if (warmVoice) u.voice = warmVoice;
  u.rate = 1.0;
  u.pitch = 1.1; // a touch brighter for a kid's buddy
  // Word boundaries → mouth beats. charLength is missing on some engines; fall back to
  // measuring the word at charIndex in the piece we handed the utterance.
  u.onboundary = (e) => {
    if (myGen !== gen) return;
    if (e.name && e.name !== "word") return; // skip sentence boundaries where reported
    const len =
      e.charLength && e.charLength > 0
        ? e.charLength
        : (piece.slice(e.charIndex).match(/^\S+/)?.[0].length ?? 3);
    emitBeat(Math.min(1, 0.35 + len * 0.09)); // 1-char "a" ≈ 0.44, 7+ chars ≈ 1
  };
  // Advance on END — and on ERROR too, so a failed piece never strands the queue behind it.
  u.onend = () => { if (myGen === gen) speakCurrent(myGen); };
  u.onerror = () => { if (myGen === gen) speakCurrent(myGen); };
  window.speechSynthesis.speak(u);
}

// Stop everything now.
function interrupt() {
  gen++;
  current = null;
  queue = [];
  if (speechSupported()) window.speechSynthesis.cancel();
  setSpeaking(false);
}

function enqueue(pieces: string[], jump: boolean) {
  if (jump) interrupt();
  queue.push({ pieces, idx: 0 });
  pump();
}

// --- exactly-once, per bubble id ---
const spokenIds = new Set<string>(); // survives remount / StrictMode / effect double-invoke
const LOCK_HOLD_MS = 4000; // hold a won lock long enough to cover the headstart + same-instant claims
const FOREGROUND_HEADSTART_MS = 600; // background tabs wait this long before claiming, so a visible (audible) tab wins first

// Mark a bubble as already handled WITHOUT reading it (history seeding / muted).
export function markSpoken(id: string) {
  spokenIds.add(id);
}

// Read a freshly-produced Sparky bubble aloud — exactly once, in this tab, and only if
// this tab wins the bubble's cross-tab lock. `jump` = interrupt anything playing and read
// now (the first beat of a new turn); otherwise queue after what's already playing.
export function speakBubble(id: string, text: string, opts?: { jump?: boolean }) {
  if (spokenIds.has(id)) return;
  spokenIds.add(id);
  if (!speechSupported()) return;
  const pieces = chunk(stripEmoji(text));
  if (pieces.length === 0) return;
  const jump = opts?.jump ?? false;

  // The foreground (visible) tab — the one whose audio the kid actually hears — claims the
  // lock immediately; background tabs wait a headstart so a visible tab wins first. If every
  // tab is hidden, a hidden tab still claims after the delay (a maybe-muted read beats a
  // guaranteed silent miss). The lock guarantees only ONE tab reads each bubble.
  const claim = () => {
    if (typeof navigator === "undefined" || !navigator.locks) { enqueue(pieces, jump); return; }
    navigator.locks
      .request("vbk-read-" + id, { ifAvailable: true }, async (lock) => {
        if (!lock) return; // another (foreground) tab is reading this bubble
        enqueue(pieces, jump);
        await new Promise((r) => setTimeout(r, LOCK_HOLD_MS));
      })
      .catch(() => enqueue(pieces, jump)); // lock API hiccup → still read
  };
  const visible = typeof document === "undefined" || document.visibilityState === "visible";
  if (visible) claim();
  else setTimeout(claim, FOREGROUND_HEADSTART_MS);
}

export function stopSpeaking() {
  interrupt();
}

// Read THIS text now, jumping the queue — the manual 🔊 button. Always reads (no dedup,
// no lock): the kid explicitly asked to hear this bubble again.
export function speak(text: string) {
  if (!speechSupported()) return;
  const pieces = chunk(stripEmoji(text));
  if (pieces.length === 0) return;
  enqueue(pieces, true);
}
