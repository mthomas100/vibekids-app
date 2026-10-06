"use client";

// The "IT'S ALIVE!" moment (M5): full-screen confetti + a TA-DA stamp when a build
// finishes. Fires on the finishCount edge from useBuildLifecycle — a watched
// building→done transition only, so reloading an old project never celebrates.
// Pure CSS animation (globals.css vk-confetti); removes itself when the show ends.

import { useEffect, useRef, useState } from "react";
import { DONE_VERBS } from "../lib/ai/persona";
import { playFanfare } from "../lib/sound";

const COLORS = ["#ff5c5c", "#21c7c1", "#ffc233", "#a06bff", "#58cc02", "#ff7ab8"];
const PIECES = 34;
const SHOW_MS = 3200;

type Piece = {
  left: number; // vw %
  drift: number; // px sideways over the fall
  spin: number; // deg
  fall: number; // seconds
  delay: number; // seconds
  color: string;
  w: number;
  h: number;
  round: boolean;
};

function makePieces(): Piece[] {
  return Array.from({ length: PIECES }, () => ({
    left: Math.random() * 100,
    drift: (Math.random() - 0.5) * 240,
    spin: 360 + Math.random() * 720,
    fall: 2.1 + Math.random() * 1.4,
    delay: Math.random() * 0.5,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    w: 7 + Math.random() * 7,
    h: 10 + Math.random() * 8,
    round: Math.random() < 0.3,
  }));
}

export function Celebration({
  trigger,
  elapsedS,
  sound,
}: {
  trigger: number;
  elapsedS?: number;
  sound?: boolean;
}) {
  const [show, setShow] = useState<{ pieces: Piece[]; verb: string } | null>(null);
  const first = useRef(true);
  // Latest-sound ref, updated post-render so the trigger effect reads the current
  // toggle without re-firing when it flips mid-show.
  const soundRef = useRef(sound);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  useEffect(() => {
    if (first.current) {
      first.current = false; // mount is not a finish
      return;
    }
    if (trigger <= 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- confetti burst on the rare finish edge; randomness must stay out of render; see #40
    setShow({
      pieces: makePieces(),
      verb: DONE_VERBS[Math.floor(Math.random() * DONE_VERBS.length)],
    });
    if (soundRef.current) playFanfare(); // audio context was unlocked by the kid's send tap
    const t = setTimeout(() => setShow(null), SHOW_MS);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {show.pieces.map((p, i) => (
        <span
          key={i}
          className="vk-confetti absolute -top-4"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.round ? p.w : p.h,
            background: p.color,
            borderRadius: p.round ? "50%" : "3px",
            animationDelay: `${p.delay}s`,
            ["--drift" as string]: `${p.drift}px`,
            ["--spin" as string]: `${p.spin}deg`,
            ["--fall" as string]: `${p.fall}s`,
          }}
        />
      ))}
      <div className="flex h-full items-start justify-center pt-[18vh]">
        <div className="vk-pop-in card-sticker -rotate-3 border-sun-deep bg-sun px-7 py-4 shadow-pop">
          <span className="font-display text-3xl font-extrabold text-ink">
            🎉 {show.verb} it{typeof elapsedS === "number" && elapsedS > 0 ? ` in ${elapsedS}s` : ""}!
          </span>
        </div>
      </div>
    </div>
  );
}
