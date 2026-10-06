"use client";

// Dev spike: every Sparky mood side by side + a live mouth-sync test rig.
// Same pattern as spike-rive / spike-kokoro — a keystone-proving page, not shipped UX.

import { useState } from "react";
import { SparkyAvatar, type Mood } from "../../components/SparkyAvatar";
import { speak, stopSpeaking } from "../../lib/voice/speak";

const MOODS: Mood[] = ["idle", "thinking", "building", "talking", "celebrate", "oops"];

export default function SparkySpike() {
  const [line, setLine] = useState(
    "Ooh, a stomping dino game! Let's build it right now — big green button, silly sounds, everything!",
  );
  return (
    <div className="min-h-dvh overflow-auto p-8">
      <h1 className="font-display text-3xl font-extrabold text-ink">Sparky spike</h1>
      <p className="mb-6 font-semibold text-ink-soft">
        Moods, parallax (move the mouse), pupils, and word-beat mouth sync.
      </p>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
        {MOODS.map((m) => (
          <div key={m} className="card-sticker flex flex-col items-center gap-2 p-4">
            <SparkyAvatar mood={m} size={110} />
            <span className="font-display text-sm font-bold text-ink-soft">{m}</span>
          </div>
        ))}
      </div>
      <div className="card-sticker mt-8 max-w-2xl p-5">
        <h2 className="font-display text-xl font-bold text-ink">Mouth-sync rig</h2>
        <p className="mb-3 text-sm font-semibold text-ink-soft">
          Hit Speak and watch the talking Sparky: mouth should pop per WORD (boundary
          events), not loop. Stop should shut it instantly.
        </p>
        <div className="flex items-start gap-4">
          <SparkyAvatar mood="talking" size={130} />
          <div className="flex-1">
            <textarea
              value={line}
              onChange={(e) => setLine(e.target.value)}
              rows={3}
              className="w-full rounded-2xl border-[2.5px] border-ink/15 p-3 font-semibold text-ink outline-none focus:border-aqua"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => speak(line)}
                className="btn-toy border-lime-deep bg-lime px-5 py-2 text-white"
              >
                🔊 Speak
              </button>
              <button
                type="button"
                onClick={() => stopSpeaking()}
                className="btn-toy border-ink/15 bg-card px-5 py-2 text-ink-soft"
              >
                ⏹ Stop
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
