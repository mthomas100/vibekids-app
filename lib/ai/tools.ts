// Sparky's seven custom tools, written in a coding-agent house style
// (verb-first description + Usage notes + example-laden, limit-bearing .describe()s).
//
// Every tool persists to Convex (the live tree the preview renders) — no filesystem,
// no shell, no network. This IS the sandbox: the model's only action surface is these
// seven project-scoped writes (§8 kid-safety).
//
// NOTE: imports from convex/_generated resolve after the first `npx convex dev` run.

import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type Text = { content: { type: "text"; text: string }[]; isError?: boolean };
const ok = (text: string): Text => ({ content: [{ type: "text", text }] });
const err = (text: string): Text => ({ content: [{ type: "text", text }], isError: true });

const DOING = "A short, fun present-continuous phrase the KID sees while you work, e.g. 'Painting the buttons…'. They see this, not your code.";

function starterHtml(name: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${name}</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center;
      font-family: system-ui, sans-serif; background: #faf5ff; color: #312e81; }
    h1 { font-size: 2rem; }
  </style>
</head>
<body>
  <h1>${name} ✨</h1>
  <script></script>
</body>
</html>`;
}

export const SPARKY_TOOL_NAMES = [
  "mcp__sparky__create_project",
  "mcp__sparky__write_file",
  "mcp__sparky__edit_file",
  "mcp__sparky__run_preview",
  "mcp__sparky__suggest_idea",
  "mcp__sparky__start_micro_choice",
  "mcp__sparky__offer_new_app",
];

export function createSparkyToolServer(
  convex: ConvexHttpClient,
  projectId: Id<"projects">,
  // The avatar turn this build belongs to. Stamped onto every file snapshot so the
  // time machine can group a turn's writes (kid-side "go back"). See convex/files.ts.
  turnMessageId?: Id<"messages">,
) {
  const setDoing = (doing?: string) =>
    doing
      ? convex.mutation(api.buildStatus.set, { projectId, phase: doing, state: "building" })
      : Promise.resolve();

  const create_project = tool(
    "create_project",
    "Start a brand-new app from a safe starter page. Usage: call this ONCE at the very start of a new idea, BEFORE write_file. It lays down a blank index.html you then build on.",
    {
      name: z.string().describe("2-4 friendly words for the app, no special characters. Example: 'Dino Jump Game'."),
      template: z
        .enum(["blank", "game", "story", "quiz"])
        .describe("The closest starter to the kid's idea."),
      doing: z.string().optional().describe(DOING),
    },
    async ({ name, template, doing }): Promise<Text> => {
      await setDoing(doing ?? "Setting up your app…");
      await convex.mutation(api.files.write, {
        projectId,
        path: "index.html",
        content: starterHtml(name),
        contentType: "text/html",
        source: "create",
        turnMessageId,
      });
      await convex.mutation(api.projects.setEntry, { projectId, entryPath: "index.html" });
      await convex.mutation(api.projects.setName, { projectId, name }); // name the app for the shelf
      return ok(`Created ${template} starter "${name}" with index.html. Now build it up with write_file/edit_file.`);
    },
  );

  const write_file = tool(
    "write_file",
    "Create a NEW file in the kid's project. Usage: use for files that don't exist yet. To change a file that already exists, use edit_file instead.",
    {
      path: z.string().describe("Relative path, e.g. 'index.html', 'style.css', 'game.js'."),
      content: z.string().describe("The full contents of the new file."),
      doing: z.string().describe(DOING),
    },
    async ({ path, content, doing }): Promise<Text> => {
      await setDoing(doing);
      await convex.mutation(api.files.write, { projectId, path, content, source: "write", turnMessageId });
      return ok(`Wrote ${path} (${content.length} chars).`);
    },
  );

  const edit_file = tool(
    "edit_file",
    "Make a small, targeted change to ONE existing file. Usage: old_text must appear EXACTLY once in the file — include enough surrounding text to be unique. Keep edits tiny (1-3 lines). The file MUST already exist.",
    {
      path: z.string().describe("Relative path of the existing file to change."),
      old_text: z.string().describe("The exact text to replace. Must occur exactly once."),
      new_text: z.string().describe("The text to put in its place."),
      doing: z.string().describe(DOING),
    },
    async ({ path, old_text, new_text, doing }): Promise<Text> => {
      const files = await convex.query(api.files.listForProject, { projectId });
      const file = files.find((f) => f.path === path);
      if (!file) return err(`No file at ${path} yet. Use write_file to create it.`);
      const count = file.content.split(old_text).length - 1;
      if (count === 0) return err(`old_text not found in ${path}. Read the file and copy the exact text.`);
      if (count > 1) return err(`old_text appears ${count} times in ${path}. Add more surrounding text so it's unique.`);
      await setDoing(doing);
      await convex.mutation(api.files.write, {
        projectId,
        path,
        content: file.content.replace(old_text, new_text),
        source: "edit",
        turnMessageId,
      });
      return ok(`Edited ${path}.`);
    },
  );

  const run_preview = tool(
    "run_preview",
    "Show the kid their app running in the preview pane. Usage: call after you've written enough to see something. Usually the entry file is index.html.",
    {
      entryFile: z.string().describe("The file the preview should open. Usually 'index.html'."),
    },
    async ({ entryFile }): Promise<Text> => {
      await convex.mutation(api.projects.setEntry, { projectId, entryPath: entryFile });
      // Still "building": the preview is up but the turn (more edits, chips) may continue.
      // The route flips state to "done" when the whole turn ends.
      await convex.mutation(api.buildStatus.set, {
        projectId,
        phase: "Ready to play! ▶",
        state: "building",
      });
      return ok(`Preview now showing ${entryFile}.`);
    },
  );

  const suggest_idea = tool(
    "suggest_idea",
    "Offer 2-3 fun next things the kid could add. Usage: call at the END of your turn so the kid always has a tappable next step. Make ideas concrete and buildable, not vague.",
    {
      ideas: z
        .array(
          z.object({
            label: z.string().describe("2-5 words, e.g. 'Add a jumping sound'."),
            emoji: z.string().describe("One emoji that fits, e.g. '🔊'."),
            prompt: z.string().describe("What to build if the kid taps this, written as if the kid said it."),
          }),
        )
        .min(2)
        .max(3)
        .describe("2 or 3 distinct, exciting next steps."),
    },
    async ({ ideas }): Promise<Text> => {
      for (const idea of ideas) {
        await convex.mutation(api.suggestions.add, {
          projectId,
          kind: "idea",
          label: idea.label,
          emoji: idea.emoji,
          payload: { prompt: idea.prompt },
        });
      }
      return ok(`Offered ${ideas.length} ideas.`);
    },
  );

  const start_micro_choice = tool(
    "start_micro_choice",
    "Ask the kid ONE quick build choice while you work (a color, a sound, a name). Usage: use when a build will take a moment, so the wait becomes part of the fun. No 'Other' option — keep every choice tappable.",
    {
      question: z.string().describe("One short question for the kid. End with a question mark. Example: 'What color should the button be?'"),
      options: z
        .array(
          z.object({
            label: z.string().describe("1-3 words, e.g. 'Hot pink'."),
            emoji: z.string().optional().describe("Optional emoji."),
          }),
        )
        .min(2)
        .max(4)
        .describe("2 to 4 tappable choices."),
    },
    async ({ question, options }): Promise<Text> => {
      const msgId = await convex.mutation(api.messages.add, {
        projectId,
        role: "avatar",
        text: question,
      });
      for (const opt of options) {
        await convex.mutation(api.suggestions.add, {
          projectId,
          messageId: msgId,
          kind: "microchoice",
          label: opt.label,
          emoji: opt.emoji,
          payload: { question, prompt: `${question} ${opt.label}` },
        });
      }
      return ok(`Asked the kid: "${question}" with ${options.length} choices.`);
    },
  );

  const offer_new_app = tool(
    "offer_new_app",
    "Offer a one-tap button that starts the kid's idea as its own brand-new app. Usage: call this — INSTEAD of building — when the kid asks for something that's a DIFFERENT app, not a change to the current one (e.g. they're in a nail-painting app and ask for a race car game). It gives them a button to spin up a fresh app pre-loaded with their idea. Do NOT also build the different idea into the current app.",
    {
      name: z.string().describe("2-4 friendly words to name the new app, no special characters. Example: 'Race Car Painter'."),
      prompt: z.string().describe("What to build, written as if the kid said it — sent as the first message of the new app. Example: 'make a race car painting game'."),
      emoji: z.string().optional().describe("One emoji that fits the new app, e.g. '🏎️'. Defaults to 🆕."),
    },
    async ({ name, prompt, emoji }): Promise<Text> => {
      await convex.mutation(api.suggestions.add, {
        projectId,
        kind: "newapp",
        label: name,
        emoji: emoji ?? "🆕",
        payload: { name, prompt },
      });
      return ok(`Offered to start a new app "${name}" from: ${prompt}`);
    },
  );

  return createSdkMcpServer({
    name: "sparky",
    version: "0.0.1",
    // Always load all 7 tools into the prompt (no ToolSearch indirection) — with so
    // few, sharp tools the model should pick directly.
    alwaysLoad: true,
    tools: [create_project, write_file, edit_file, run_preview, suggest_idea, start_micro_choice, offer_new_app],
  });
}
