"use client";

// The ONE place the live agent state (Convex buildStatus + client-local signals) becomes
// Sparky's mood + the "build just finished" edge. Components never regex kid-facing copy;
// they bind to `buildStatus.state` through here.
//
// deriveMood is a pure level-mapping (testable, no React). useBuildLifecycle adds the
// time-shaped parts: the celebrate window after a completion edge, and `finishCount` —
// an edge counter consumers (confetti, sounds) can useEffect on without re-deriving
// transitions themselves.

import { useEffect, useRef, useState } from "react";
import type { Mood } from "../components/SparkyAvatar";

export type BuildState = "thinking" | "building" | "done" | "error";

export type MoodInputs = {
  state: BuildState | undefined; // buildStatus.state (undefined = no build yet / legacy row)
  busy: boolean; // this tab has a POST /api/chat in flight
  streaming: boolean; // an avatar bubble is streaming text
  speaking: boolean; // read-aloud audio is playing
  celebrating?: boolean; // inside the post-build celebrate window
};

export function deriveMood({ state, busy, streaming, speaking, celebrating }: MoodInputs): Mood {
  if (celebrating) return "celebrate";
  if (speaking) return "talking";
  if (state === "error") return "oops";
  if (state === "building") return "building";
  if (state === "thinking" || busy) return "thinking";
  if (streaming) return "talking";
  return "idle";
}

const CELEBRATE_MS = 5000;

export function useBuildLifecycle(
  state: BuildState | undefined,
  signals: { busy: boolean; streaming: boolean; speaking: boolean },
): { mood: Mood; celebrating: boolean; finishCount: number; elapsedS: number | undefined } {
  const [prev, setPrev] = useState<BuildState | undefined>(state);
  const [celebrating, setCelebrating] = useState(false);
  const [finishCount, setFinishCount] = useState(0);
  const [elapsedS, setElapsedS] = useState<number | undefined>(undefined);
  const startedAtRef = useRef<number | undefined>(undefined);

  // Transition detection happens DURING render (the React-docs "adjust state when a
  // prop changes" pattern) — no effect, no cascading post-commit renders. Only a
  // WATCHED transition into "done" celebrates: reloading a page whose last build
  // finished yesterday (undefined → "done") must not pop confetti.
  if (prev !== state) {
    setPrev(state);
    if (state === "done" && (prev === "building" || prev === "thinking")) {
      setCelebrating(true);
      setFinishCount((n) => n + 1);
    } else if (state === "building" || state === "thinking") {
      setCelebrating(false);
    }
  }

  // Wall-clock work (Date.now is impure in render) lives in this effect: stamp the
  // build start, and on the done edge compute the "Built it in 12s!" elapsed.
  useEffect(() => {
    if (state === "building" || state === "thinking") {
      if (startedAtRef.current === undefined) startedAtRef.current = Date.now();
    } else if (state === "done" && startedAtRef.current !== undefined) {
      const s = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
      startedAtRef.current = undefined;
      setElapsedS(s);
    }
  }, [state]);

  // The effect owns only the timer that ends the celebrate window.
  useEffect(() => {
    if (!celebrating) return;
    const t = setTimeout(() => setCelebrating(false), CELEBRATE_MS);
    return () => clearTimeout(t);
  }, [celebrating]);

  return { mood: deriveMood({ ...signals, state, celebrating }), celebrating, finishCount, elapsedS };
}
