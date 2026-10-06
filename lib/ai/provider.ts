// Single source of truth for model selection + the dev↔prod provider switch.
//
// LLM_PROVIDER=api (default)  → Anthropic API key (ANTHROPIC_API_KEY), or Bedrock/Vertex.
// LLM_PROVIDER=subscription   → opt-in, for personal local experiments only: your own
//                               CLAUDE_CODE_OAUTH_TOKEN. Never for an app other people use.
//
// The Agent SDK resolves the model from a short alias on the subscription path and
// from an explicit version id on the API path — so a "role" maps to different strings.

export type Role = "fast" | "balanced" | "deep"; // Haiku / Sonnet / Opus

const SUB_ALIAS: Record<Role, string> = {
  fast: "haiku",
  balanced: "sonnet",
  deep: "opus",
};

const API_ID: Record<Role, string> = {
  fast: "claude-haiku-4-5",
  balanced: "claude-sonnet-4-6",
  deep: "claude-opus-4-8",
};

export function llmProvider(): "subscription" | "api" {
  return process.env.LLM_PROVIDER === "subscription" ? "subscription" : "api";
}

/** Model string to pass to the Agent SDK `query({ options: { model } })`. */
export function modelForRole(role: Role = "balanced"): string {
  return llmProvider() === "subscription" ? SUB_ALIAS[role] : API_ID[role];
}
