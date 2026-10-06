import { describe, expect, it } from "vitest";
import { compileBuildPrompt, deterministicRecap, type QA } from "./compile";
import { DONE_INTENT, fallbackQuestionAt, FALLBACK_QUESTIONS } from "./config";

const QA_FULL: QA[] = [
  { q: "What should we make?", a: "A dragon café game" },
  { q: "What does the dragon serve?", a: "Rainbow cupcakes" },
  { q: "How should it look?", a: "You pick! Surprise me! 🎲" },
];

describe("compileBuildPrompt", () => {
  it("leads with the model's buildBrief when present and keeps every raw choice", () => {
    const p = compileBuildPrompt(QA_FULL, "Make a dragon café game where you serve rainbow cupcakes.");
    expect(p).toMatch(/^Make a dragon café game where you serve rainbow cupcakes\./);
    for (const pair of QA_FULL) expect(p).toContain(`- ${pair.q} → ${pair.a}`);
    expect(p).toContain("every choice above must show up");
  });

  it("falls back to the kid's first answer as the lead when there is no buildBrief", () => {
    const p = compileBuildPrompt(QA_FULL);
    expect(p).toMatch(/^Make this: A dragon café game\./);
  });

  it("tells the builder to choose when the kid said surprise me", () => {
    expect(compileBuildPrompt(QA_FULL)).toContain("YOU pick something awesome");
    expect(compileBuildPrompt(QA_FULL.slice(0, 2))).not.toContain("YOU pick");
  });

  it("degrades to just the lead with an empty interview", () => {
    expect(compileBuildPrompt([])).toBe("Make something fun and kid-friendly.");
    expect(compileBuildPrompt([], "Make a cat piano.")).toBe("Make a cat piano.");
  });
});

describe("deterministicRecap", () => {
  it("names the idea and up to three concrete extras, skipping surprise-me answers", () => {
    const r = deterministicRecap(QA_FULL);
    expect(r).toContain("A dragon café game");
    expect(r).toContain("Rainbow cupcakes");
    expect(r).not.toContain("Surprise me");
  });

  it("still cheers with an empty interview", () => {
    expect(deterministicRecap([])).toContain("Ready?!");
  });
});

describe("DONE_INTENT", () => {
  it.each([
    "just build it!",
    "I'm done",
    "ok that's it",
    "no more questions please",
    "make it now!!",
  ])("catches %s", (text) => {
    expect(DONE_INTENT.test(text)).toBe(true);
  });

  it.each(["a blue dragon", "a done-up castle", "the builder guy"])(
    "does not fire on a normal answer: %s",
    (text) => {
      expect(DONE_INTENT.test(text)).toBe(false);
    },
  );
});

describe("fallbackQuestionAt", () => {
  it("clamps past the end instead of exploding", () => {
    expect(fallbackQuestionAt(99)).toBe(FALLBACK_QUESTIONS[FALLBACK_QUESTIONS.length - 1]);
    expect(fallbackQuestionAt(0)).toBe(FALLBACK_QUESTIONS[0]);
  });
});
