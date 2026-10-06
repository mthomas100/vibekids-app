// The one client-side entry point for firing a build turn. Both page.tsx (new-app
// kickoff) and AvatarChat (typed/tapped turns) go through here, so the POST contract
// with app/api/chat lives in exactly one place. Dream-It-Up interview actions live
// here too — same reasoning, for app/api/interview.

import type { Id } from "../convex/_generated/dataModel";

export async function sendChatTurn(
  projectId: Id<"projects">,
  text: string,
  source?: "interview",
): Promise<void> {
  await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ projectId, text, source }),
  });
}

export type InterviewAction = "start" | "answer" | "buildNow" | "build" | "change" | "abandon";

// Fire one interview action. When the interview hands back a compiled brief
// (buildNow / build / a typed "i'm done"), the caller kicks it as a build turn.
export async function sendInterviewAction(
  projectId: Id<"projects">,
  action: InterviewAction,
  text?: string,
): Promise<{ ok: boolean; buildPrompt?: string }> {
  const res = await fetch("/api/interview", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ projectId, action, text }),
  });
  try {
    return (await res.json()) as { ok: boolean; buildPrompt?: string };
  } catch {
    return { ok: false };
  }
}
