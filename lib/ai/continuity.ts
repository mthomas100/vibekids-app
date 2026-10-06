// Cross-turn continuity (ADR 0005): each Agent-SDK query() is a fresh, contextless
// turn, so a follow-up ("make the button pink") must carry the kid's current app with
// it. Pure prompt-builder — no Convex, no SDK — so the wrapping rules are testable.
//
// Goes in the (dynamic) user prompt, never the cached system prompt (learning L2).

export type ContinuityFile = { path: string; content: string };

export function buildTurnPrompt(
  text: string,
  existingFiles: ContinuityFile[],
  projectName?: string,
): string {
  if (existingFiles.length === 0) return text;
  const tree = existingFiles
    .map((f) => `===== ${f.path} =====\n${f.content}`)
    .join("\n\n");
  return (
    `[CONTINUING AN EXISTING APP — this is NOT a new idea.]\n` +
    `The kid is already building "${projectName ?? "their app"}". It already exists. ` +
    `Do NOT call create_project. Change it in place with edit_file (small tweaks) or write_file (whole files). ` +
    `If the kid is asking for a TOTALLY DIFFERENT app (not a change to this one), do NOT edit — call offer_new_app to offer it as a brand-new app. ` +
    `Here are its current files:\n\n${tree}\n\n` +
    `The kid now says: ${text}`
  );
}
