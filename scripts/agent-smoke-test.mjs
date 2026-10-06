// VibeKids — Agent SDK smoke test.
// One tiny query() with a custom in-process tool, using whichever credential LLM_PROVIDER
// selects (see .env.example). Confirms the agent loop + custom tool-calling work before you
// boot the app. It makes one short model call (a few hundred tokens).
//
//   npm run smoke-test            # balanced role (Sonnet)
//   npm run smoke-test -- haiku   # any model alias/id the SDK accepts

import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const provider = process.env.LLM_PROVIDER === "subscription" ? "subscription" : "api";
if (provider === "api" && !process.env.ANTHROPIC_API_KEY) {
  console.error("❌ ANTHROPIC_API_KEY not set (LLM_PROVIDER=api is the default). Add it to .env.local.");
  process.exit(1);
}
if (provider === "subscription") {
  // Opt-in personal path: the API key would outrank the OAuth token, so drop it for this run.
  delete process.env.ANTHROPIC_API_KEY;
  if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    console.error("❌ LLM_PROVIDER=subscription needs CLAUDE_CODE_OAUTH_TOKEN (`claude setup-token`).");
    process.exit(1);
  }
}

const model = process.argv[2] || (provider === "api" ? "claude-sonnet-4-6" : "sonnet");
console.log(`\n🧪 VibeKids smoke test — provider: ${provider}, model: ${model}\n`);

// A custom in-process tool — the capability the whole app depends on.
const echo = tool(
  "echo",
  "Echo a kid's word back in a sparkly way",
  { word: z.string() },
  async ({ word }) => ({ content: [{ type: "text", text: `✨ ${word} ✨` }] }),
);
const testServer = createSdkMcpServer({ name: "vbk_test", version: "0.0.1", tools: [echo] });

let sawToolUse = false;
let finalText = "";
let subtype = "";

for await (const msg of query({
  prompt: "Call the echo tool with the word 'dragon'. Then say one short, cheerful sentence for a kid.",
  options: {
    model,
    tools: [], // no built-in tools, same as the app
    mcpServers: { vbk_test: testServer },
    allowedTools: ["mcp__vbk_test__echo"],
    maxTurns: 5,
  },
})) {
  if (msg.type === "assistant") {
    for (const block of msg.message?.content ?? []) {
      if (block.type === "tool_use") {
        sawToolUse = true;
        console.log(`   → tool_use: ${block.name}(${JSON.stringify(block.input)})`);
      } else if (block.type === "text") {
        finalText += block.text;
      }
    }
  } else if (msg.type === "result") {
    subtype = msg.subtype;
    if (msg.usage) console.log(`   usage: ${JSON.stringify(msg.usage)}`);
  }
}

console.log(`\n   result subtype : ${subtype}`);
console.log(`   assistant said : ${finalText.trim() || "(no text)"}`);
console.log(`   custom tool ran: ${sawToolUse ? "YES ✅" : "NO ❌"}\n`);
process.exit(sawToolUse ? 0 : 1);
