import type { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { assertLlmAuth } from "../../../lib/ai/env-guard";
import { modelForRole } from "../../../lib/ai/provider";
import { INTERVIEWER_SYSTEM } from "../../../lib/ai/persona";
import { createInterviewToolServer, INTERVIEW_TOOL_NAMES } from "../../../lib/ai/interview-tools";
import {
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  INTERVIEW_ROLE,
  OPENING_LINE,
  OPENING_QUESTION,
  CHANGE_LINE,
  CHANGE_QUESTION,
  DONE_INTENT,
  FALLBACK_QUESTIONS,
  fallbackQuestionAt,
  randomInterviewAck,
} from "../../../lib/interview/config";
import { compileBuildPrompt, deterministicRecap, type QA } from "../../../lib/interview/compile";

// Dream-It-Up mode: the pre-build interview loop. Each "answer" turn is a lean
// fast-tier (Haiku) Agent SDK query that must call exactly one tool — ask_question
// or finish_interview. Everything the kid must feel INSTANTLY (the opener, acks,
// build-now, change) is written route-side with zero model latency (learning L10).
// The build itself stays in /api/chat — this route only hands back the compiled
// prompt for the client to fire as a normal build turn.
export const runtime = "nodejs";
export const maxDuration = 60;

type Action = "start" | "answer" | "buildNow" | "build" | "change" | "abandon";

export async function POST(req: NextRequest) {
  const { projectId, action, text } = (await req.json()) as {
    projectId: Id<"projects">;
    action: Action;
    text?: string;
  };
  if (!projectId || !action) {
    return Response.json({ error: "projectId and action are required" }, { status: 400 });
  }

  try {
    assertLlmAuth(); // fail fast if the selected provider has no credential
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  // The whole flow degrades to "just build it" — a kid never sees a dead interview.
  try {
    switch (action) {
      // Door tapped → open the interview with the deterministic opener. No model.
      case "start": {
        await convex.mutation(api.briefs.start, {
          projectId,
          maxQuestions: MAX_QUESTIONS,
          question: OPENING_QUESTION,
        });
        await convex.mutation(api.messages.add, {
          projectId,
          role: "avatar",
          text: `${OPENING_LINE} ${OPENING_QUESTION.text}`,
        });
        return Response.json({ ok: true });
      }

      // A chip tap or typed answer — record it, then let Haiku pick the next move.
      case "answer": {
        const answer = text?.trim();
        if (!answer) return Response.json({ error: "text is required" }, { status: 400 });
        const brief = await convex.query(api.briefs.getForProject, { projectId });
        if (!brief || (brief.status !== "active" && brief.status !== "readyToBuild")) {
          return Response.json({ error: "no open interview" }, { status: 400 });
        }

        await convex.mutation(api.messages.add, { projectId, role: "kid", text: answer });

        // "i'm done" / "just build it" typed mid-interview → build immediately,
        // no more questions, no recap gate (they said go — never re-confirm).
        if (DONE_INTENT.test(answer)) {
          const buildPrompt = compileBuildPrompt(brief.qa as QA[], brief.buildBrief);
          await convex.mutation(api.briefs.finish, {
            briefId: brief._id,
            recap: brief.recap ?? deterministicRecap(brief.qa as QA[]),
            buildBrief: buildPrompt,
            status: "building",
          });
          return Response.json({ ok: true, buildPrompt });
        }

        // INSTANT ack (the L10 beat) — read aloud while Haiku thinks up the question.
        await convex.mutation(api.messages.add, {
          projectId,
          role: "avatar",
          text: randomInterviewAck(),
        });
        const qa = (await convex.mutation(api.briefs.recordAnswer, {
          briefId: brief._id,
          answer,
          // Typing after the recap card reopens the dream as a change request.
          fallbackQuestion: brief.status === "readyToBuild" ? CHANGE_QUESTION.text : undefined,
        })) as QA[];

        // Server-enforced budget: below MIN the model may only ask; at MAX it may
        // only finish. The model never gets to overrule the rails.
        const left = Math.max(0, MAX_QUESTIONS - qa.length);
        const allowedTools =
          left <= 0
            ? [INTERVIEW_TOOL_NAMES.finish]
            : qa.length < MIN_QUESTIONS
              ? [INTERVIEW_TOOL_NAMES.ask]
              : [INTERVIEW_TOOL_NAMES.ask, INTERVIEW_TOOL_NAMES.finish];

        const { server, state } = createInterviewToolServer(convex, projectId, brief._id);
        const answered = qa.map((p) => `Q: ${p.q}\nA: ${p.a}`).join("\n");
        const prompt =
          `[DREAM-IT-UP INTERVIEW — you and the kid are dreaming up their app]\n` +
          `Their answers so far:\n${answered}\n\n` +
          `The kid just answered: "${answer}"\n` +
          `Questions you may still ask before wrapping up: ${left}\n` +
          (left <= 0 ? `No questions left — call finish_interview now.\n` : ``) +
          `Call exactly one tool now.`;

        try {
          for await (const msg of query({
            prompt,
            options: {
              model: modelForRole(INTERVIEW_ROLE),
              systemPrompt: INTERVIEWER_SYSTEM,
              tools: [], // no built-in tools; only the interviewer MCP tools exist
              mcpServers: { interviewer: server },
              allowedTools,
              maxTurns: 3,
            },
          })) {
            void msg;
            // The tool call is the whole turn — once it lands, don't pay for the
            // model's polite closing text; the kid is already reading the question.
            if (state.asked || state.finished) break;
          }
        } catch (e) {
          console.error("[interview] model turn failed, falling back:", e);
        }

        // Model turn ended without a tool call (or died) → deterministic next step.
        if (!state.asked && !state.finished) {
          if (left <= 0) {
            const recap = deterministicRecap(qa);
            await convex.mutation(api.messages.add, { projectId, role: "avatar", text: recap });
            await convex.mutation(api.briefs.finish, { briefId: brief._id, recap });
          } else {
            const askedTexts = new Set(qa.map((p) => p.q));
            const fb =
              FALLBACK_QUESTIONS.find((f) => !askedTexts.has(f.text)) ??
              fallbackQuestionAt(qa.length);
            await convex.mutation(api.messages.add, {
              projectId,
              role: "avatar",
              text: `Ooh okay — ${fb.text}`,
            });
            await convex.mutation(api.briefs.setQuestion, {
              briefId: brief._id,
              question: fb,
            });
          }
        }
        return Response.json({ ok: true });
      }

      // The always-visible 🚀 escape — compile whatever we have and go. No model.
      case "buildNow": {
        const brief = await convex.query(api.briefs.getForProject, { projectId });
        if (!brief) return Response.json({ error: "no open interview" }, { status: 400 });
        await convex.mutation(api.messages.add, {
          projectId,
          role: "kid",
          text: "I’m done — build it! 🚀",
        });
        const buildPrompt = compileBuildPrompt(brief.qa as QA[], brief.buildBrief);
        await convex.mutation(api.briefs.finish, {
          briefId: brief._id,
          recap: brief.recap ?? deterministicRecap(brief.qa as QA[]),
          buildBrief: buildPrompt,
          status: "building",
        });
        return Response.json({ ok: true, buildPrompt });
      }

      // Recap card's "Build it!" — the plan was ratified. No model.
      case "build": {
        const brief = await convex.query(api.briefs.getForProject, { projectId });
        if (!brief) return Response.json({ error: "no open interview" }, { status: 400 });
        const buildPrompt = compileBuildPrompt(brief.qa as QA[], brief.buildBrief);
        await convex.mutation(api.briefs.setStatus, { briefId: brief._id, status: "building" });
        return Response.json({ ok: true, buildPrompt });
      }

      // Recap card's "Change something" — reopen the dream with one deterministic question.
      case "change": {
        const brief = await convex.query(api.briefs.getForProject, { projectId });
        if (!brief) return Response.json({ error: "no open interview" }, { status: 400 });
        await convex.mutation(api.messages.add, {
          projectId,
          role: "kid",
          text: "Let’s change something! ✏️",
        });
        await convex.mutation(api.messages.add, {
          projectId,
          role: "avatar",
          text: `${CHANGE_LINE} ${CHANGE_QUESTION.text}`,
        });
        await convex.mutation(api.briefs.setQuestion, {
          briefId: brief._id,
          question: CHANGE_QUESTION,
        });
        return Response.json({ ok: true });
      }

      // "Never mind" before anything was answered — close quietly, starters return.
      case "abandon": {
        const brief = await convex.query(api.briefs.getForProject, { projectId });
        if (brief && (brief.status === "active" || brief.status === "readyToBuild")) {
          await convex.mutation(api.briefs.setStatus, { briefId: brief._id, status: "abandoned" });
          await convex.mutation(api.messages.add, {
            projectId,
            role: "avatar",
            text: "No worries! Tap an idea below, or just tell me anything! ✨",
          });
        }
        return Response.json({ ok: true });
      }

      default:
        return Response.json({ error: `unknown action` }, { status: 400 });
    }
  } catch (e) {
    // Audience-routed errors: detail to logs, friendly line to the kid.
    console.error("[interview] error:", e);
    await convex
      .mutation(api.messages.add, {
        projectId,
        role: "avatar",
        text: "oops, tiny hiccup — tap that again for me! 🔧",
      })
      .catch(() => {});
    return Response.json({ ok: false }, { status: 200 });
  }
}
