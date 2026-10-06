# ADR 0001 — v0 agent engine: Claude Agent SDK on the Max subscription  **[USER CALL]**

> Index: `docs/decisions/LOG.md` (D4). Status: **Locked (v0), proven.** Marked **[USER CALL]** —
> the owner decided this explicitly; do not silently override.
>
> **Public-copy note (2026-10-05):** this copy defaults to an Anthropic API key (`LLM_PROVIDER=api`). Entries that mention the Claude Max subscription record how the original private prototype was developed; here that path survives only as an opt-in for personal local experiments. See Anthropic's [Agent SDK docs](https://code.claude.com/docs/en/agent-sdk/overview) on authentication.

## Context

VibeKids is, underneath, *a coding agent for children*: it needs a real agent loop with **custom
tools** (write files, drive the preview, emit chips) and **streaming** (to "watch it build"). A **hard
requirement from the owner**: during local iteration, LLM calls must run on an existing **Claude Max 20x
subscription**, not a new Anthropic API bill. The engine choice is the load-bearing decision the rest of
the agent layer hangs off.

## Options considered

1. **`@anthropic-ai/claude-agent-sdk` (`query()`) on the Max subscription** via `CLAUDE_CODE_OAUTH_TOKEN`.
   Runs the agent loop in-process with custom tools (`tool()` + `createSdkMcpServer()`) and streaming.
   Authenticates with an API key, or with a personal subscription OAuth token.
2. **Vercel AI SDK + Anthropic API.** Turnkey React/streaming DX, the documented *production* path. But
   its community `claude-code` provider **can't expose our custom tools**, and it bills the API (not the
   sub) — so it can't run our generative-UI agent on the subscription.
3. **Convex Agent component.** Nicely integrated with our backend, but **API-billed** — violates the
   subscription requirement for local dev.
4. **Mastra / LangGraph (orchestration frameworks).** More machinery than a v0 needs; deferred.

## Decision

**Agent SDK on the Max subscription for v0.** `LLM_PROVIDER=subscription` is the default; the API path
(`LLM_PROVIDER=api`) is the production path, swappable via **one env flag** (`lib/ai/provider.ts`). The
dev↔prod split is real and intentional — v0 dev (subscription) vs prod (API), one flag, no app-code fork.

The Max-subscription billing model carries three hard guardrails (the old D8):

1. **`ANTHROPIC_API_KEY` must be scrubbed** in the dev shell — it *outranks* the OAuth token in the
   auth-precedence order and **silently bills the API**. `lib/ai/env-guard.ts` scrubs it on that path.
   (The private repo also had a shell hook for this; it is not part of the public copy.)
2. **Never hardcode model ids** — always route through `modelForRole()` so flipping to prod is one env var.
3. **One real call before any UI** proved the engine (in this copy: `npm run smoke-test`, which checks the
   agent loop + a custom tool with whatever credential is configured).

Two governing constraints, enshrined:

- **Metered, not unlimited.** From **June 15 2026**, subscription SDK use draws a *separate* Agent-SDK
  credit — **Max 20x ≈ $200/mo at API rates, no rollover.** Heavy Opus codegen drains it fastest (→ the
  `fast`/`balanced`/`deep` model routing, ADR-adjacent D12, exists partly to protect this budget).
- **ToS boundary = the dev↔prod line.** The subscription is for **your own local development only.**
  Anything serving end-users **must** use an API key / Bedrock / Vertex. The `LLM_PROVIDER` flag enforces
  exactly this — it is *the* mechanism that keeps us on the right side of the ToS.
- **Token TTL ≈ 1 year** (`CLAUDE_CODE_OAUTH_TOKEN`) → needs a refresh reminder before it lapses.

## Why

It is the *only* path that satisfies all three non-negotiables at once: (a) a real agent loop, (b)
**in-process custom tools** for our generative UI, and (c) **billing the subscription** (the owner's hard
requirement). The Vercel AI SDK is strictly better DX but fails (b) and (c) simultaneously, which is
disqualifying for v0. Crucially, this was **proven empirically** (2026-05-30) (see learning L1 in
`docs/decisions/LOG.md`): Agent SDK + custom tools + streaming *do* bill the sub with zero API spend. The
provider flag means choosing the subscription engine for v0 costs us *nothing* at prod time — we flip one
variable.

## Status & revisit-trigger

**Locked for v0; proven working in a real browser.** The natural successor is the **"split-loop"
production AI** (Phase 1): Vercel AI SDK foreground on the API (cheap Haiku for chat/chips) **+** an
Agent SDK heavy-build lane on API/Bedrock/Vertex. Reopen the engine question when we **serve real
end-users** (the ToS line) or if Anthropic changes how the SDK authenticates/bills. Revisit the metering
posture when **June 15 2026** bites. **Do not** reopen it for v0 to chase nicer DX — the user weighed
that trade and chose this.
