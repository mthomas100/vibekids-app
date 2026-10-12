# ADR 0001 — v0 agent engine: Claude Agent SDK behind a provider flag

> Status: **Locked (v0), proven.**

## Context

VibeKids is, underneath, *a coding agent for children*: it needs a real agent loop with **custom
tools** (write files, drive the preview, emit chips) and **streaming** (to "watch it build"). For local
iteration it also had to support running on a personal Claude login, not only a metered API key. The
engine choice is the load-bearing decision the rest of the agent layer hangs off.

## Options considered

1. **`@anthropic-ai/claude-agent-sdk` (`query()`).** Runs the agent loop in-process with custom tools
   (`tool()` + `createSdkMcpServer()`) and streaming. Authenticates with an API key (or Bedrock / Vertex),
   or, for personal local experiments, a personal OAuth token (`CLAUDE_CODE_OAUTH_TOKEN`).
2. **Vercel AI SDK + Anthropic API.** Turnkey React/streaming DX, but its community `claude-code`
   provider **can't expose our custom tools**, and it is API-key only.
3. **Convex Agent component.** Nicely integrated with our backend, but API-key only, so it can't serve
   the local-login path.
4. **Mastra / LangGraph (orchestration frameworks).** More machinery than a v0 needs; deferred.

## Decision

**Claude Agent SDK for v0**, with the credential path chosen by **one env flag** (`LLM_PROVIDER` in
`lib/ai/provider.ts`):

- `LLM_PROVIDER=api` (the default) → `ANTHROPIC_API_KEY`; Bedrock and Vertex work through the SDK's own
  environment variables. This is the only path for anything other people use.
- `LLM_PROVIDER=subscription` → an opt-in for personal local experiments only, using your own
  `CLAUDE_CODE_OAUTH_TOKEN`. See Anthropic's
  [Agent SDK docs](https://code.claude.com/docs/en/agent-sdk/overview) on authentication.

Three guardrails come with it:

1. **Credential precedence is checked, not assumed.** `ANTHROPIC_API_KEY` outranks the OAuth token in
   the SDK's auth order, so on the opt-in path `lib/ai/env-guard.ts` (`assertLlmAuth()`) ignores the key,
   and on either path it fails fast before any model call when the selected credential is missing.
2. **Never hardcode model ids** — always route through `modelForRole()`, so switching provider or model
   is one env var.
3. **One real call before any UI.** `npm run smoke-test` checks the agent loop plus a custom tool with
   whatever credential is configured.

Model cost is managed by role: `fast` (Haiku) for chat and chips, `balanced` (Sonnet) for codegen, and
`deep` (Opus) only for hard scaffolds, because it costs the most.

## Why

It is the *only* option that satisfies the non-negotiables at once: (a) a real agent loop with
streaming, (b) **in-process custom tools** for our generative UI, and (c) both credential paths behind
one flag.
This was **proven empirically** (2026-05-30): Agent SDK + custom tools + streaming work end to end in
the app. The provider flag keeps the credential choice out of app code: no fork between local
experiments and anything served to others.

## Status & revisit-trigger

**Locked for v0; proven working in a real browser.** The natural successor is a **"split-loop"
production AI** (Phase 1): Vercel AI SDK in the foreground on the API (cheap Haiku for chat/chips) **plus**
an Agent SDK heavy-build lane on API/Bedrock/Vertex. Reopen the engine question when the app serves
real end-users, or if Anthropic changes how the SDK authenticates or bills.
