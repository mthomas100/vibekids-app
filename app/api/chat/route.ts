import type { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { assertLlmAuth } from "../../../lib/ai/env-guard";
import { modelForRole } from "../../../lib/ai/provider";
import { SPARKY_SYSTEM, randomAck } from "../../../lib/ai/persona";
import { randomInterviewBuildAck } from "../../../lib/interview/config";
import { buildTurnPrompt } from "../../../lib/ai/continuity";
import { createSparkyToolServer, SPARKY_TOOL_NAMES } from "../../../lib/ai/tools";

// The Agent SDK spawns a subprocess and needs Node + the OAuth token, so this
// route is Node-runtime (not Edge). It runs the whole agent loop, streaming all
// output into Convex; the browser subscribes to Convex for the live chat + preview.
export const runtime = "nodejs";
export const maxDuration = 120; // generous for local dev

export async function POST(req: NextRequest) {
  const { projectId, text, source } = (await req.json()) as {
    projectId: Id<"projects">;
    text: string;
    // "interview" = a compiled Dream-It-Up brief: the kid already saw/ratified the
    // plan in their own words, so the spec text is NOT echoed as a kid bubble.
    source?: "interview";
  };
  if (!projectId || !text?.trim()) {
    return Response.json({ error: "projectId and text are required" }, { status: 400 });
  }

  try {
    assertLlmAuth(); // fail fast if the selected provider has no credential
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  // Record the kid's message. (An interview-compiled brief skips this — the kid's own
  // words are already in the transcript as their answers.)
  if (source !== "interview") {
    await convex.mutation(api.messages.add, { projectId, role: "kid", text });
  }
  // INSTANT acknowledgement — Sparky reacts the moment the kid hits send, BEFORE the model
  // (which can take many seconds just to generate its first file). This is the "talk to me
  // right away" beat; the client reads it aloud immediately, then the model's narration
  // follows as later beats.
  await convex.mutation(api.messages.add, {
    projectId,
    role: "avatar",
    text: source === "interview" ? randomInterviewBuildAck() : randomAck(),
  });
  // Open a streaming avatar bubble for the model's output to fill in.
  const avatarId = await convex.mutation(api.messages.add, {
    projectId,
    role: "avatar",
    text: "",
    streaming: true,
  });
  await convex.mutation(api.buildStatus.set, { projectId, phase: "Dreaming…", state: "thinking" });

  // Continuity (ADR 0005): a follow-up turn must KNOW the kid's current app —
  // buildTurnPrompt wraps the kid's words with the live tree + an "edit, don't
  // recreate" directive whenever files already exist.
  const existingFiles = await convex.query(api.files.listForProject, { projectId });
  const project =
    existingFiles.length > 0 ? await convex.query(api.projects.get, { projectId }) : null;
  const promptToSend = buildTurnPrompt(text, existingFiles, project?.name);

  // Pass the turn's avatar bubble as the turn anchor — every file snapshot this
  // build produces is stamped with it, so the time machine can group a turn's edits.
  const server = createSparkyToolServer(convex, projectId, avatarId);

  // Spoken in beats: track the currently-open avatar bubble across the turn (and into
  // the catch) so we can close one narration and open the next around each build step.
  let currentMsgId = avatarId;
  let currentHasText = false;
  let startNewBubble = false;

  try {
    for await (const msg of query({
      prompt: promptToSend,
      options: {
        model: modelForRole("balanced"),
        systemPrompt: SPARKY_SYSTEM,
        // `tools: []` disables every built-in tool (Bash, Read, Edit, WebFetch, …); the
        // only action surface left is the sparky MCP server's project-scoped tools.
        tools: [],
        mcpServers: { sparky: server },
        allowedTools: SPARKY_TOOL_NAMES,
        maxTurns: 8,
      },
    })) {
      if (msg.type !== "assistant") continue;
      for (const block of msg.message?.content ?? []) {
        if (block.type === "text" && block.text) {
          // A new narration beat after a build step → open a fresh bubble for it.
          if (startNewBubble) {
            currentMsgId = await convex.mutation(api.messages.add, {
              projectId,
              role: "avatar",
              text: "",
              streaming: true,
            });
            startNewBubble = false;
            currentHasText = false;
          }
          await convex.mutation(api.messages.appendText, {
            messageId: currentMsgId,
            delta: block.text,
          });
          currentHasText = true;
        } else if (block.type === "tool_use" && currentHasText) {
          // A build step is starting — close this narration so the client reads it NOW
          // (before the long build), and start the next beat ("it's ready!") in a fresh bubble.
          await convex.mutation(api.messages.finish, { messageId: currentMsgId });
          startNewBubble = true;
        }
      }
    }
    await convex.mutation(api.messages.finish, { messageId: currentMsgId });
    await convex.mutation(api.buildStatus.set, { projectId, phase: "Done! 🎉", state: "done" });
    return Response.json({ ok: true });
  } catch (e) {
    // Audience-routed errors: full detail to logs, one
    // friendly line to the kid — never a stack trace in a rendered message.
    console.error("[chat] agent error:", e);
    const errMsgId = startNewBubble
      ? await convex.mutation(api.messages.add, { projectId, role: "avatar", text: "", streaming: true })
      : currentMsgId;
    await convex.mutation(api.messages.appendText, {
      messageId: errMsgId,
      delta: "oops, tiny hiccup — let's try that again! 🔧",
    });
    await convex.mutation(api.messages.finish, { messageId: errMsgId });
    await convex.mutation(api.buildStatus.set, {
      projectId,
      phase: "Hiccup — try again",
      state: "error",
    });
    return Response.json({ ok: false }, { status: 200 });
  }
}
