"use client";

// Sparky's living face (M4 / #17, upgraded). A CSS+SVG character that reads as a soft
// 3D toy: radial-gradient shading, a perspective head that turns to follow the kid's
// pointer, pupils with saccades, real word-synced mouth (speechSynthesis boundary
// beats via lib/voice/speak.onSpeakBeat), and mood acting on top. Per ADR 0007 a
// Rive/.riv (or r3f) engine can replace the internals behind the same `mood` prop.

import { useEffect, useRef, useState } from "react";
import { onSpeakBeat } from "../lib/voice/speak";

export type Mood = "idle" | "thinking" | "building" | "talking" | "celebrate" | "oops";

// Mood derivation lives in lib/buildMood.ts (deriveMood / useBuildLifecycle) — it binds
// to the machine-readable buildStatus.state, never this component and never the kid copy.

const WRAP_ANIM: Record<Mood, string> = {
  idle: "sparky-bob",
  thinking: "sparky-bob",
  talking: "sparky-bob",
  building: "sparky-wobble",
  celebrate: "sparky-pop",
  oops: "sparky-shake",
};

// SVG transforms need an explicit box so transform-origin: center is reliable.
const FILL_BOX = { transformBox: "fill-box", transformOrigin: "center" } as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function SparkyAvatar({ mood = "idle", size = 44 }: { mood?: Mood; size?: number }) {
  const rootRef = useRef<HTMLDivElement>(null);

  // --- head parallax: the whole face turns a few degrees toward the pointer ---
  const [tilt, setTilt] = useState({ x: 0, y: 0 }); // degrees
  useEffect(() => {
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (raf) return; // one update per frame
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = rootRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
        const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
        setTilt({ x: clamp(dx * 26, -9, 9), y: clamp(dy * 22, -7, 7) });
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // --- living eyes: pupils track the pointer loosely, with idle saccades ---
  const [gaze, setGaze] = useState({ x: 0, y: 0 }); // pupil offset in SVG units
  const gazeTarget = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2);
      gazeTarget.current = { x: clamp(dx * 3.2, -2.6, 2.6), y: clamp(dy * 2.6, -1.8, 2.2) };
    };
    window.addEventListener("pointermove", onMove);
    // Saccade: every few seconds of stillness, dart somewhere interesting for a beat.
    const saccade = setInterval(() => {
      if (Math.random() < 0.45) {
        const jx = (Math.random() - 0.5) * 4;
        const jy = (Math.random() - 0.5) * 2.5;
        gazeTarget.current = { x: clamp(jx, -2.6, 2.6), y: clamp(jy, -1.8, 2.2) };
      }
    }, 2800);
    // Ease pupils toward the target ~30fps (cheap, smooth).
    const tick = setInterval(() => {
      setGaze((g) => {
        const t = gazeTarget.current;
        const nx = g.x + (t.x - g.x) * 0.25;
        const ny = g.y + (t.y - g.y) * 0.25;
        if (Math.abs(nx - g.x) < 0.01 && Math.abs(ny - g.y) < 0.01) return g;
        return { x: nx, y: ny };
      });
    }, 33);
    return () => {
      window.removeEventListener("pointermove", onMove);
      clearInterval(saccade);
      clearInterval(tick);
    };
  }, []);

  // --- word-beat mouth: opens on each spoken word, eases shut between them ---
  const [mouthOpen, setMouthOpen] = useState(0); // 0..1
  // Beat mode = a boundary event arrived recently. Some voices never fire boundaries,
  // and then Sparky must fall back to the CSS talk loop — never a frozen face. State
  // (not a render-time clock read) so renders stay pure; the decay timer expires it.
  const [beatMode, setBeatMode] = useState(false);
  const lastBeatRef = useRef(0);
  useEffect(() => {
    const offBeat = onSpeakBeat((strength) => {
      lastBeatRef.current = Date.now();
      setMouthOpen(strength);
      setBeatMode(true);
    });
    const decay = setInterval(() => {
      setMouthOpen((m) => (m > 0.05 ? m * 0.72 : 0));
      if (Date.now() - lastBeatRef.current > 700) setBeatMode(false);
    }, 66);
    return () => {
      offBeat();
      clearInterval(decay);
    };
  }, []);
  const beatDriven = mood === "talking" && beatMode;

  const happyEyes = mood === "celebrate";
  // Thinking looks UP-and-away (classic "hmm"), gaze still layered on top.
  const pupilBase = mood === "thinking" ? { x: 1.6, y: -2.4 } : { x: 0, y: 0 };
  const px = clamp(pupilBase.x + gaze.x, -3, 3);
  const py = clamp(pupilBase.y + gaze.y, -2.6, 2.6);

  return (
    <div
      ref={rootRef}
      className={`relative shrink-0 ${WRAP_ANIM[mood]}`}
      style={{ width: size, height: size, perspective: 500 }}
      aria-hidden="true"
    >
      {mood === "celebrate" && (
        <>
          <span className="sparky-spark absolute -left-1 -top-1 text-xs">✨</span>
          <span className="sparky-spark absolute -top-0.5 right-0 text-xs" style={{ animationDelay: "0.15s" }}>✨</span>
          <span className="sparky-spark absolute bottom-0 right-1 text-xs" style={{ animationDelay: "0.3s" }}>⭐</span>
        </>
      )}
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="overflow-visible"
        style={{
          transform: `rotateY(${tilt.x}deg) rotateX(${-tilt.y}deg)`,
          transformStyle: "preserve-3d",
          transition: "transform 0.18s ease-out",
        }}
      >
        <defs>
          {/* soft-toy shading: light falls from the upper left */}
          <radialGradient id="vkFur" cx="0.38" cy="0.3" r="0.85">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="72%" stopColor="#f7f4fb" />
            <stop offset="100%" stopColor="#dcd4ea" />
          </radialGradient>
          <radialGradient id="vkEar" cx="0.4" cy="0.35" r="0.8">
            <stop offset="0%" stopColor="#4a4552" />
            <stop offset="100%" stopColor="#211d28" />
          </radialGradient>
          <radialGradient id="vkPatch" cx="0.4" cy="0.35" r="0.85">
            <stop offset="0%" stopColor="#3c3744" />
            <stop offset="100%" stopColor="#241f2b" />
          </radialGradient>
        </defs>
        <g className="sparky-breathe" style={FILL_BOX}>
          {/* ears */}
          <circle cx="27" cy="27" r="13" fill="url(#vkEar)" />
          <circle cx="73" cy="27" r="13" fill="url(#vkEar)" />
          <circle cx="27" cy="27" r="6" fill="#5d5766" />
          <circle cx="73" cy="27" r="6" fill="#5d5766" />
          {/* head — gradient ball + soft ground shadow give the 3D-toy read */}
          <ellipse cx="50" cy="93" rx="26" ry="4.5" fill="#2d2a32" opacity="0.10" />
          <circle cx="50" cy="56" r="35" fill="url(#vkFur)" stroke="#d9d2e6" strokeWidth="2.5" />
          {/* specular kiss on the forehead */}
          <ellipse cx="38" cy="34" rx="10" ry="5.5" fill="#ffffff" opacity="0.65" transform="rotate(-18 38 34)" />
          {/* panda eye patches */}
          <ellipse cx="37" cy="53" rx="9" ry="12" fill="url(#vkPatch)" transform="rotate(-20 37 53)" />
          <ellipse cx="63" cy="53" rx="9" ry="12" fill="url(#vkPatch)" transform="rotate(20 63 53)" />
          {/* tiny spark mark — he's still Sparky (the panda) */}
          <path d="M51 13 L45 23 L50 23 L47 31 L57 20 L51 20 Z" fill="#ffc233" stroke="#e0a112" strokeWidth="1.5" strokeLinejoin="round" />
          {/* cheeks */}
          <circle cx="28" cy="66" r="4.5" fill="#ff7ab8" opacity="0.55" />
          <circle cx="72" cy="66" r="4.5" fill="#ff7ab8" opacity="0.55" />
          {/* eyes */}
          {happyEyes ? (
            <g stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round">
              <path d="M32 53 Q37 48 42 53" />
              <path d="M58 53 Q63 48 68 53" />
            </g>
          ) : (
            <g className="sparky-blink" style={FILL_BOX}>
              <circle cx="37" cy="53" r="4.6" fill="#ffffff" />
              <circle cx="63" cy="53" r="4.6" fill="#ffffff" />
              <g style={{ transition: "transform 0.1s ease-out", transform: `translate(${px}px, ${py}px)` }}>
                <circle cx="37" cy="53" r="2.5" fill="#111827" />
                <circle cx="63" cy="53" r="2.5" fill="#111827" />
                <circle cx="37.9" cy="52.1" r="0.8" fill="#ffffff" />
                <circle cx="63.9" cy="52.1" r="0.8" fill="#ffffff" />
              </g>
            </g>
          )}
          {/* nose + philtrum */}
          <ellipse cx="50" cy="62" rx="4" ry="3" fill="#241f2b" />
          <line x1="50" y1="64" x2="50" y2="68" stroke="#241f2b" strokeWidth="2" strokeLinecap="round" />
          {/* mouth — varies by mood; while talking it syncs to real word beats */}
          {mood === "celebrate" && <path d="M42 68 Q50 79 58 68 Z" fill="#9d174d" />}
          {mood === "talking" &&
            (beatDriven ? (
              <ellipse
                cx="50"
                cy="70"
                rx={4 + mouthOpen * 2.6}
                ry={1.6 + mouthOpen * 4.6}
                fill="#9d174d"
                style={{ transition: "rx 0.06s ease-out, ry 0.06s ease-out" }}
              />
            ) : (
              <ellipse className="sparky-talk" cx="50" cy="70" rx="5.5" ry="4.5" fill="#9d174d" style={FILL_BOX} />
            ))}
          {mood === "oops" && (
            <path d="M43 71 Q50 64 57 71" stroke="#241f2b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          )}
          {mood === "thinking" && <circle cx="50" cy="70" r="3" fill="#241f2b" />}
          {(mood === "idle" || mood === "building") && (
            <path d="M43 68 Q50 74 57 68" stroke="#241f2b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          )}
        </g>
      </svg>
    </div>
  );
}
