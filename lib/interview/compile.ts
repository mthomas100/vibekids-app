// Compile a finished Dream-It-Up interview into the build turn's prompt (and a
// fallback recap). Pure — no Convex, no SDK — so the rules are testable.
//
// The output is sent through the normal /api/chat build path as the "kid's ask",
// so it's written the way builder-Sparky expects asks to read: plain, imperative,
// every choice the kid made spelled out. Verbatim answers are ground truth — the
// model's own buildBrief (when present) leads, the raw Q&A list always follows.

export type QA = { q: string; a: string };

const SURPRISE_RE = /\bsurprise me\b/i;

export function compileBuildPrompt(qa: QA[], buildBrief?: string): string {
  const idea = qa[0]?.a?.trim();
  const lead =
    buildBrief?.trim() ||
    (idea ? `Make this: ${idea}.` : "Make something fun and kid-friendly.");
  if (qa.length === 0) return lead;

  const choices = qa
    .map((p) => `- ${p.q} → ${p.a}`)
    .join("\n");
  const surprises = qa.some((p) => SURPRISE_RE.test(p.a))
    ? "\nWhere the kid said “surprise me”, YOU pick something awesome and kid-delighting."
    : "";

  return (
    `${lead}\n\n` +
    `The kid dreamed this up with you, one question at a time. Their exact choices:\n` +
    `${choices}\n\n` +
    `Build the simple, playable version of EXACTLY this — every choice above must show up in the app.` +
    surprises
  );
}

// Kid-facing recap when the model didn't write one (build-it-now, fallback finish).
export function deterministicRecap(qa: QA[]): string {
  const idea = qa[0]?.a?.trim();
  if (!idea) return "Here’s our plan — something super fun! Ready?! 🚀";
  const extras = qa
    .slice(1)
    .map((p) => p.a.trim())
    .filter((a) => a && !SURPRISE_RE.test(a))
    .slice(0, 3);
  const withExtras = extras.length > 0 ? ` — with ${extras.join(", ")}` : "";
  return `Here’s our plan! We’re making ${idea}${withExtras}! Ready?! 🚀`;
}
