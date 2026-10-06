// Checks that the Agent SDK has the credential for the selected LLM_PROVIDER before any
// query() runs, so a misconfigured server fails fast with a clear message.
//
// - api (default): needs ANTHROPIC_API_KEY (or Bedrock/Vertex env, see the Agent SDK docs).
// - subscription (opt-in, personal local experiments only): needs CLAUDE_CODE_OAUTH_TOKEN.
//   ANTHROPIC_API_KEY outranks the OAuth token in the SDK's auth precedence, so on this path
//   a stray key is removed from the process env to keep the chosen credential in effect.
//
// Call assertLlmAuth() once at the top of any server route that runs query().

import { llmProvider } from "./provider";

const usesCloudProvider = () =>
  !!process.env.CLAUDE_CODE_USE_BEDROCK || !!process.env.CLAUDE_CODE_USE_VERTEX;

export function assertLlmAuth(): void {
  if (llmProvider() === "api") {
    if (!process.env.ANTHROPIC_API_KEY && !usesCloudProvider()) {
      throw new Error(
        "ANTHROPIC_API_KEY not set. Add it to .env.local (LLM_PROVIDER=api is the default).",
      );
    }
    return;
  }
  if (process.env.ANTHROPIC_API_KEY) {
    console.warn(
      "[vibekids] LLM_PROVIDER=subscription: ignoring ANTHROPIC_API_KEY so the OAuth token is used.",
    );
    delete process.env.ANTHROPIC_API_KEY;
  }
  if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    throw new Error(
      "LLM_PROVIDER=subscription needs CLAUDE_CODE_OAUTH_TOKEN (from `claude setup-token`). " +
        "Or use the default LLM_PROVIDER=api with an ANTHROPIC_API_KEY.",
    );
  }
}
