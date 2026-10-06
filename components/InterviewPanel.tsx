"use client";

// Dream-It-Up mode's kid-facing surface: the door that opens it, the tappable
// answers for Sparky's current question, the progress dots, the two escape
// hatches (✏️ type your own / 🎲 surprise me), the always-there "🚀 build it!"
// bar, and the recap card gate. The QUESTIONS themselves are ordinary avatar
// bubbles in the transcript (so read-aloud just works) — this panel is only
// the answering machinery, driven live off the `briefs` row.
//
// Pattern notes (docs/research/dream-it-up-patterns.md): options-first with a
// free-text escape, 3-4 wildly-different choices, visible progress, one-tap
// early exit at every step, and never re-confirming after an explicit "go".

import type { Doc } from "../convex/_generated/dataModel";
import { SURPRISE_ANSWER } from "../lib/interview/config";

// The grape-purple "🤔 dream it up" door on the empty-project screen — the mode
// is summoned, never forced (anti-Clippy): "just build it" stays the default.
export function DreamDoor({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="btn-toy vk-pop-in flex w-full flex-col items-center gap-0.5 rounded-2xl border-grape-deep bg-grape/25 px-4 py-3.5 text-center"
    >
      <span className="font-display text-lg font-extrabold text-ink">
        🤔💭 Dream it up with Sparky!
      </span>
      <span className="text-[13px] font-semibold text-ink-soft">
        He asks fun questions, then builds YOUR idea!
      </span>
    </button>
  );
}

export function InterviewPanel({
  brief,
  waiting,
  onAnswer,
  onSomethingElse,
  onBuildNow,
  onBuild,
  onChangeSomething,
  onNeverMind,
}: {
  brief: Doc<"briefs">;
  waiting: boolean; // an interview POST is in flight (Sparky picking his next move)
  onAnswer: (text: string) => void;
  onSomethingElse: () => void; // focus the input — "tell me in your words"
  onBuildNow: () => void;
  onBuild: () => void;
  onChangeSomething: () => void;
  onNeverMind: () => void;
}) {
  // The plan is ready — one explicit gate, then we never ask again.
  if (brief.status === "readyToBuild") {
    return (
      <div className="vk-pop-in card-sticker space-y-2.5 border-grape-deep/30 bg-grape/10 p-4">
        <p className="text-center font-display text-lg font-extrabold text-ink">
          ⭐ Our plan is ready!
        </p>
        <button
          type="button"
          onClick={onBuild}
          className="btn-toy w-full rounded-2xl border-lime-deep bg-lime px-4 py-3 text-lg text-ink"
        >
          🚀 Build it!
        </button>
        <button
          type="button"
          onClick={onChangeSomething}
          className="btn-toy w-full border-sun-deep/50 bg-sun/30 px-4 py-2 text-sm text-ink"
        >
          ✏️ Change something
        </button>
      </div>
    );
  }

  if (brief.status !== "active") return null;

  const answered = brief.qa.length;
  const total = brief.maxQuestions;
  const question = brief.currentQuestion;
  const thinking = waiting || !question;

  return (
    <div className="vk-pop-in space-y-2.5">
      {/* progress — the kid can see the dream has a finish line */}
      <div className="flex items-center justify-between px-1">
        <span className="font-display text-xs font-bold text-grape-deep">
          🤔💭 Dreaming it up…
        </span>
        <span className="flex items-center gap-1" aria-label={`${answered} of ${total} answers`}>
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full transition ${
                i < answered ? "bg-grape" : "border border-ink/15 bg-sunken"
              }`}
            />
          ))}
        </span>
      </div>

      {thinking ? (
        // Between questions — Sparky is picking his next move (a beat, not a build).
        <div className="flex items-center gap-2 px-1 py-1.5">
          <span className="vk-dot h-2 w-2 rounded-full bg-grape" style={{ animationDelay: "0ms" }} />
          <span className="vk-dot h-2 w-2 rounded-full bg-grape" style={{ animationDelay: "150ms" }} />
          <span className="vk-dot h-2 w-2 rounded-full bg-grape" style={{ animationDelay: "300ms" }} />
          <span className="text-[13px] font-semibold text-ink-soft">
            Sparky’s cooking up a question…
          </span>
        </div>
      ) : (
        <>
          {/* the tappable answers */}
          <div className="flex flex-wrap gap-2">
            {question.options.map((o, i) => (
              <button
                key={`${o.label}-${i}`}
                type="button"
                style={{ animationDelay: `${i * 70}ms` }}
                onClick={() => onAnswer(`${o.emoji} ${o.label}`)}
                className="btn-toy vk-pop-in border-grape-deep bg-grape/20 px-4 py-2 text-sm text-ink"
              >
                {o.emoji} {o.label}
              </button>
            ))}
          </div>
          {/* the two escape hatches — their own row so they read as "other paths" */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSomethingElse}
              className="btn-toy border-ink/15 bg-card px-3.5 py-1.5 text-[13px] text-ink-soft"
            >
              ✏️ Something else…
            </button>
            <button
              type="button"
              onClick={() => onAnswer(SURPRISE_ANSWER)}
              className="btn-toy border-ink/15 bg-card px-3.5 py-1.5 text-[13px] text-ink-soft"
            >
              🎲 Surprise me!
            </button>
          </div>
        </>
      )}

      {/* the always-there exits: build with what we have, or bail before it began */}
      {answered > 0 ? (
        <button
          type="button"
          onClick={onBuildNow}
          className="btn-toy w-full rounded-2xl border-lime-deep bg-lime px-4 py-2.5 text-base text-ink"
        >
          🚀 I’m done — build it!
        </button>
      ) : (
        <button
          type="button"
          onClick={onNeverMind}
          className="mx-auto block px-3 py-1 text-xs font-bold text-ink-faint transition hover:text-ink-soft"
        >
          ✕ Never mind
        </button>
      )}
    </div>
  );
}
