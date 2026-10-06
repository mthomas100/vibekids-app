// Dream-It-Up mode's two tools, in the same house style as Sparky's build tools
// (verb-first description + limit-bearing .describe()s; see lib/ai/tools.ts).
//
// The interviewer model does ALL its talking through these: ask_question emits the
// next question bubble + tappable options; finish_interview emits the recap and
// flips the brief to readyToBuild. Both persist to Convex only — no filesystem.
//
// The returned `state` flags let the route detect a turn that ended without a tool
// call and fall back deterministically (never dead-end the kid).

import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type Text = { content: { type: "text"; text: string }[] };
const ok = (text: string): Text => ({ content: [{ type: "text", text }] });

export const INTERVIEW_TOOL_NAMES = {
  ask: "mcp__interviewer__ask_question",
  finish: "mcp__interviewer__finish_interview",
};

export type InterviewTurnState = { asked: boolean; finished: boolean };

export function createInterviewToolServer(
  convex: ConvexHttpClient,
  projectId: Id<"projects">,
  briefId: Id<"briefs">,
) {
  const state: InterviewTurnState = { asked: false, finished: false };

  const ask_question = tool(
    "ask_question",
    "Ask the kid the ONE next dream-it-up question, with tappable answers. Usage: call once per turn while the vision still has a big unknown. The reaction + question show as one chat bubble; the options become chips.",
    {
      reaction: z
        .string()
        .describe(
          "Your excited 2-6 word cheer for what the kid just said, echoing THEIR word back. Example: 'A dragon café?! YES!! 🐉'",
        ),
      question: z
        .string()
        .describe(
          "ONE short curious question building on their answer, about 10 words max, ending with a question mark. Example: 'What does your dragon serve?'",
        ),
      options: z
        .array(
          z.object({
            emoji: z.string().describe("One emoji that fits."),
            label: z.string().describe("1-4 concrete kid-words. Example: 'Rainbow cupcakes'."),
          }),
        )
        .min(2)
        .max(4)
        .describe("2 to 4 WILDLY different tappable answers — each should spark a different app."),
    },
    async ({ reaction, question, options }): Promise<Text> => {
      await convex.mutation(api.messages.add, {
        projectId,
        role: "avatar",
        text: `${reaction} ${question}`,
      });
      await convex.mutation(api.briefs.setQuestion, {
        briefId,
        question: { text: question, options },
      });
      state.asked = true;
      return ok(`Asked: "${question}" with ${options.length} options. Your turn is done — stop here.`);
    },
  );

  const finish_interview = tool(
    "finish_interview",
    "Wrap up the interview: tell the kid the plan and hand the spec to builder-Sparky. Usage: call once — INSTEAD of ask_question — when the kid is done, the questions run out, or the vision is crystal clear.",
    {
      recap: z
        .string()
        .describe(
          "2-3 short excited sentences telling the kid the plan you made together, weaving in their choices. Start like 'Here's our plan!'. 2nd-4th grade words.",
        ),
      buildBrief: z
        .string()
        .describe(
          "The builder's spec: ONE tight paragraph telling builder-Sparky exactly what to make, packing in EVERY choice the kid made, written like the kid asked for it. Plain words, no code.",
        ),
    },
    async ({ recap, buildBrief }): Promise<Text> => {
      await convex.mutation(api.messages.add, { projectId, role: "avatar", text: recap });
      await convex.mutation(api.briefs.finish, { briefId, recap, buildBrief });
      state.finished = true;
      return ok("Plan saved. The kid sees a Build it! button now. Your turn is done — stop here.");
    },
  );

  const server = createSdkMcpServer({
    name: "interviewer",
    version: "0.0.1",
    alwaysLoad: true,
    tools: [ask_question, finish_interview],
  });

  return { server, state };
}
