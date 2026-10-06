"use client";

// The while-you-wait show ("latency is a feature", M3 #2). While Sparky works, the wait
// becomes a little performance: the CURRENT step big with a marching progress bar, the
// trail of steps he already did (labor made visible — waits feel shorter when you can
// see the work), and a rotating fun fact/joke.
//
// Deliberately NO nudge toward other projects mid-build: attention-residue research says
// a prompted hop hurts both sides and risks the kid missing the reveal — the peak-end
// payoff (docs/research/wait-time-engagement.md, D25). If the kid wanders on their own,
// the future Come-Back Ding pulls them back instead.

import { useEffect, useState } from "react";
import type { BuildState } from "../lib/buildMood";
import { factAt, randomFactIndex } from "../lib/funFacts";

const FACT_EVERY_MS = 8_000;

export function BuildShow({
  phase,
  state,
  busy,
}: {
  phase: string | undefined;
  state: BuildState | undefined;
  busy: boolean;
}) {
  const working = busy || state === "thinking" || state === "building";

  // Trail of distinct steps this build has announced (client-accumulated; a fresh
  // turn starts a fresh trail). Reset + accumulation happen DURING render (the
  // React-docs adjust-state pattern) — the effects below only own timers.
  const [trail, setTrail] = useState<string[]>([]);
  const [factIdx, setFactIdx] = useState(randomFactIndex);
  const [prevWorking, setPrevWorking] = useState(working);
  const [prevState, setPrevState] = useState(state);
  const [prevPhase, setPrevPhase] = useState(phase);

  if (working !== prevWorking) {
    setPrevWorking(working);
    if (working) setTrail([]); // fresh build → fresh show
  }
  // A queued turn auto-drains without `working` ever dropping — the done→thinking edge
  // is the turn boundary there, so reset the trail on it too (#41).
  if (state !== prevState) {
    setPrevState(state);
    if (state === "thinking" && prevState === "done") setTrail([]);
  }
  if (phase !== prevPhase) {
    setPrevPhase(phase);
    if (working && phase) setTrail((t) => (t[t.length - 1] === phase ? t : [...t, phase]));
  }

  // The only timer: rotate the fun fact.
  useEffect(() => {
    if (!working) return;
    const factTimer = setInterval(() => setFactIdx((i) => i + 1), FACT_EVERY_MS);
    return () => clearInterval(factTimer);
  }, [working]);

  if (!working) return null;

  const doneSteps = trail.slice(0, -1).slice(-3); // last few finished steps
  const current = trail[trail.length - 1] ?? phase ?? "Getting ready…";

  return (
    <div className="vk-pop-in card-sticker space-y-2.5 border-aqua-deep/25 bg-aqua/10 p-3.5">
      {/* finished steps — the visible pile of work */}
      {doneSteps.length > 0 && (
        <div className="space-y-1">
          {doneSteps.map((s, i) => (
            <div key={`${s}-${i}`} className="flex items-center gap-2 text-[13px] font-bold text-ink-faint">
              <span className="text-lime">✓</span>
              <span className="line-through decoration-2 decoration-lime/40">{s}</span>
            </div>
          ))}
        </div>
      )}
      {/* the step happening RIGHT NOW */}
      <div className="flex items-center gap-2.5">
        <span className="relative h-3.5 w-28 shrink-0 overflow-hidden rounded-full border-2 border-aqua-deep/30 bg-card">
          <span className="vk-stripes absolute inset-0 rounded-full bg-aqua" />
        </span>
        <span className="font-display text-[15px] font-bold leading-tight text-aqua-deep">
          {current}
        </span>
      </div>
      {/* treat while you wait */}
      <p key={factIdx} className="vk-pop-in text-[13px] font-semibold leading-snug text-ink-soft">
        {factAt(factIdx)}
      </p>
    </div>
  );
}
