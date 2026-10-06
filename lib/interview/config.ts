// Dream-It-Up mode — the tunable levers, all in one place.
//
// Numbers come from the pattern research (docs/research/dream-it-up-patterns.md):
// hard question budgets of 3-5 are the industry + kids-UX consensus (Spec Kit ≤5,
// Kiro 2-4, Cursor 3-5; >5 reads as interrogation), and 3-4 options beat 2.

import type { Role } from "../ai/provider";

/** Model role for interview turns — questions are cheap; keep them snappy. */
export const INTERVIEW_ROLE: Role = "fast";

/** Hard budget: Sparky never asks more than this many questions. */
export const MAX_QUESTIONS = 5;

/** Don't let the model wrap up before the dream has any shape. */
export const MIN_QUESTIONS = 2;

/** The deterministic opener — zero model latency, fires the instant the door is tapped. */
export const OPENING_LINE = "YESSS! Let’s dream it up together! 🌟";
export const OPENING_QUESTION = {
  text: "What should we make?",
  options: [
    { emoji: "🎮", label: "A game" },
    { emoji: "📖", label: "A story" },
    { emoji: "🎨", label: "Something artsy" },
    { emoji: "🤪", label: "Something silly" },
  ],
};

/** Reopening question when the kid taps "Change something" on the recap card. */
export const CHANGE_LINE = "Ooh, let’s tweak it! 🎨";
export const CHANGE_QUESTION = {
  text: "What should we change or add?",
  options: [
    { emoji: "🎨", label: "A different look" },
    { emoji: "➕", label: "Add something fun" },
    { emoji: "🔁", label: "A different idea" },
  ],
};

/** What the "Surprise me" chip sends as the kid's answer. */
export const SURPRISE_ANSWER = "You pick! Surprise me! 🎲";

/** Kid words that mean "stop asking, start building" — checked route-side, no model. */
export const DONE_INTENT =
  /\b(build it|just build|make it now|start building|go build|i'?m done|all done|that'?s (it|all|everything)|no more questions)\b/i;

/** Instant acks while Haiku thinks of the next question (the L10 pattern). */
export const INTERVIEW_ACKS = [
  "Ooh!! ✨",
  "Nice pick! 🌟",
  "Ohhh YES! 🙌",
  "Love that! 💛",
  "Fun fun fun! 🎉",
];

export function randomInterviewAck(): string {
  return INTERVIEW_ACKS[Math.floor(Math.random() * INTERVIEW_ACKS.length)];
}

/** The build turn's instant ack when it was kicked off by a finished interview. */
export const INTERVIEW_BUILD_ACKS = [
  "Say no more — building our dream RIGHT NOW! 🚀",
  "I know EXACTLY what to make! 🎨 Here we go!",
  "Our plan — coming UP! ✨",
];

export function randomInterviewBuildAck(): string {
  return INTERVIEW_BUILD_ACKS[Math.floor(Math.random() * INTERVIEW_BUILD_ACKS.length)];
}

/** Safety net if a model turn ends without a tool call — never dead-end the kid. */
export const FALLBACK_QUESTIONS = [
  {
    text: "Who’s the star of it?",
    options: [
      { emoji: "🐉", label: "A dragon" },
      { emoji: "🤖", label: "A robot" },
      { emoji: "🐱", label: "A cat" },
      { emoji: "🦄", label: "A unicorn" },
    ],
  },
  {
    text: "What happens in it?",
    options: [
      { emoji: "🏃", label: "Running and jumping" },
      { emoji: "🧩", label: "Solving puzzles" },
      { emoji: "🎵", label: "Making sounds" },
      { emoji: "✏️", label: "Drawing stuff" },
    ],
  },
  {
    text: "How should it look?",
    options: [
      { emoji: "🌈", label: "Super colorful" },
      { emoji: "🌙", label: "Dark and spacey" },
      { emoji: "🍬", label: "Candy colors" },
      { emoji: "📼", label: "Old-school pixels" },
    ],
  },
  {
    text: "What’s one special touch?",
    options: [
      { emoji: "🔊", label: "Silly sounds" },
      { emoji: "🎆", label: "Fireworks" },
      { emoji: "⚡", label: "A power-up" },
      { emoji: "🥚", label: "A hidden surprise" },
    ],
  },
];

export function fallbackQuestionAt(index: number) {
  return FALLBACK_QUESTIONS[Math.min(index, FALLBACK_QUESTIONS.length - 1)];
}
